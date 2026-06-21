import { describe, expect, it } from 'vitest';
import { reviewOnlyExecutor } from '@/lib/dedupe-actions/builtins/review-only';
import {
  getActionDefinitions,
  getExecutor,
  listEnabledActions,
} from '@/lib/dedupe-actions/registry';
import type { DedupeActionContext } from '@/lib/dedupe-actions/types';
import {
  computeDeletedRetentionPurgeAfter,
  DEDUPE_DELETED_RETENTION_DAYS,
  type DedupeScanResult,
} from '@/lib/mail-dedupe';

function emptyScan(duplicateCount = 0): DedupeScanResult {
  return {
    scanned: 10,
    duplicateCount,
    moves: [],
    folderResults: [],
  };
}

function sampleContext(overrides: Partial<DedupeActionContext> = {}): DedupeActionContext {
  return {
    mailboxes: [
      {
        id: 'inbox',
        name: 'INBOX',
        sortOrder: 0,
        totalEmails: 0,
        unreadEmails: 0,
        totalThreads: 0,
        unreadThreads: 0,
        myRights: {
          mayReadItems: true,
          mayAddItems: true,
          mayRemoveItems: true,
          maySetSeen: true,
          maySetKeywords: true,
          mayCreateChild: true,
          mayRename: true,
          mayDelete: true,
          maySubmit: true,
        },
        isSubscribed: true,
      },
      {
        id: 'trash',
        name: 'Trash',
        role: 'trash',
        sortOrder: 1,
        totalEmails: 0,
        unreadEmails: 0,
        totalThreads: 0,
        unreadThreads: 0,
        myRights: {
          mayReadItems: true,
          mayAddItems: true,
          mayRemoveItems: true,
          maySetSeen: true,
          maySetKeywords: true,
          mayCreateChild: true,
          mayRename: true,
          mayDelete: true,
          maySubmit: true,
        },
        isSubscribed: true,
      },
    ],
    allowDestructiveActions: false,
    ...overrides,
  };
}

describe('dedupe action registry', () => {
  it('lists all built-in action definitions', () => {
    const definitions = getActionDefinitions();
    expect(definitions.map((definition) => definition.id)).toEqual([
      'review_only',
      'move_to_folder',
      'move_to_dupes',
      'move_to_trash',
      'move_to_archive',
      'delete_with_retention',
    ]);
  });

  it('returns executors for built-in action ids', () => {
    expect(getExecutor('review_only')?.id).toBe('review_only');
    expect(getExecutor('delete_with_retention')?.id).toBe('delete_with_retention');
  });

  it('filters enabled actions based on mailbox context', () => {
    const enabled = listEnabledActions(sampleContext());
    expect(enabled.map((definition) => definition.id)).toEqual([
      'review_only',
      'move_to_folder',
      'move_to_dupes',
      'move_to_trash',
      'delete_with_retention',
    ]);
  });

  it('omits trash when no trash mailbox exists', () => {
    const enabled = listEnabledActions(sampleContext({ mailboxes: [] }));
    expect(enabled.some((definition) => definition.id === 'move_to_trash')).toBe(false);
  });
});

describe('review_only preview', () => {
  it('reports no JMAP writes and zero affected count', () => {
    const preview = reviewOnlyExecutor.preview(emptyScan(3), {});
    expect(preview).toMatchObject({
      actionId: 'review_only',
      affectedCount: 0,
      duplicateCount: 3,
      jmapWrites: false,
    });
    expect(preview.summary).toContain('3');
  });
});

describe('deleted retention constants', () => {
  it('uses a 90-day retention window', () => {
    expect(DEDUPE_DELETED_RETENTION_DAYS).toBe(90);
  });

  it('rebuilds moves when keeper policy is newest', async () => {
    const { rebuildScanWithKeeperPolicy } = await import('@/lib/mail-dedupe');
    const scan = {
      scanned: 3,
      duplicateCount: 1,
      moves: [{
        emailId: 'b',
        subject: 'Test',
        fromMailboxId: 'inbox',
        fromMailboxName: 'Inbox',
        key: 'k1',
      }],
      folderResults: [{
        mailboxId: 'inbox',
        mailboxName: 'Inbox',
        scanned: 3,
        duplicateCount: 1,
        groups: [{
          key: 'k1',
          keeperId: 'a',
          emailIds: ['a', 'b'],
          duplicateIds: ['b'],
        }],
        moves: [{
          emailId: 'b',
          subject: 'Test',
          fromMailboxId: 'inbox',
          fromMailboxName: 'Inbox',
          key: 'k1',
        }],
      }],
    };

    const rebuilt = rebuildScanWithKeeperPolicy(scan, 'newest');
    expect(rebuilt.folderResults[0].groups[0].keeperId).toBe('b');
    expect(rebuilt.moves[0].emailId).toBe('a');
  });

  it('computes purge_after from the retention constant', () => {
    const changedAt = Date.parse('2026-01-01T00:00:00.000Z');
    const purgeAfter = computeDeletedRetentionPurgeAfter(changedAt);
    const expected = changedAt + 90 * 24 * 60 * 60 * 1000;
    expect(purgeAfter).toBe(expected);
  });
});