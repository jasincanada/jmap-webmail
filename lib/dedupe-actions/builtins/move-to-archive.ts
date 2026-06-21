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

function findArchiveMailbox(mailboxes: Mailbox[]): Mailbox | undefined {
  return mailboxes.find((mb) => mb.role === 'archive' && !mb.isShared);
}

export const moveToArchiveDefinition: DedupeActionDefinition = {
  id: 'move_to_archive',
  labelKey: 'dedupe.actions.moveToArchive',
  tier: 2,
  requiresDestination: false,
  destructive: false,
  usesRetentionFolder: false,
  enabled: (ctx: DedupeActionContext) => Boolean(findArchiveMailbox(ctx.mailboxes)),
};

function buildPreview(scan: DedupeScanResult): DedupeApplyPreview {
  return {
    actionId: 'move_to_archive',
    affectedCount: scan.duplicateCount,
    duplicateCount: scan.duplicateCount,
    jmapWrites: scan.duplicateCount > 0,
    summary: `Move ${scan.duplicateCount.toLocaleString()} duplicate(s) to Archive.`,
  };
}

export const moveToArchiveExecutor: DedupeActionExecutor = {
  id: 'move_to_archive',

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
    const archiveMailbox = findArchiveMailbox(mailboxes);
    if (!archiveMailbox) {
      throw new Error('Archive mailbox not found');
    }

    const destination = {
      storeId: archiveMailbox.id,
      jmapId: archiveMailbox.originalId || archiveMailbox.id,
      accountId: archiveMailbox.isShared ? archiveMailbox.accountId : undefined,
    };

    const moved = await executeMoveAction({
      client,
      scan,
      actionId: 'move_to_archive',
      opts,
      audit,
      signal,
      mailboxes,
      resolveDestination: async () => destination,
    });

    return {
      actionId: 'move_to_archive',
      affectedCount: moved,
      duplicateCount: scan.duplicateCount,
      moved,
    };
  },
};