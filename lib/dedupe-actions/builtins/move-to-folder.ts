import { executeMoveAction } from '@/lib/dedupe-actions/move-helper';
import type {
  DedupeActionDefinition,
  DedupeActionExecutor,
  DedupeApplyOptions,
  DedupeApplyPreview,
} from '@/lib/dedupe-actions/types';
import type { JMAPClient } from '@/lib/jmap/client';
import type { Mailbox } from '@/lib/jmap/types';
import type { DedupeScanResult } from '@/lib/mail-dedupe';

export const moveToFolderDefinition: DedupeActionDefinition = {
  id: 'move_to_folder',
  labelKey: 'dedupe.actions.moveToFolder',
  tier: 1,
  requiresDestination: true,
  destructive: false,
  usesRetentionFolder: false,
  enabled: () => true,
};

function requireDestination(opts: DedupeApplyOptions): string {
  if (!opts.destinationMailboxId) {
    throw new Error('move_to_folder requires destinationMailboxId');
  }
  return opts.destinationMailboxId;
}

function resolveDestinationMailbox(
  destinationMailboxId: string,
  mailboxes: Mailbox[],
): { storeId: string; jmapId: string; accountId?: string } {
  const mailbox = mailboxes.find((mb) => mb.id === destinationMailboxId);
  if (!mailbox) {
    throw new Error(`Failed to resolve destination mailbox ${destinationMailboxId}`);
  }
  return {
    storeId: mailbox.id,
    jmapId: mailbox.originalId || mailbox.id,
    accountId: mailbox.isShared ? mailbox.accountId : undefined,
  };
}

function buildPreview(scan: DedupeScanResult, opts: DedupeApplyOptions): DedupeApplyPreview {
  const destinationMailboxId = requireDestination(opts);
  return {
    actionId: 'move_to_folder',
    affectedCount: scan.duplicateCount,
    duplicateCount: scan.duplicateCount,
    jmapWrites: scan.duplicateCount > 0,
    summary: `Move ${scan.duplicateCount.toLocaleString()} duplicate(s) to the selected folder.`,
    destinationMailboxId,
  };
}

export const moveToFolderExecutor: DedupeActionExecutor = {
  id: 'move_to_folder',

  preview(scan: DedupeScanResult, opts: DedupeApplyOptions): DedupeApplyPreview {
    return buildPreview(scan, opts);
  },

  async execute(
    client: JMAPClient,
    scan: DedupeScanResult,
    opts: DedupeApplyOptions,
    signal: AbortSignal | undefined,
    audit,
  ) {
    const destinationMailboxId = requireDestination(opts);
    const mailboxes = await client.getAllMailboxes();
    const destination = resolveDestinationMailbox(destinationMailboxId, mailboxes);

    const moved = await executeMoveAction({
      client,
      scan,
      actionId: 'move_to_folder',
      opts,
      audit,
      signal,
      mailboxes,
      resolveDestination: async () => destination,
    });

    return {
      actionId: 'move_to_folder',
      affectedCount: moved,
      duplicateCount: scan.duplicateCount,
      moved,
    };
  },
};