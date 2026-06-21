import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  computePurgeAfter,
  getRetentionDays,
  isDueForPurge,
} from '@/lib/dedupe-audit/constants';
import { runMigrations, setDbPathForTests, splitSchemaStatements } from '@/lib/dedupe-audit/db';
import { ServerAuditWriter } from '@/lib/dedupe-audit/writer';
import Database from 'better-sqlite3';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const SCHEMA_SQL = readFileSync(
  join(process.cwd(), 'lib/dedupe-audit/schema.sql'),
  'utf8',
);

function openMemoryDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  runMigrations(db, SCHEMA_SQL);
  return db;
}

describe('dedupe audit retention helpers', () => {
  it('defaults retention to 90 days', () => {
    expect(getRetentionDays()).toBe(90);
  });

  it('computes purge_after as changed_at plus retention days', () => {
    const changedAt = Date.UTC(2026, 0, 1);
    expect(computePurgeAfter(changedAt, 90)).toBe(changedAt + 90 * MS_PER_DAY);
  });

  it('treats invalid retention env as 90 days via getRetentionDays override', () => {
    const changedAt = 1_700_000_000_000;
    expect(computePurgeAfter(changedAt, 30)).toBe(changedAt + 30 * MS_PER_DAY);
  });

  it('detects due purge timestamps inclusively', () => {
    const purgeAfter = 1_700_000_000_000;
    expect(isDueForPurge(purgeAfter, purgeAfter)).toBe(true);
    expect(isDueForPurge(purgeAfter, purgeAfter - 1)).toBe(false);
    expect(isDueForPurge(null, purgeAfter)).toBe(false);
  });
});

describe('dedupe audit schema helpers', () => {
  it('splits schema.sql into executable statements', () => {
    const statements = splitSchemaStatements(SCHEMA_SQL);
    expect(statements.length).toBeGreaterThanOrEqual(3);
    expect(statements.some((statement) => statement.includes('CREATE TABLE dedupe_runs'))).toBe(true);
    expect(statements.some((statement) => statement.includes('CREATE INDEX idx_changes_purge'))).toBe(
      true,
    );
  });

  it('applies schema migrations idempotently', () => {
    const db = openMemoryDb();
    runMigrations(db, SCHEMA_SQL);

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all() as Array<{ name: string }>;

    expect(tables.map((row) => row.name)).toEqual(
      expect.arrayContaining(['dedupe_runs', 'dedupe_progress', 'dedupe_message_changes']),
    );

    runMigrations(db, SCHEMA_SQL);
    const version = db.prepare('SELECT version FROM dedupe_schema_meta LIMIT 1').get() as {
      version: number;
    };
    expect(version.version).toBe(1);
    db.close();
  });
});

describe('ServerAuditWriter', () => {
  afterEach(() => {
    setDbPathForTests(null);
  });

  it('records runs, progress, changes, and due purge rows', () => {
    const db = openMemoryDb();
    const writer = new ServerAuditWriter(db);
    const changedAt = Date.UTC(2025, 5, 1);
    const purgeAfter = computePurgeAfter(changedAt, 90);

    const run = writer.createRun({
      accountId: 'user@example.com',
      type: 'apply',
      scope: 'folder',
      mailboxId: 'mbox-inbox',
      actionId: 'delete_with_retention',
    });

    writer.appendProgress(run.id, 'user@example.com', {
      folder: 'Inbox',
      position: 10,
      total: 100,
      message: 'Scanning batch',
    });

    writer.recordChanges(run.id, 'user@example.com', [
      {
        emailId: 'email-1',
        fromMailboxId: 'mbox-inbox',
        toMailboxId: 'mbox-deleted',
        actionId: 'delete_with_retention',
        changedAt,
        purgeAfter,
      },
    ]);

    const detail = writer.getRun(run.id, 'user@example.com');
    expect(detail?.progress).toHaveLength(1);
    expect(detail?.changes).toHaveLength(1);
    expect(detail?.changes[0]?.purgeAfter).toBe(purgeAfter);

    const due = writer.listDueForPurge('user@example.com', purgeAfter);
    expect(due).toHaveLength(1);
    expect(due[0]?.emailId).toBe('email-1');

    const marked = writer.markChangesPurged([due[0]!.changeId], 'user@example.com');
    expect(marked).toBe(1);
    expect(writer.listDueForPurge('user@example.com', purgeAfter)).toHaveLength(0);

    db.close();
  });
});