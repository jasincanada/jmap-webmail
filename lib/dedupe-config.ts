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

/** Stalwart default `maxObjectsInGet` — used when session caps are unavailable. */
export const DEDUPE_DEFAULT_MAX_OBJECTS_IN_GET = 500;

/** Multipliers applied to the server's `maxObjectsInGet` for browser guardrails. */
export const DEDUPE_LIMIT_MULTIPLIERS = {
  confirm: 20,
  body: 4,
  hardMax: 100,
} as const;

export interface DedupeBrowserLimits {
  maxObjectsInGet: number;
  confirmThreshold: number;
  bodyMaxFolderMessages: number;
  browserHardMax: number;
}

/** Derive browser dedupe limits from the JMAP server's batch cap (Stalwart default: 500). */
export function deriveDedupeLimits(maxObjectsInGet: number): DedupeBrowserLimits {
  const batch = Math.max(1, Math.floor(maxObjectsInGet));
  return {
    maxObjectsInGet: batch,
    confirmThreshold: batch * DEDUPE_LIMIT_MULTIPLIERS.confirm,
    bodyMaxFolderMessages: batch * DEDUPE_LIMIT_MULTIPLIERS.body,
    browserHardMax: batch * DEDUPE_LIMIT_MULTIPLIERS.hardMax,
  };
}

const STALWART_DEFAULT_LIMITS = deriveDedupeLimits(DEDUPE_DEFAULT_MAX_OBJECTS_IN_GET);

/** Above this count the browser asks for explicit confirmation before scanning. */
export const DEDUPE_CONFIRM_THRESHOLD = STALWART_DEFAULT_LIMITS.confirmThreshold;

/** Browser scan refuses above this count — use the CLI (`mail-dedupe`) instead. */
export const DEDUPE_BROWSER_HARD_MAX = STALWART_DEFAULT_LIMITS.browserHardMax;

/** Body matching in the browser is limited to preview text above this folder size. */
export const DEDUPE_BODY_MAX_FOLDER_MESSAGES = STALWART_DEFAULT_LIMITS.bodyMaxFolderMessages;

export type DedupeScanErrorCode = 'folder_too_large' | 'body_limit' | 'scan_interrupted';

export class DedupeScanError extends Error {
  readonly code: DedupeScanErrorCode;
  readonly suggestCli: boolean;
  readonly messageCount?: number;
  readonly limits: DedupeBrowserLimits;

  constructor(options: {
    message: string;
    code: DedupeScanErrorCode;
    suggestCli?: boolean;
    messageCount?: number;
    limits?: DedupeBrowserLimits;
  }) {
    super(options.message);
    this.name = 'DedupeScanError';
    this.code = options.code;
    this.suggestCli = options.suggestCli ?? false;
    this.messageCount = options.messageCount;
    this.limits = options.limits ?? STALWART_DEFAULT_LIMITS;
  }
}

export function validateDedupeScan(
  messageCount: number,
  config: DedupeMatchConfig,
  limits: DedupeBrowserLimits = STALWART_DEFAULT_LIMITS,
): void {
  if (messageCount > limits.browserHardMax) {
    throw new DedupeScanError({
      code: 'folder_too_large',
      suggestCli: true,
      messageCount,
      limits,
      message:
        `This folder has ${messageCount.toLocaleString()} messages — too large for browser dedupe ` +
        `(limit ${limits.browserHardMax.toLocaleString()} for batch size ${limits.maxObjectsInGet}). ` +
        'Use the mail-dedupe CLI instead.',
    });
  }
  if (config.body && messageCount > limits.bodyMaxFolderMessages) {
    throw new DedupeScanError({
      code: 'body_limit',
      suggestCli: true,
      messageCount,
      limits,
      message:
        `Body matching is disabled for folders over ${limits.bodyMaxFolderMessages.toLocaleString()} messages ` +
        `(${messageCount.toLocaleString()} here). Disable body criterion or use the CLI.`,
    });
  }
}

export function dedupeScanNeedsConfirmation(
  messageCount: number,
  limits: DedupeBrowserLimits = STALWART_DEFAULT_LIMITS,
): boolean {
  return messageCount > limits.confirmThreshold;
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

/** JMAP fields are typed as strings but servers may return null, arrays, or numbers. */
export function coerceJmapString(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return value.map(coerceJmapString).filter(Boolean).join(' ');
  }
  return '';
}

export function normalizeMessageId(messageId?: unknown): string | null {
  const raw = coerceJmapString(messageId);
  if (!raw) return null;
  let value = raw.trim().toLowerCase();
  if (value.startsWith('<') && value.endsWith('>')) {
    value = value.slice(1, -1);
  }
  return value || null;
}

function normalizeBody(text: unknown): string {
  const raw = coerceJmapString(text);
  if (!raw) return '';
  return raw.replace(/\s+/g, ' ').trim().toLowerCase();
}

export function extractBodyText(email: Email): string {
  if (email.bodyValues && email.textBody?.length) {
    const parts = email.textBody
      .map((part) => coerceJmapString(email.bodyValues?.[part.partId]?.value))
      .join('\n');
    if (parts.trim()) {
      return normalizeBody(parts);
    }
  }
  const preview = coerceJmapString(email.preview);
  if (preview) {
    return normalizeBody(preview);
  }
  return '';
}

function formatAddresses(addresses?: { email?: unknown }[]): string {
  if (!addresses?.length) return '';
  return addresses
    .map((addr) => coerceJmapString(addr?.email).trim().toLowerCase())
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
    parts.push(`sub:${coerceJmapString(email.subject).trim().toLowerCase()}`);
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