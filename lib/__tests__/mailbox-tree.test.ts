import { describe, it, expect } from 'vitest';
import { getMailboxFullPath } from '../utils';
import type { Mailbox } from '../jmap/types';

const mb = (id: string, name: string, parentId?: string, role?: string): Mailbox => ({
  id,
  name,
  parentId,
  role,
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
});

describe('getMailboxFullPath', () => {
  it('returns the leaf name for a top-level mailbox', () => {
    const inbox = mb('a', 'Inbox', undefined, 'inbox');
    expect(getMailboxFullPath([inbox], 'a')).toBe('Inbox');
  });

  it('walks parentId and joins with the hierarchy delimiter', () => {
    const inbox = mb('a', 'Inbox', undefined, 'inbox');
    const projects = mb('b', 'Projects', 'a');
    const foo = mb('c', 'Foo', 'b');
    expect(getMailboxFullPath([inbox, projects, foo], 'c')).toBe('Inbox/Projects/Foo');
  });

  it('returns the full path regardless of mailbox list order', () => {
    const foo = mb('c', 'Foo', 'b');
    const projects = mb('b', 'Projects', 'a');
    const inbox = mb('a', 'Inbox', undefined, 'inbox');
    expect(getMailboxFullPath([foo, projects, inbox], 'c')).toBe('Inbox/Projects/Foo');
  });

  it('returns empty string for unknown id', () => {
    expect(getMailboxFullPath([mb('a', 'Inbox')], 'missing')).toBe('');
  });

  it('stops at an orphaned parent without infinite-looping', () => {
    const orphan = mb('c', 'Foo', 'gone');
    expect(getMailboxFullPath([orphan], 'c')).toBe('Foo');
  });

  it('does not loop on a self-referential parentId', () => {
    const cyclic = mb('a', 'Loop', 'a');
    expect(getMailboxFullPath([cyclic], 'a')).toBe('Loop');
  });
});
