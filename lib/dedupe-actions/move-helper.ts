import type { DedupeActionId, DedupeApplyOptions, DedupeAuditWriter } from '@/lib/dedupe-actions/types';
import type { JMAPClient } from '@/lib/jmap/client';
import type { Mailbox } from '@/lib/jmap/types';
import {
  batchApplyDuplicateMoves,
  type DedupeMove,
} from '@/lib/mail-dedupe';

export interface MoveDestinationRef {
  storeId: string;
  jmapId: string;
  accountId?: string;
}

export interface ExecuteMoveActionParams {
  client: JMAPClient;
  scan: { duplicateCount: number; moves: DedupeMove[] };
  actionId: DedupeActionId;
  opts: DedupeApplyOptions;
  audit: DedupeAuditWriter;
  signal?: AbortSignal;
  mailboxes: Mailbox[];
  resolveDestination: (move: DedupeMove, mailboxes: Mailbox[]) => Promise<MoveDestinationRef>;
  purgeAfter?: number;
}

export async function executeMoveAction(params: ExecuteMoveActionParams): Promise<number> {
  const { client, scan, actionId, opts, audit, signal, mailboxes, resolveDestination, purgeAfter } = params;

  if (scan.moves.length === 0) {
    return 0;
  }

  return batchApplyDuplicateMoves({
    client,
    moves: scan.moves,
    mailboxes,
    resolveDestination,
    actionId,
    audit,
    onProgress: opts.onProgress,
    signal,
    purgeAfter,
  });
}