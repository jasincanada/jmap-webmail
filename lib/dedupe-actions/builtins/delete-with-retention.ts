import { executeMoveAction } from '@/lib/dedupe-actions/move-helper';
import type {
  DedupeActionDefinition,
  DedupeActionExecutor,
  DedupeApplyOptions,
  DedupeApplyPreview,
} from '@/lib/dedupe-actions/types';
import type { JMAPClient } from '@/lib/jmap/client';
import type { Mailbox } from '@/lib/jmap/types';
import {
  buildDeletedByParentMap,
  computeDeletedRetentionPurgeAfter,
  DELETED_FOLDER,
  DEDUPE_DELETED_RETENTION_DAYS,
  ensureDeletedMailbox,
  type DedupeMove,
  type DedupeScanResult,
} from '@/lib/mail-dedupe';

export const deleteWithRetentionDefinition: DedupeActionDefinition = {
  id: 'delete_with_retention',
  labelKey: 'dedupe.actions.deleteWithRetention',
  tier: 2,
  requiresDestination: false,
  destructive: true,
  usesRetentionFolder: true,
  enabled: () => true,
};

function buildPreview(scan: DedupeScanResult): DedupeApplyPreview {
  return {
    actionId: 'delete_with_retention',
    affectedCount: scan.duplicateCount,
    duplicateCount: scan.duplicateCount,
    jmapWrites: scan.duplicateCount > 0,
    retentionDays: DEDUPE_DELETED_RETENTION_DAYS,
    summary:
      `Move ${scan.duplicateCount.toLocaleString()} duplicate(s) to ${DELETED_FOLDER}/ ` +
      `and permanently remove after ${DEDUPE_DELETED_RETENTION_DAYS} days.`,
  };
}

async function prepareDeletedDestinations(
  client: JMAPClient,
  moves: DedupeMove[],
  mailboxes: Mailbox[],
  onProgress?: (message: string) => void,
): Promise<Map<string, { storeId: string; jmapId: string; accountId?: string }>> {
  const deletedByParent = buildDeletedByParentMap(mailboxes);
  const destinations = new Map<string, { storeId: string; jmapId: string; accountId?: string }>();
  const foldersToPrepare = [...new Set(moves.map((move) => move.fromMailboxId))];

  for (const folderId of foldersToPrepare) {
    const parentMailbox = mailboxes.find((mb) => mb.id === folderId);
    if (!parentMailbox) {
      throw new Error(`Failed to resolve mailbox ${folderId} for ${DELETED_FOLDER} folder`);
    }
    const sample = moves.find((move) => move.fromMailboxId === folderId);
    onProgress?.(`Preparing ${sample?.fromMailboxName ?? folderId}/${DELETED_FOLDER}`);
    const deleted = await ensureDeletedMailbox(client, parentMailbox, deletedByParent, mailboxes);
    destinations.set(folderId, {
      storeId: deleted.storeId,
      jmapId: deleted.jmapId,
      accountId: parentMailbox.isShared ? parentMailbox.accountId : undefined,
    });
  }

  return destinations;
}

export const deleteWithRetentionExecutor: DedupeActionExecutor = {
  id: 'delete_with_retention',

  preview(scan: DedupeScanResult, _opts: DedupeApplyOptions): DedupeApplyPreview {
    return buildPreview(scan);
  },

  async execute(
    client: JMAPClient,
    scan: DedupeScanResult,
    opts: DedupeApplyOptions,
    signal: AbortSignal | undefined,
    audit,
  ) {
    const mailboxes = await client.getAllMailboxes();
    const destinations = await prepareDeletedDestinations(
      client,
      scan.moves,
      mailboxes,
      opts.onProgress,
    );
    const purgeAfter = computeDeletedRetentionPurgeAfter();

    const moved = await executeMoveAction({
      client,
      scan,
      actionId: 'delete_with_retention',
      opts,
      audit,
      signal,
      mailboxes,
      purgeAfter,
      resolveDestination: async (move) => {
        const destination = destinations.get(move.fromMailboxId);
        if (!destination) {
          throw new Error(`Failed to resolve ${DELETED_FOLDER} folder for mailbox ${move.fromMailboxId}`);
        }
        return destination;
      },
    });

    return {
      actionId: 'delete_with_retention',
      affectedCount: moved,
      duplicateCount: scan.duplicateCount,
      moved,
    };
  },
};