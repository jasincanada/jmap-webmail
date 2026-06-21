import { executeMoveAction } from '@/lib/dedupe-actions/move-helper';
import type {
  DedupeActionDefinition,
  DedupeActionContext,
  DedupeActionExecutor,
  DedupeApplyOptions,
  DedupeApplyPreview,
} from '@/lib/dedupe-actions/types';
import type { JMAPClient } from '@/lib/jmap/client';
import type { Mailbox } from '@/lib/jmap/types';
import type { DedupeScanResult } from '@/lib/mail-dedupe';

function findTrashMailbox(mailboxes: Mailbox[]): Mailbox | undefined {
  return mailboxes.find((mb) => mb.role === 'trash' && !mb.isShared);
}

export const moveToTrashDefinition: DedupeActionDefinition = {
  id: 'move_to_trash',
  labelKey: 'dedupe.actions.moveToTrash',
  tier: 2,
  requiresDestination: false,
  destructive: false,
  usesRetentionFolder: false,
  enabled: (ctx: DedupeActionContext) => Boolean(findTrashMailbox(ctx.mailboxes)),
};

function buildPreview(scan: DedupeScanResult): DedupeApplyPreview {
  return {
    actionId: 'move_to_trash',
    affectedCount: scan.duplicateCount,
    duplicateCount: scan.duplicateCount,
    jmapWrites: scan.duplicateCount > 0,
    summary: `Move ${scan.duplicateCount.toLocaleString()} duplicate(s) to Trash.`,
  };
}

export const moveToTrashExecutor: DedupeActionExecutor = {
  id: 'move_to_trash',

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
    const trashMailbox = findTrashMailbox(mailboxes);
    if (!trashMailbox) {
      throw new Error('Trash mailbox not found');
    }

    const destination = {
      storeId: trashMailbox.id,
      jmapId: trashMailbox.originalId || trashMailbox.id,
      accountId: trashMailbox.isShared ? trashMailbox.accountId : undefined,
    };

    const moved = await executeMoveAction({
      client,
      scan,
      actionId: 'move_to_trash',
      opts,
      audit,
      signal,
      mailboxes,
      resolveDestination: async () => destination,
    });

    return {
      actionId: 'move_to_trash',
      affectedCount: moved,
      duplicateCount: scan.duplicateCount,
      moved,
    };
  },
};