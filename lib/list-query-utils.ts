import type { Email } from '@/lib/jmap/types';

export type ListSort =
  | 'date-desc'
  | 'date-asc'
  | 'subject-asc'
  | 'subject-desc'
  | 'sender-asc'
  | 'sender-desc';

export type ListFilter = 'all' | 'unread' | 'read' | 'starred' | 'attachments';

export const DEFAULT_LIST_SORT: ListSort = 'date-desc';
export const DEFAULT_LIST_FILTER: ListFilter = 'all';

const LIST_SORT_VALUES = new Set<ListSort>([
  'date-desc',
  'date-asc',
  'subject-asc',
  'subject-desc',
  'sender-asc',
  'sender-desc',
]);

const LIST_FILTER_VALUES = new Set<ListFilter>([
  'all',
  'unread',
  'read',
  'starred',
  'attachments',
]);

export function normalizeListSort(value: unknown): ListSort {
  return typeof value === 'string' && LIST_SORT_VALUES.has(value as ListSort)
    ? value as ListSort
    : DEFAULT_LIST_SORT;
}

export function normalizeListFilter(value: unknown): ListFilter {
  return typeof value === 'string' && LIST_FILTER_VALUES.has(value as ListFilter)
    ? value as ListFilter
    : DEFAULT_LIST_FILTER;
}

/** Server-side sort — only date; subject/sender are applied client-side on thread groups. */
export function buildServerListJMAPSort(listSort: ListSort): { property: string; isAscending: boolean }[] {
  if (listSort === 'date-asc') {
    return [{ property: 'receivedAt', isAscending: true }];
  }
  return [{ property: 'receivedAt', isAscending: false }];
}

export function buildListJMAPSort(listSort: ListSort): { property: string; isAscending: boolean }[] {
  switch (listSort) {
    case 'date-asc':
      return [{ property: 'receivedAt', isAscending: true }];
    case 'subject-asc':
      return [{ property: 'subject', isAscending: true }];
    case 'subject-desc':
      return [{ property: 'subject', isAscending: false }];
    case 'sender-asc':
      return [{ property: 'from', isAscending: true }];
    case 'sender-desc':
      return [{ property: 'from', isAscending: false }];
    default:
      return [{ property: 'receivedAt', isAscending: false }];
  }
}

export function buildListJMAPFilter(
  mailboxId: string,
  listFilter: ListFilter,
): Record<string, unknown> {
  const inMailbox = { inMailbox: mailboxId };

  switch (listFilter) {
    case 'unread':
      return { operator: 'AND', conditions: [inMailbox, { notKeyword: '$seen' }] };
    case 'read':
      return { operator: 'AND', conditions: [inMailbox, { hasKeyword: '$seen' }] };
    case 'starred':
      return { operator: 'AND', conditions: [inMailbox, { hasKeyword: '$flagged' }] };
    case 'attachments':
      return { operator: 'AND', conditions: [inMailbox, { hasAttachment: true }] };
    default:
      return inMailbox;
  }
}

export function mergeJMAPFilters(...filters: Record<string, unknown>[]): Record<string, unknown> {
  const conditions = filters.flatMap((filter) => {
    if (
      filter &&
      typeof filter === 'object' &&
      filter.operator === 'AND' &&
      Array.isArray(filter.conditions)
    ) {
      return filter.conditions as Record<string, unknown>[];
    }
    return [filter];
  });

  if (conditions.length === 0) {
    return {};
  }
  if (conditions.length === 1) {
    return conditions[0];
  }
  return { operator: 'AND', conditions };
}

/** Client-side filter for already-loaded rows (e.g. while search is active). */
export function applyClientListFilter(emails: Email[], listFilter: ListFilter): Email[] {
  switch (listFilter) {
    case 'unread':
      return emails.filter((email) => !email.keywords?.$seen);
    case 'read':
      return emails.filter((email) => email.keywords?.$seen === true);
    case 'starred':
      return emails.filter((email) => email.keywords?.$flagged === true);
    case 'attachments':
      return emails.filter((email) => email.hasAttachment);
    default:
      return emails;
  }
}

export function isListFilterActive(listFilter: ListFilter): boolean {
  return listFilter !== 'all';
}