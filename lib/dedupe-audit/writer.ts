import type Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { getDb } from './db';

export type DedupeRunType = 'scan' | 'apply' | 'purge';
export type DedupeRunStatus = 'running' | 'paused' | 'complete' | 'error' | 'cancelled';
export type DedupeRunScope = 'folder' | 'account';

export interface CreateRunInput {
  accountId: string;
  type: DedupeRunType;
  scope: DedupeRunScope;
  mailboxId?: string | null;
  actionId?: string | null;
  stats?: Record<string, unknown>;
}

export interface ProgressInput {
  folder?: string | null;
  position?: number | null;
  total?: number | null;
  message?: string | null;
  ts?: number;
}

export interface MessageChangeInput {
  emailId: string;
  groupKey?: string | null;
  fromMailboxId: string;
  toMailboxId?: string | null;
  actionId: string;
  keeper?: boolean;
  changedAt?: number;
  purgeAfter?: number | null;
}

export interface DedupeRunRecord {
  id: string;
  accountId: string;
  type: DedupeRunType;
  status: DedupeRunStatus;
  scope: DedupeRunScope;
  mailboxId: string | null;
  actionId: string | null;
  startedAt: number;
  completedAt: number | null;
  stats: Record<string, unknown> | null;
}

export interface DedupeProgressRecord {
  id: number;
  runId: string;
  ts: number;
  folder: string | null;
  position: number | null;
  total: number | null;
  message: string | null;
}

export interface DedupeMessageChangeRecord {
  id: number;
  runId: string;
  emailId: string;
  groupKey: string | null;
  fromMailboxId: string;
  toMailboxId: string | null;
  actionId: string;
  keeper: boolean;
  changedAt: number;
  purgeAfter: number | null;
}

export interface DedupeRunDetail extends DedupeRunRecord {
  progress: DedupeProgressRecord[];
  changes: DedupeMessageChangeRecord[];
}

export interface DuePurgeMessage {
  changeId: number;
  runId: string;
  emailId: string;
  fromMailboxId: string;
  toMailboxId: string;
  actionId: string;
  changedAt: number;
  purgeAfter: number;
}

export interface DedupeAuditWriter {
  createRun(input: CreateRunInput): DedupeRunRecord;
  updateRunStatus(
    runId: string,
    accountId: string,
    status: DedupeRunStatus,
    options?: { completedAt?: number; stats?: Record<string, unknown> },
  ): DedupeRunRecord | null;
  appendProgress(runId: string, accountId: string, progress: ProgressInput): DedupeProgressRecord | null;
  recordChanges(runId: string, accountId: string, changes: MessageChangeInput[]): number;
  getRun(runId: string, accountId: string): DedupeRunDetail | null;
  listRuns(accountId: string, limit?: number): DedupeRunRecord[];
  listDueForPurge(accountId: string, nowMs?: number): DuePurgeMessage[];
  markChangesPurged(changeIds: number[], accountId: string): number;
}

function parseStatsJson(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function rowToRun(row: {
  id: string;
  account_id: string;
  type: string;
  status: string;
  scope: string;
  mailbox_id: string | null;
  action_id: string | null;
  started_at: number;
  completed_at: number | null;
  stats_json: string | null;
}): DedupeRunRecord {
  return {
    id: row.id,
    accountId: row.account_id,
    type: row.type as DedupeRunType,
    status: row.status as DedupeRunStatus,
    scope: row.scope as DedupeRunScope,
    mailboxId: row.mailbox_id,
    actionId: row.action_id,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    stats: parseStatsJson(row.stats_json),
  };
}

function assertRunOwned(db: Database.Database, runId: string, accountId: string): boolean {
  const row = db
    .prepare('SELECT id FROM dedupe_runs WHERE id = ? AND account_id = ?')
    .get(runId, accountId) as { id: string } | undefined;
  return !!row;
}

export class ServerAuditWriter implements DedupeAuditWriter {
  constructor(private readonly db: Database.Database = getDb()) {}

  createRun(input: CreateRunInput): DedupeRunRecord {
    const id = randomUUID();
    const startedAt = Date.now();
    const statsJson = input.stats ? JSON.stringify(input.stats) : null;

    this.db
      .prepare(
        `INSERT INTO dedupe_runs (
          id, account_id, type, status, scope, mailbox_id, action_id, started_at, completed_at, stats_json
        ) VALUES (?, ?, ?, 'running', ?, ?, ?, ?, NULL, ?)`,
      )
      .run(
        id,
        input.accountId,
        input.type,
        input.scope,
        input.mailboxId ?? null,
        input.actionId ?? null,
        startedAt,
        statsJson,
      );

    return {
      id,
      accountId: input.accountId,
      type: input.type,
      status: 'running',
      scope: input.scope,
      mailboxId: input.mailboxId ?? null,
      actionId: input.actionId ?? null,
      startedAt,
      completedAt: null,
      stats: input.stats ?? null,
    };
  }

  updateRunStatus(
    runId: string,
    accountId: string,
    status: DedupeRunStatus,
    options?: { completedAt?: number; stats?: Record<string, unknown> },
  ): DedupeRunRecord | null {
    if (!assertRunOwned(this.db, runId, accountId)) return null;

    const completedAt =
      options?.completedAt ??
      (status === 'complete' || status === 'error' || status === 'cancelled' ? Date.now() : null);
    const statsJson = options?.stats ? JSON.stringify(options.stats) : null;

    if (statsJson !== null) {
      this.db
        .prepare(
          'UPDATE dedupe_runs SET status = ?, completed_at = COALESCE(?, completed_at), stats_json = ? WHERE id = ?',
        )
        .run(status, completedAt, statsJson, runId);
    } else {
      this.db
        .prepare('UPDATE dedupe_runs SET status = ?, completed_at = COALESCE(?, completed_at) WHERE id = ?')
        .run(status, completedAt, runId);
    }

    return this.getRunSummary(runId, accountId);
  }

  appendProgress(
    runId: string,
    accountId: string,
    progress: ProgressInput,
  ): DedupeProgressRecord | null {
    if (!assertRunOwned(this.db, runId, accountId)) return null;

    const ts = progress.ts ?? Date.now();
    const result = this.db
      .prepare(
        `INSERT INTO dedupe_progress (run_id, ts, folder, position, total, message)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        runId,
        ts,
        progress.folder ?? null,
        progress.position ?? null,
        progress.total ?? null,
        progress.message ?? null,
      );

    return {
      id: Number(result.lastInsertRowid),
      runId,
      ts,
      folder: progress.folder ?? null,
      position: progress.position ?? null,
      total: progress.total ?? null,
      message: progress.message ?? null,
    };
  }

  recordChanges(runId: string, accountId: string, changes: MessageChangeInput[]): number {
    if (changes.length === 0) return 0;
    if (!assertRunOwned(this.db, runId, accountId)) return 0;

    const insert = this.db.prepare(
      `INSERT INTO dedupe_message_changes (
        run_id, email_id, group_key, from_mailbox_id, to_mailbox_id,
        action_id, keeper, changed_at, purge_after
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    const insertMany = this.db.transaction((rows: MessageChangeInput[]) => {
      let count = 0;
      for (const change of rows) {
        insert.run(
          runId,
          change.emailId,
          change.groupKey ?? null,
          change.fromMailboxId,
          change.toMailboxId ?? null,
          change.actionId,
          change.keeper ? 1 : 0,
          change.changedAt ?? Date.now(),
          change.purgeAfter ?? null,
        );
        count += 1;
      }
      return count;
    });

    return insertMany(changes);
  }

  getRun(runId: string, accountId: string): DedupeRunDetail | null {
    const summary = this.getRunSummary(runId, accountId);
    if (!summary) return null;

    const progressRows = this.db
      .prepare(
        `SELECT id, run_id, ts, folder, position, total, message
         FROM dedupe_progress WHERE run_id = ? ORDER BY id ASC`,
      )
      .all(runId) as Array<{
      id: number;
      run_id: string;
      ts: number;
      folder: string | null;
      position: number | null;
      total: number | null;
      message: string | null;
    }>;

    const changeRows = this.db
      .prepare(
        `SELECT id, run_id, email_id, group_key, from_mailbox_id, to_mailbox_id,
                action_id, keeper, changed_at, purge_after
         FROM dedupe_message_changes WHERE run_id = ? ORDER BY id ASC`,
      )
      .all(runId) as Array<{
      id: number;
      run_id: string;
      email_id: string;
      group_key: string | null;
      from_mailbox_id: string;
      to_mailbox_id: string | null;
      action_id: string;
      keeper: number;
      changed_at: number;
      purge_after: number | null;
    }>;

    return {
      ...summary,
      progress: progressRows.map((row) => ({
        id: row.id,
        runId: row.run_id,
        ts: row.ts,
        folder: row.folder,
        position: row.position,
        total: row.total,
        message: row.message,
      })),
      changes: changeRows.map((row) => ({
        id: row.id,
        runId: row.run_id,
        emailId: row.email_id,
        groupKey: row.group_key,
        fromMailboxId: row.from_mailbox_id,
        toMailboxId: row.to_mailbox_id,
        actionId: row.action_id,
        keeper: row.keeper === 1,
        changedAt: row.changed_at,
        purgeAfter: row.purge_after,
      })),
    };
  }

  listRuns(accountId: string, limit = 50): DedupeRunRecord[] {
    const rows = this.db
      .prepare(
        `SELECT id, account_id, type, status, scope, mailbox_id, action_id,
                started_at, completed_at, stats_json
         FROM dedupe_runs
         WHERE account_id = ?
         ORDER BY started_at DESC
         LIMIT ?`,
      )
      .all(accountId, limit) as Array<Parameters<typeof rowToRun>[0]>;

    return rows.map(rowToRun);
  }

  listDueForPurge(accountId: string, nowMs = Date.now()): DuePurgeMessage[] {
    const rows = this.db
      .prepare(
        `SELECT c.id AS change_id, c.run_id, c.email_id, c.from_mailbox_id, c.to_mailbox_id,
                c.action_id, c.changed_at, c.purge_after
         FROM dedupe_message_changes c
         INNER JOIN dedupe_runs r ON r.id = c.run_id
         WHERE r.account_id = ?
           AND c.purge_after IS NOT NULL
           AND c.purge_after <= ?
           AND c.to_mailbox_id IS NOT NULL
         ORDER BY c.purge_after ASC`,
      )
      .all(accountId, nowMs) as Array<{
      change_id: number;
      run_id: string;
      email_id: string;
      from_mailbox_id: string;
      to_mailbox_id: string;
      action_id: string;
      changed_at: number;
      purge_after: number;
    }>;

    return rows.map((row) => ({
      changeId: row.change_id,
      runId: row.run_id,
      emailId: row.email_id,
      fromMailboxId: row.from_mailbox_id,
      toMailboxId: row.to_mailbox_id,
      actionId: row.action_id,
      changedAt: row.changed_at,
      purgeAfter: row.purge_after,
    }));
  }

  markChangesPurged(changeIds: number[], accountId: string): number {
    if (changeIds.length === 0) return 0;

    const update = this.db.prepare(
      `UPDATE dedupe_message_changes
       SET to_mailbox_id = NULL
       WHERE id = ?
         AND run_id IN (SELECT id FROM dedupe_runs WHERE account_id = ?)`,
    );

    const markMany = this.db.transaction((ids: number[]) => {
      let count = 0;
      for (const id of ids) {
        const result = update.run(id, accountId);
        count += result.changes;
      }
      return count;
    });

    return markMany(changeIds);
  }

  private getRunSummary(runId: string, accountId: string): DedupeRunRecord | null {
    const row = this.db
      .prepare(
        `SELECT id, account_id, type, status, scope, mailbox_id, action_id,
                started_at, completed_at, stats_json
         FROM dedupe_runs WHERE id = ? AND account_id = ?`,
      )
      .get(runId, accountId) as Parameters<typeof rowToRun>[0] | undefined;

    return row ? rowToRun(row) : null;
  }
}

let defaultWriter: ServerAuditWriter | null = null;

export function getAuditWriter(): DedupeAuditWriter {
  if (!defaultWriter) {
    defaultWriter = new ServerAuditWriter();
  }
  return defaultWriter;
}