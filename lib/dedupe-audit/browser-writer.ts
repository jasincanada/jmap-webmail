import type { DedupeAuditChange, DedupeAuditWriter } from '@/lib/dedupe-actions/types';
import { dedupeAuditClient } from './client';

const FLUSH_BATCH = 50;

export type BrowserAuditWriter = DedupeAuditWriter & { flush: () => Promise<void> };

export function createBrowserAuditWriter(runId: string): BrowserAuditWriter {
  const pending: Parameters<typeof dedupeAuditClient.recordChanges>[1] = [];
  let flushPromise: Promise<void> = Promise.resolve();

  const flushPending = async () => {
    await flushPromise;
    if (pending.length === 0) return;
    const batch = pending.splice(0, pending.length);
    await dedupeAuditClient.recordChanges(runId, batch);
  };

  const writer: BrowserAuditWriter = {
    recordChange(change: DedupeAuditChange) {
      pending.push({
        emailId: change.emailId,
        groupKey: change.groupKey ?? null,
        fromMailboxId: change.fromMailboxId,
        toMailboxId: change.toMailboxId ?? null,
        actionId: change.actionId,
        keeper: change.keeper,
        purgeAfter: change.purgeAfter ?? null,
      });
      if (pending.length >= FLUSH_BATCH) {
        flushPromise = flushPromise.then(() => flushPending());
      }
    },
    flush: () => flushPromise.then(() => flushPending()),
  };

  return writer;
}