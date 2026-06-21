import { describe, it, expect } from 'vitest';
import {
  applyClientListFilter,
  buildListJMAPFilter,
  buildServerListJMAPSort,
  mergeJMAPFilters,
  normalizeListFilter,
  normalizeListSort,
} from '@/lib/list-query-utils';
import type { Email } from '@/lib/jmap/types';

describe('list-query-utils', () => {
  it('builds unread filter with mailbox scope', () => {
    expect(buildListJMAPFilter('mbox-1', 'unread')).toEqual({
      operator: 'AND',
      conditions: [{ inMailbox: 'mbox-1' }, { notKeyword: '$seen' }],
    });
  });

  it('uses full server sort properties', () => {
    expect(buildServerListJMAPSort('subject-asc')).toEqual([
      { property: 'subject', isAscending: true },
    ]);
    expect(buildServerListJMAPSort('sender-desc')).toEqual([
      { property: 'from', isAscending: false },
    ]);
    expect(buildServerListJMAPSort('date-asc')).toEqual([
      { property: 'receivedAt', isAscending: true },
    ]);
  });

  it('normalizes invalid persisted values', () => {
    expect(normalizeListSort('invalid')).toBe('date-desc');
    expect(normalizeListFilter('bogus')).toBe('all');
  });

  it('builds read filter with mailbox scope', () => {
    expect(buildListJMAPFilter('mbox-1', 'read')).toEqual({
      operator: 'AND',
      conditions: [{ inMailbox: 'mbox-1' }, { hasKeyword: '$seen' }],
    });
  });

  it('merges list and search filters', () => {
    expect(
      mergeJMAPFilters(
        { operator: 'AND', conditions: [{ inMailbox: 'mbox-1' }, { notKeyword: '$seen' }] },
        { operator: 'AND', conditions: [{ inMailbox: 'mbox-1' }, { text: 'invoice' }] },
      ),
    ).toEqual({
      operator: 'AND',
      conditions: [
        { inMailbox: 'mbox-1' },
        { notKeyword: '$seen' },
        { inMailbox: 'mbox-1' },
        { text: 'invoice' },
      ],
    });
  });

  it('applies client-side unread filter', () => {
    const emails = [
      { id: '1', keywords: { $seen: true } },
      { id: '2', keywords: {} },
    ] as Email[];
    expect(applyClientListFilter(emails, 'unread').map((e) => e.id)).toEqual(['2']);
  });
});