import type { Email } from '@/lib/jmap/types';

export type DedupeMatchMode = 'messageIdFirst' | 'allEnabled';

export interface DedupeMatchConfig {
  mode: DedupeMatchMode;
  messageId: boolean;
  subject: boolean;
  from: boolean;
  to: boolean;
  receivedAt: boolean;
  sentAt: boolean;
  size: boolean;
  hasAttachment: boolean;
  body: boolean;
  threadId: boolean;
}

/** Above this count the browser asks for explicit confirmation before scanning. */
export const DEDUPE_CONFIRM_THRESHOLD = 10_000;

/** Browser scan refuses above this count — use the CLI (`mail-dedupe`) instead. */
export const DEDUPE_BROWSER_HARD_MAX = 50_000;

/** Body matching in the browser is limited to preview text above this folder size. */
export const DEDUPE_BODY_MAX_FOLDER_MESSAGES = 2_000;

export class DedupeScanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DedupeScanError';
  }
}

export function validateDedupeScan(messageCount: number, config: DedupeMatchConfig): void {
  if (messageCount > DEDUPE_BROWSER_HARD_MAX) {
    throw new DedupeScanError(
      `This folder has ${messageCount.toLocaleString()} messages — too large for browser dedupe. ` +
        'Use the mail-dedupe CLI instead.',
    );
  }
  if (config.body && messageCount > DEDUPE_BODY_MAX_FOLDER_MESSAGES) {
    throw new DedupeScanError(
      `Body matching is disabled for folders over ${DEDUPE_BODY_MAX_FOLDER_MESSAGES.toLocaleString()} messages ` +
        `(${messageCount.toLocaleString()} here). Disable body criterion or use the CLI.`,
    );
  }
}

export function dedupeScanNeedsConfirmation(messageCount: number): boolean {
  return messageCount > DEDUPE_CONFIRM_THRESHOLD;
}

export const DEFAULT_DEDUPE_MATCH_CONFIG: DedupeMatchConfig = {
  mode: 'messageIdFirst',
  messageId: true,
  subject: true,
  from: true,
  to: false,
  receivedAt: true,
  sentAt: false,
  size: true,
  hasAttachment: false,
  body: false,
  threadId: false,
};

const CRITERIA_KEYS = [
  'messageId',
  'subject',
  'from',
  'to',
  'receivedAt',
  'sentAt',
  'size',
  'hasAttachment',
  'body',
  'threadId',
] as const;

export type DedupeCriteriaKey = (typeof CRITERIA_KEYS)[number];

export function hasEnabledCriteria(config: DedupeMatchConfig): boolean {
  return CRITERIA_KEYS.some((key) => config[key]);
}

export function normalizeMessageId(messageId?: string): string | null {
  if (!messageId) return null;
  let value = messageId.trim().toLowerCase();
  if (value.startsWith('<') && value.endsWith('>')) {
    value = value.slice(1, -1);
  }
  return value || null;
}

function normalizeBody(text: string): string {
  return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

export function extractBodyText(email: Email): string {
  if (email.bodyValues && email.textBody?.length) {
    const parts = email.textBody
      .map((part) => email.bodyValues?.[part.partId]?.value ?? '')
      .join('\n');
    if (parts.trim()) {
      return normalizeBody(parts);
    }
  }
  if (email.preview) {
    return normalizeBody(email.preview);
  }
  return '';
}

function formatAddresses(addresses?: { email?: string }[]): string {
  if (!addresses?.length) return '';
  return addresses
    .map((addr) => addr.email?.trim().toLowerCase() ?? '')
    .filter(Boolean)
    .sort()
    .join(',');
}

function compositeParts(email: Email, config: DedupeMatchConfig, includeMessageId: boolean): string[] {
  const parts: string[] = [];

  if (includeMessageId && config.messageId) {
    const mid = normalizeMessageId(email.messageId);
    if (mid) {
      parts.push(`mid:${mid}`);
    }
  }
  if (config.subject) {
    parts.push(`sub:${email.subject?.trim().toLowerCase() ?? ''}`);
  }
  if (config.from) {
    parts.push(`from:${formatAddresses(email.from)}`);
  }
  if (config.to) {
    parts.push(`to:${formatAddresses(email.to)}`);
  }
  if (config.receivedAt) {
    parts.push(`recv:${email.receivedAt ?? ''}`);
  }
  if (config.sentAt) {
    parts.push(`sent:${email.sentAt ?? ''}`);
  }
  if (config.size) {
    parts.push(`size:${email.size ?? 0}`);
  }
  if (config.hasAttachment) {
    parts.push(`att:${email.hasAttachment ? '1' : '0'}`);
  }
  if (config.body) {
    parts.push(`body:${extractBodyText(email)}`);
  }
  if (config.threadId) {
    parts.push(`thread:${email.threadId ?? ''}`);
  }

  return parts;
}

export function buildDedupeKey(email: Email, config: DedupeMatchConfig): string | null {
  if (!hasEnabledCriteria(config)) {
    return null;
  }

  const normalizedId = normalizeMessageId(email.messageId);

  if (config.mode === 'messageIdFirst' && config.messageId && normalizedId) {
    return `mid:${normalizedId}`;
  }

  const parts = compositeParts(
    email,
    config,
    config.mode === 'allEnabled' && config.messageId,
  );

  if (parts.length === 0) {
    return null;
  }

  return parts.join('|');
}

export function dedupeFetchNeedsBody(config: DedupeMatchConfig): boolean {
  return config.body;
}

export function dedupeFetchProperties(config: DedupeMatchConfig): string[] {
  const properties = new Set<string>(['id', 'mailboxIds', 'receivedAt', 'subject']);

  if (config.messageId) properties.add('messageId');
  if (config.subject) properties.add('subject');
  if (config.from) properties.add('from');
  if (config.to) properties.add('to');
  if (config.receivedAt) properties.add('receivedAt');
  if (config.sentAt) properties.add('sentAt');
  if (config.size) properties.add('size');
  if (config.hasAttachment) properties.add('hasAttachment');
  if (config.threadId) properties.add('threadId');
  if (config.body) {
    // Browser dedupe uses preview only — never fetch full textBody/bodyValues (see client.ts).
    properties.add('preview');
  }

  return [...properties];
}