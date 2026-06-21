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
  buildDupesByParentMap,
  DUPES_FOLDER,
  ensureDupesMailbox,
  type DedupeMove,
  type DedupeScanResult,
} from '@/lib/mail-dedupe';

export const moveToDupesDefinition: DedupeActionDefinition = {
  id: 'move_to_dupes',
  labelKey: 'dedupe.actions.moveToDupes',
  tier: 1,
  requiresDestination: false,
  destructive: false,
  usesRetentionFolder: false,
  enabled: () => true,
};

function buildPreview(scan: DedupeScanResult): DedupeApplyPreview {
  return {
    actionId: 'move_to_dupes',
    affectedCount: scan.duplicateCount,
    duplicateCount: scan.duplicateCount,
    jmapWrites: scan.duplicateCount > 0,
    summary: `Move ${scan.duplicateCount.toLocaleString()} duplicate(s) into per-folder ${DUPES_FOLDER}/ subfolders.`,
  };
}

async function prepareDupesDestinations(
  client: JMAPClient,
  moves: DedupeMove[],
  mailboxes: Mailbox[],
  onProgress?: (message: string) => void,
): Promise<Map<string, { storeId: string; jmapId: string; accountId?: string }>> {
  const dupesByParent = buildDupesByParentMap(mailboxes);
  const destinations = new Map<string, { storeId: string; jmapId: string; accountId?: string }>();
  const foldersToPrepare = [...new Set(moves.map((move) => move.fromMailboxId))];

  for (const folderId of foldersToPrepare) {
    const parentMailbox = mailboxes.find((mb) => mb.id === folderId);
    if (!parentMailbox) {
      throw new Error(`Failed to resolve mailbox ${folderId} for ${DUPES_FOLDER} folder`);
    }
    const sample = moves.find((move) => move.fromMailboxId === folderId);
    onProgress?.(`Preparing ${sample?.fromMailboxName ?? folderId}/${DUPES_FOLDER}`);
    const dupes = await ensureDupesMailbox(client, parentMailbox, dupesByParent, mailboxes);
    destinations.set(folderId, {
      storeId: dupes.storeId,
      jmapId: dupes.jmapId,
      accountId: parentMailbox.isShared ? parentMailbox.accountId : undefined,
    });
  }

  return destinations;
}

export const moveToDupesExecutor: DedupeActionExecutor = {
  id: 'move_to_dupes',

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
    const destinations = await prepareDupesDestinations(
      client,
      scan.moves,
      mailboxes,
      opts.onProgress,
    );

    const moved = await executeMoveAction({
      client,
      scan,
      actionId: 'move_to_dupes',
      opts,
      audit,
      signal,
      mailboxes,
      resolveDestination: async (move) => {
        const destination = destinations.get(move.fromMailboxId);
        if (!destination) {
          throw new Error(`Failed to resolve ${DUPES_FOLDER} folder for mailbox ${move.fromMailboxId}`);
        }
        return destination;
      },
    });

    return {
      actionId: 'move_to_dupes',
      affectedCount: moved,
      duplicateCount: scan.duplicateCount,
      moved,
    };
  },
};