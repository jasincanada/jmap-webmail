import {
  buildDedupeKey,
  DEFAULT_DEDUPE_MATCH_CONFIG,
  DedupeScanError,
  deriveDedupeLimits,
  hasEnabledCriteria,
  validateDedupeScan,
  type DedupeBrowserLimits,
  type DedupeMatchConfig,
} from '@/lib/dedupe-config';
import type {
  DedupeActionId,
  DedupeApplyOptions,
  DedupeApplyResult,
  DedupeAuditWriter,
  DedupeKeeperPolicy,
} from '@/lib/dedupe-actions/types';
import type { JMAPClient } from '@/lib/jmap/client';
import type { Email, Mailbox } from '@/lib/jmap/types';

// JMAP dedupe client — TypeScript shares logic with the webmail UI and talks to
// Stalwart over HTTP/JSON. Server language (Rust) does not dictate client choice;
// see dedupe/dedupe.py for the same rationale on the CLI tool.

export const DUPES_FOLDER = 'dupes';
export const DELETED_FOLDER = 'deleted';
export const DEDUPE_DELETED_RETENTION_DAYS = 90;
const SKIP_ROLES = new Set(['trash', 'junk']);
const SCAN_CONCURRENCY = 3;

/** JMAP Email/get batch size — follows the connected server's `maxObjectsInGet`. */
export function getDedupeBatchSize(client: JMAPClient): number {
  return client.getMaxObjectsInGet();
}

export function getDedupeLimits(client: JMAPClient): DedupeBrowserLimits {
  return deriveDedupeLimits(getDedupeBatchSize(client));
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function computeDeletedRetentionPurgeAfter(fromMs: number = Date.now()): number {
  return fromMs + DEDUPE_DELETED_RETENTION_DAYS * MS_PER_DAY;
}

export class DedupeAbortedError extends Error {
  constructor() {
    super('Operation cancelled');
    this.name = 'DedupeAbortedError';
  }
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DedupeAbortedError();
  }
}

export interface DedupeMove {
  emailId: string;
  subject: string;
  fromMailboxId: string;
  fromMailboxName: string;
  key: string;
}

export interface DedupeScanResult {
  scanned: number;
  duplicateCount: number;
  moves: DedupeMove[];
  folderResults: FolderDedupeScanResult[];
}

export interface DedupeRunResult extends DedupeScanResult {
  moved: number;
}

export interface DedupeGroup {
  key: string;
  keeperId: string;
  emailIds: string[];
  duplicateIds: string[];
}

export interface FolderDedupeScanResult {
  mailboxId: string;
  mailboxName: string;
  scanned: number;
  duplicateCount: number;
  groups: DedupeGroup[];
  moves: DedupeMove[];
  createdDupesFolder?: boolean;
}

interface MailboxJmapRef {
  storeId: string;
  jmapId: string;
  accountId?: string;
}

interface ManagedMailboxRef {
  storeId: string;
  jmapId: string;
  created: boolean;
}

export interface BatchApplyDuplicateMovesParams {
  client: JMAPClient;
  moves: DedupeMove[];
  mailboxes: Mailbox[];
  resolveDestination: (
    move: DedupeMove,
    mailboxes: Mailbox[],
  ) => Promise<{ storeId: string; jmapId: string; accountId?: string }>;
  actionId: DedupeActionId;
  audit: DedupeAuditWriter;
  onProgress?: (message: string) => void;
  signal?: AbortSignal;
  purgeAfter?: number;
}

function isDupesMailbox(mailbox: Mailbox): boolean {
  return mailbox.name === DUPES_FOLDER;
}

export async function getAccountScanMaxFolderCount(
  client: JMAPClient,
  mailboxes: Mailbox[],
  signal?: AbortSignal,
): Promise<number> {
  let max = 0;
  for (const mailbox of mailboxes) {
    throwIfAborted(signal);
    if (!canDedupeMailbox(mailbox)) continue;
    const jmapId = mailbox.originalId || mailbox.id;
    const accountId = mailbox.isShared ? mailbox.accountId : undefined;
    const total = await client.countMailboxEmails(jmapId, accountId, signal);
    max = Math.max(max, total);
  }
  return max;
}

export function canDedupeMailbox(mailbox: Mailbox): boolean {
  if (isDupesMailbox(mailbox)) return false;
  if (mailbox.role && SKIP_ROLES.has(mailbox.role)) return false;
  if (mailbox.isShared || mailbox.id.startsWith('shared-')) return false;

  const rights = mailbox.myRights;
  if (rights) {
    if (!rights.mayReadItems || !rights.mayRemoveItems || !rights.mayCreateChild) {
      return false;
    }
  }

  return true;
}

function resolveMailboxJmapRef(
  mailboxId: string,
  mailboxes: Mailbox[],
): MailboxJmapRef | null {
  const mailbox = mailboxes.find((mb) => mb.id === mailboxId);
  if (!mailbox) return null;
  return {
    storeId: mailbox.id,
    jmapId: mailbox.originalId || mailbox.id,
    accountId: mailbox.isShared ? mailbox.accountId : undefined,
  };
}

function jmapMailboxIdToStoreId(jmapId: string, parentMailbox: Mailbox): string {
  if (parentMailbox.isShared && parentMailbox.accountId) {
    return `${parentMailbox.accountId}:${jmapId}`;
  }
  return jmapId;
}

export function buildDupesByParentMap(mailboxes: Mailbox[]): Map<string, string> {
  const dupesByParent = new Map<string, string>();
  for (const mailbox of mailboxes) {
    if (mailbox.name === DUPES_FOLDER && mailbox.parentId) {
      dupesByParent.set(mailbox.parentId, mailbox.id);
    }
  }
  return dupesByParent;
}

export function buildDeletedByParentMap(mailboxes: Mailbox[]): Map<string, string> {
  const deletedByParent = new Map<string, string>();
  for (const mailbox of mailboxes) {
    if (mailbox.name === DELETED_FOLDER && mailbox.parentId) {
      deletedByParent.set(mailbox.parentId, mailbox.id);
    }
  }
  return deletedByParent;
}

function slimEmailForDedupe(email: Email): Email {
  return {
    id: email.id,
    mailboxIds: email.mailboxIds,
    keywords: email.keywords ?? {},
    receivedAt: email.receivedAt,
    subject: email.subject,
    messageId: email.messageId,
    from: email.from,
    to: email.to,
    sentAt: email.sentAt,
    size: email.size,
    hasAttachment: email.hasAttachment,
    preview: email.preview,
    threadId: email.threadId,
  };
}

function mergeDuplicateGroups(
  groups: Map<string, Email[]>,
  emails: Email[],
  jmapMailboxId: string,
  config: DedupeMatchConfig,
): void {
  for (const email of emails) {
    if (!email.mailboxIds?.[jmapMailboxId]) continue;
    const key = buildDedupeKey(email, config);
    if (!key) continue;
    const bucket = groups.get(key) ?? [];
    bucket.push(slimEmailForDedupe(email));
    groups.set(key, bucket);
  }
}

function groupsToScanResult(
  mailbox: Mailbox,
  mailboxName: string,
  groups: Map<string, Email[]>,
  scanned: number,
): FolderDedupeScanResult {
  const dedupeGroups: DedupeGroup[] = [];
  const moves: DedupeMove[] = [];

  for (const [key, refs] of groups) {
    if (refs.length < 2) continue;
    refs.sort((a, b) => {
      const byDate = (a.receivedAt ?? '').localeCompare(b.receivedAt ?? '');
      return byDate !== 0 ? byDate : a.id.localeCompare(b.id);
    });
    const keeper = refs[0];
    const duplicateIds = refs.slice(1).map((email) => email.id);

    dedupeGroups.push({
      key,
      keeperId: keeper.id,
      emailIds: refs.map((email) => email.id),
      duplicateIds,
    });

    for (const duplicate of refs.slice(1)) {
      moves.push({
        emailId: duplicate.id,
        subject: duplicate.subject ?? '(no subject)',
        fromMailboxId: mailbox.id,
        fromMailboxName: mailboxName,
        key,
      });
    }
  }

  return {
    mailboxId: mailbox.id,
    mailboxName,
    scanned,
    duplicateCount: moves.length,
    groups: dedupeGroups,
    moves,
  };
}

export async function ensureDupesMailbox(
  client: JMAPClient,
  parentMailbox: Mailbox,
  dupesByParent: Map<string, string>,
  mailboxes?: Mailbox[],
): Promise<ManagedMailboxRef> {
  const parentStoreId = parentMailbox.id;
  const cachedStoreId = dupesByParent.get(parentStoreId);
  if (cachedStoreId) {
    const cachedMailbox = (mailboxes ?? []).find((mb) => mb.id === cachedStoreId);
    return {
      storeId: cachedStoreId,
      jmapId: cachedMailbox?.originalId || cachedStoreId,
      created: false,
    };
  }

  const list = mailboxes ?? await client.getAllMailboxes();
  const existing = list.find(
    (mailbox) => mailbox.name === DUPES_FOLDER && mailbox.parentId === parentStoreId,
  );
  if (existing) {
    dupesByParent.set(parentStoreId, existing.id);
    return {
      storeId: existing.id,
      jmapId: existing.originalId || existing.id,
      created: false,
    };
  }

  const parentJmapId = parentMailbox.originalId || parentMailbox.id;
  const accountId = parentMailbox.isShared ? parentMailbox.accountId : undefined;

  try {
    const createdJmapId = await client.createMailbox(DUPES_FOLDER, parentJmapId, accountId);
    const dupesStoreId = jmapMailboxIdToStoreId(createdJmapId, parentMailbox);
    dupesByParent.set(parentStoreId, dupesStoreId);
    return {
      storeId: dupesStoreId,
      jmapId: createdJmapId,
      created: true,
    };
  } catch (error) {
    const refreshed = await client.getAllMailboxes();
    const concurrent = refreshed.find(
      (mailbox) => mailbox.name === DUPES_FOLDER && mailbox.parentId === parentStoreId,
    );
    if (concurrent) {
      dupesByParent.set(parentStoreId, concurrent.id);
      return {
        storeId: concurrent.id,
        jmapId: concurrent.originalId || concurrent.id,
        created: false,
      };
    }
    throw error;
  }
}

export async function ensureDeletedMailbox(
  client: JMAPClient,
  parentMailbox: Mailbox,
  deletedByParent: Map<string, string>,
  mailboxes?: Mailbox[],
): Promise<ManagedMailboxRef> {
  const parentStoreId = parentMailbox.id;
  const cachedStoreId = deletedByParent.get(parentStoreId);
  if (cachedStoreId) {
    const cachedMailbox = (mailboxes ?? []).find((mb) => mb.id === cachedStoreId);
    return {
      storeId: cachedStoreId,
      jmapId: cachedMailbox?.originalId || cachedStoreId,
      created: false,
    };
  }

  const list = mailboxes ?? await client.getAllMailboxes();
  const existing = list.find(
    (mailbox) => mailbox.name === DELETED_FOLDER && mailbox.parentId === parentStoreId,
  );
  if (existing) {
    deletedByParent.set(parentStoreId, existing.id);
    return {
      storeId: existing.id,
      jmapId: existing.originalId || existing.id,
      created: false,
    };
  }

  const parentJmapId = parentMailbox.originalId || parentMailbox.id;
  const accountId = parentMailbox.isShared ? parentMailbox.accountId : undefined;

  try {
    const createdJmapId = await client.createMailbox(DELETED_FOLDER, parentJmapId, accountId);
    const deletedStoreId = jmapMailboxIdToStoreId(createdJmapId, parentMailbox);
    deletedByParent.set(parentStoreId, deletedStoreId);
    return {
      storeId: deletedStoreId,
      jmapId: createdJmapId,
      created: true,
    };
  } catch (error) {
    const refreshed = await client.getAllMailboxes();
    const concurrent = refreshed.find(
      (mailbox) => mailbox.name === DELETED_FOLDER && mailbox.parentId === parentStoreId,
    );
    if (concurrent) {
      deletedByParent.set(parentStoreId, concurrent.id);
      return {
        storeId: concurrent.id,
        jmapId: concurrent.originalId || concurrent.id,
        created: false,
      };
    }
    throw error;
  }
}

export async function batchApplyDuplicateMoves(
  params: BatchApplyDuplicateMovesParams,
): Promise<number> {
  const {
    client,
    moves,
    mailboxes,
    resolveDestination,
    actionId,
    audit,
    onProgress,
    signal,
    purgeAfter,
  } = params;

  if (moves.length === 0) {
    return 0;
  }

  const destinationByMove = new Map<string, { storeId: string; jmapId: string; accountId?: string }>();
  for (const move of moves) {
    if (!destinationByMove.has(move.emailId)) {
      destinationByMove.set(move.emailId, await resolveDestination(move, mailboxes));
    }
  }

  const pending = new Map<string, {
    fromMailboxRef: MailboxJmapRef;
    destinationJmapId: string;
    destinationStoreId: string;
    emailIds: string[];
    movesByEmailId: Map<string, DedupeMove>;
  }>();

  for (const move of moves) {
    const destination = destinationByMove.get(move.emailId);
    if (!destination) {
      throw new Error(`Failed to resolve destination for email ${move.emailId}`);
    }

    const fromMailboxRef = resolveMailboxJmapRef(move.fromMailboxId, mailboxes);
    if (!fromMailboxRef) {
      throw new Error(`Failed to resolve mailbox ${move.fromMailboxId} for move`);
    }

    const bucketKey = `${move.fromMailboxId}:${destination.storeId}`;
    const bucket = pending.get(bucketKey) ?? {
      fromMailboxRef,
      destinationJmapId: destination.jmapId,
      destinationStoreId: destination.storeId,
      emailIds: [],
      movesByEmailId: new Map<string, DedupeMove>(),
    };
    bucket.emailIds.push(move.emailId);
    bucket.movesByEmailId.set(move.emailId, move);
    pending.set(bucketKey, bucket);
  }

  const batchSize = getDedupeBatchSize(client);
  let moved = 0;
  for (const bucket of pending.values()) {
    for (let offset = 0; offset < bucket.emailIds.length; offset += batchSize) {
      throwIfAborted(signal);
      const chunk = bucket.emailIds.slice(offset, offset + batchSize);
      onProgress?.(`Moving ${chunk.length} duplicate(s)`);
      await client.moveEmailsBetweenMailboxes(
        chunk,
        bucket.fromMailboxRef.jmapId,
        bucket.destinationJmapId,
        bucket.fromMailboxRef.accountId,
        signal,
      );

      for (const emailId of chunk) {
        const move = bucket.movesByEmailId.get(emailId);
        if (!move) continue;
        audit.recordChange({
          emailId,
          groupKey: move.key,
          fromMailboxId: move.fromMailboxId,
          toMailboxId: bucket.destinationStoreId,
          actionId,
          keeper: false,
          purgeAfter,
        });
      }

      moved += chunk.length;
    }
  }

  return moved;
}

const noopAuditWriter: DedupeAuditWriter = {
  recordChange: () => {},
};

/** Rebuild moves/groups when user picks newest keeper (scan always ranks oldest first). */
export function rebuildScanWithKeeperPolicy(
  scan: DedupeScanResult,
  policy: DedupeKeeperPolicy = 'oldest',
): DedupeScanResult {
  if (policy === 'oldest') {
    return scan;
  }

  const folderResults = scan.folderResults.map((folder) => {
    const groups: DedupeGroup[] = [];
    const moves: DedupeMove[] = [];

    for (const group of folder.groups) {
      if (group.emailIds.length < 2) continue;
      const keeperId = group.emailIds[group.emailIds.length - 1];
      const duplicateIds = group.emailIds.filter((id) => id !== keeperId);

      groups.push({
        key: group.key,
        keeperId,
        emailIds: group.emailIds,
        duplicateIds,
      });

      for (const emailId of duplicateIds) {
        const priorMove = folder.moves.find((move) => move.emailId === emailId);
        moves.push({
          emailId,
          subject: priorMove?.subject ?? '(no subject)',
          fromMailboxId: folder.mailboxId,
          fromMailboxName: folder.mailboxName,
          key: group.key,
        });
      }
    }

    return {
      ...folder,
      groups,
      moves,
      duplicateCount: moves.length,
    };
  });

  const moves = folderResults.flatMap((folder) => folder.moves);

  return {
    scanned: scan.scanned,
    duplicateCount: moves.length,
    moves,
    folderResults,
  };
}

export async function applyDuplicateAction(
  client: JMAPClient,
  scan: DedupeScanResult,
  actionId: DedupeActionId,
  opts: DedupeApplyOptions = {},
  signal?: AbortSignal,
  auditWriter: DedupeAuditWriter = noopAuditWriter,
): Promise<DedupeApplyResult> {
  const { getExecutor } = await import('@/lib/dedupe-actions/registry');
  const executor = getExecutor(actionId);
  if (!executor) {
    throw new Error(`Unknown dedupe action: ${actionId}`);
  }

  const effectiveScan = rebuildScanWithKeeperPolicy(scan, opts.keeperPolicy);

  if (opts.dryRun) {
    const preview = executor.preview(effectiveScan, opts);
    return {
      actionId: preview.actionId,
      affectedCount: preview.affectedCount,
      duplicateCount: preview.duplicateCount,
      moved: 0,
      dryRun: true,
    };
  }

  return executor.execute(client, effectiveScan, opts, signal, auditWriter);
}

export async function scanFolderDuplicates(
  client: JMAPClient,
  mailboxId: string,
  config: DedupeMatchConfig = DEFAULT_DEDUPE_MATCH_CONFIG,
  mailboxesCache?: Mailbox[],
  onProgress?: (message: string) => void,
  prepareDupesFolder = false,
  signal?: AbortSignal,
): Promise<FolderDedupeScanResult> {
  if (!hasEnabledCriteria(config)) {
    return {
      mailboxId,
      mailboxName: '',
      scanned: 0,
      duplicateCount: 0,
      groups: [],
      moves: [],
    };
  }

  const mailboxes = mailboxesCache ?? await client.getAllMailboxes();
  const byId = new Map(mailboxes.map((mailbox) => [mailbox.id, mailbox]));
  const mailbox = byId.get(mailboxId);
  if (!mailbox || !canDedupeMailbox(mailbox)) {
    return {
      mailboxId,
      mailboxName: mailbox ? mailboxDisplayName(mailbox, byId) : '',
      scanned: 0,
      duplicateCount: 0,
      groups: [],
      moves: [],
    };
  }

  const mailboxRef = resolveMailboxJmapRef(mailboxId, mailboxes);
  if (!mailboxRef) {
    return {
      mailboxId,
      mailboxName: mailboxDisplayName(mailbox, byId),
      scanned: 0,
      duplicateCount: 0,
      groups: [],
      moves: [],
    };
  }

  const displayName = mailboxDisplayName(mailbox, byId);
  onProgress?.(`Querying messages in ${displayName}…`);

  const total = await client.countMailboxEmails(mailboxRef.jmapId, mailboxRef.accountId, signal);
  if (total === 0) {
    return {
      mailboxId,
      mailboxName: displayName,
      scanned: 0,
      duplicateCount: 0,
      groups: [],
      moves: [],
    };
  }

  const batchSize = getDedupeBatchSize(client);
  const limits = getDedupeLimits(client);
  validateDedupeScan(total, config, limits);

  const groups = new Map<string, Email[]>();
  let position = 0;

  while (position < total) {
    throwIfAborted(signal);

    const page = await client.queryMailboxEmailIdsPage(
      mailboxRef.jmapId,
      position,
      batchSize,
      mailboxRef.accountId,
      signal,
    );
    if (page.ids.length === 0) {
      if (position < total) {
        throw new DedupeScanError({
          code: 'scan_interrupted',
          limits,
          message:
            `Scan interrupted: no messages returned at position ${position.toLocaleString()} of ${total.toLocaleString()}.`,
        });
      }
      break;
    }

    onProgress?.(
      `Analyzing ${Math.min(position + page.ids.length, total).toLocaleString()} / ${total.toLocaleString()} in ${displayName}…`,
    );

    const emails = await client.getEmailsForDedupe(page.ids, config, mailboxRef.accountId, signal);
    mergeDuplicateGroups(groups, emails, mailboxRef.jmapId, config);
    position += page.ids.length;
  }

  const scanResult = groupsToScanResult(
    mailbox,
    displayName,
    groups,
    position,
  );

  if (prepareDupesFolder && scanResult.duplicateCount > 0) {
    const dupesByParent = buildDupesByParentMap(mailboxes);
    onProgress?.(`Preparing ${displayName}/${DUPES_FOLDER}`);
    const dupes = await ensureDupesMailbox(client, mailbox, dupesByParent, mailboxes);
    scanResult.createdDupesFolder = dupes.created;
  }

  return scanResult;
}

function mailboxDisplayName(mailbox: Mailbox, byId: Map<string, Mailbox>): string {
  const parts = [mailbox.name];
  let parentId = mailbox.parentId;
  while (parentId) {
    const parent = byId.get(parentId);
    if (!parent) break;
    parts.unshift(parent.name);
    parentId = parent.parentId;
  }
  return parts.join('/');
}

export async function scanMailboxDuplicates(
  client: JMAPClient,
  config: DedupeMatchConfig = DEFAULT_DEDUPE_MATCH_CONFIG,
  onProgress?: (message: string) => void,
  signal?: AbortSignal,
): Promise<DedupeScanResult> {
  if (!hasEnabledCriteria(config)) {
    return { scanned: 0, duplicateCount: 0, moves: [], folderResults: [] };
  }

  const mailboxes = await client.getAllMailboxes();
  const moves: DedupeMove[] = [];
  const folderResults: FolderDedupeScanResult[] = [];
  let scanned = 0;

  const eligible = mailboxes.filter((mailbox) => canDedupeMailbox(mailbox));
  const folderProgress = new Map<string, string>();
  const reportFolderProgress = onProgress
    ? (mailboxName: string, message: string) => {
        folderProgress.set(mailboxName, message);
        const summary = [...folderProgress.entries()]
          .map(([name, detail]) => `${name}: ${detail}`)
          .join(' · ');
        onProgress(summary);
      }
    : undefined;

  for (let offset = 0; offset < eligible.length; offset += SCAN_CONCURRENCY) {
    throwIfAborted(signal);
    const batch = eligible.slice(offset, offset + SCAN_CONCURRENCY);
    const results = await Promise.all(
      batch.map((mailbox) =>
        scanFolderDuplicates(
          client,
          mailbox.id,
          config,
          mailboxes,
          reportFolderProgress
            ? (message) => reportFolderProgress(mailbox.name, message)
            : undefined,
          false,
          signal,
        ),
      ),
    );

    for (const folderResult of results) {
      scanned += folderResult.scanned;
      moves.push(...folderResult.moves);
      if (folderResult.duplicateCount > 0) {
        folderResults.push(folderResult);
      }
    }
  }

  return {
    scanned,
    duplicateCount: moves.length,
    moves,
    folderResults,
  };
}

/** @deprecated Use scanMailboxDuplicates + applyDuplicateAction instead. */
export async function runMailboxDedupe(
  client: JMAPClient,
  dryRun: boolean,
  onProgress?: (message: string) => void,
  config: DedupeMatchConfig = DEFAULT_DEDUPE_MATCH_CONFIG,
  signal?: AbortSignal,
): Promise<DedupeRunResult> {
  const scan = await scanMailboxDuplicates(client, config, onProgress, signal);
  if (dryRun || scan.moves.length === 0) {
    return { ...scan, moved: dryRun ? 0 : 0 };
  }

  const mailboxes = await client.getAllMailboxes();
  const dupesByParent = buildDupesByParentMap(mailboxes);
  const dupesJmapByStore = new Map<string, string>();

  let moved = 0;
  const pending = new Map<string, {
    fromMailboxRef: MailboxJmapRef;
    dupesJmapId: string;
    emailIds: string[];
  }>();

  const foldersToPrepare = [...new Set(scan.moves.map((move) => move.fromMailboxId))];
  for (const folderId of foldersToPrepare) {
    throwIfAborted(signal);
    const parentMailbox = mailboxes.find((mb) => mb.id === folderId);
    if (!parentMailbox) {
      throw new Error(`Failed to resolve mailbox ${folderId} for dupes folder`);
    }
    const sample = scan.moves.find((move) => move.fromMailboxId === folderId);
    onProgress?.(`Preparing ${sample?.fromMailboxName ?? folderId}/${DUPES_FOLDER}`);
    const dupes = await ensureDupesMailbox(client, parentMailbox, dupesByParent, mailboxes);
    dupesJmapByStore.set(dupes.storeId, dupes.jmapId);
  }

  for (const move of scan.moves) {
    const dupesStoreId = dupesByParent.get(move.fromMailboxId);
    if (!dupesStoreId) {
      throw new Error(`Failed to resolve dupes folder for mailbox ${move.fromMailboxId}`);
    }
    const fromMailboxRef = resolveMailboxJmapRef(move.fromMailboxId, mailboxes);
    if (!fromMailboxRef) {
      throw new Error(`Failed to resolve mailbox ${move.fromMailboxId} for move`);
    }
    const dupesJmapId = dupesJmapByStore.get(dupesStoreId) ?? dupesStoreId;

    const bucket = pending.get(dupesStoreId) ?? {
      fromMailboxRef,
      dupesJmapId,
      emailIds: [],
    };
    bucket.emailIds.push(move.emailId);
    pending.set(dupesStoreId, bucket);
  }

  const batchSize = getDedupeBatchSize(client);
  for (const bucket of pending.values()) {
    for (let offset = 0; offset < bucket.emailIds.length; offset += batchSize) {
      throwIfAborted(signal);
      const chunk = bucket.emailIds.slice(offset, offset + batchSize);
      onProgress?.(`Moving ${chunk.length} duplicate(s)`);
      await client.moveEmailsBetweenMailboxes(
        chunk,
        bucket.fromMailboxRef.jmapId,
        bucket.dupesJmapId,
        bucket.fromMailboxRef.accountId,
        signal,
      );
      moved += chunk.length;
    }
  }

  return { ...scan, moved };
}

/** @deprecated Use scanFolderDuplicates + applyDuplicateAction instead. */
export async function runFolderDedupe(
  client: JMAPClient,
  mailboxId: string,
  onProgress?: (message: string) => void,
  config: DedupeMatchConfig = DEFAULT_DEDUPE_MATCH_CONFIG,
  signal?: AbortSignal,
): Promise<DedupeRunResult & { mailboxId: string }> {
  const scan = await scanFolderDuplicates(client, mailboxId, config, undefined, onProgress, false, signal);
  const folderResults = scan.duplicateCount > 0 ? [scan] : [];
  if (scan.moves.length === 0) {
    return {
      scanned: scan.scanned,
      duplicateCount: scan.duplicateCount,
      moves: scan.moves,
      folderResults,
      moved: 0,
      mailboxId,
    };
  }

  const mailboxes = await client.getAllMailboxes();
  const parentMailbox = mailboxes.find((mb) => mb.id === mailboxId);
  if (!parentMailbox) {
    throw new Error(`Failed to resolve mailbox ${mailboxId} for dupes folder`);
  }
  const fromMailboxRef = resolveMailboxJmapRef(mailboxId, mailboxes);
  if (!fromMailboxRef) {
    throw new Error(`Failed to resolve mailbox ${mailboxId} for move`);
  }

  const dupesByParent = buildDupesByParentMap(mailboxes);

  onProgress?.(`Preparing ${scan.mailboxName}/${DUPES_FOLDER}`);
  const dupes = await ensureDupesMailbox(client, parentMailbox, dupesByParent, mailboxes);

  let moved = 0;
  const emailIds = scan.moves.map((move) => move.emailId);
  const batchSize = getDedupeBatchSize(client);

  for (let offset = 0; offset < emailIds.length; offset += batchSize) {
    throwIfAborted(signal);
    const chunk = emailIds.slice(offset, offset + batchSize);
    onProgress?.(`Moving ${chunk.length} duplicate(s)`);
    await client.moveEmailsBetweenMailboxes(
      chunk,
      fromMailboxRef.jmapId,
      dupes.jmapId,
      fromMailboxRef.accountId,
      signal,
    );
    moved += chunk.length;
  }

  return {
    scanned: scan.scanned,
    duplicateCount: scan.duplicateCount,
    moves: scan.moves,
    folderResults,
    moved,
    mailboxId,
  };
}