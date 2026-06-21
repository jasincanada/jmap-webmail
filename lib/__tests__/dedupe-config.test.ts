import { describe, expect, it } from 'vitest';
import type { Email } from '@/lib/jmap/types';
import {
  buildDedupeKey,
  coerceJmapString,
  DEDUPE_BODY_MAX_FOLDER_MESSAGES,
  DEDUPE_BROWSER_HARD_MAX,
  DEDUPE_CONFIRM_THRESHOLD,
  DEFAULT_DEDUPE_MATCH_CONFIG,
  DedupeScanError,
  dedupeFetchProperties,
  dedupeScanNeedsConfirmation,
  normalizeMessageId,
  validateDedupeScan,
} from '@/lib/dedupe-config';

describe('validateDedupeScan', () => {
  it('allows small folders', () => {
    expect(() => validateDedupeScan(100, DEFAULT_DEDUPE_MATCH_CONFIG)).not.toThrow();
  });

  it('blocks folders above hard max', () => {
    expect(() => validateDedupeScan(DEDUPE_BROWSER_HARD_MAX + 1, DEFAULT_DEDUPE_MATCH_CONFIG))
      .toThrow(DedupeScanError);
  });

  it('blocks body matching on large folders', () => {
    const config = { ...DEFAULT_DEDUPE_MATCH_CONFIG, body: true };
    expect(() => validateDedupeScan(DEDUPE_BODY_MAX_FOLDER_MESSAGES + 1, config))
      .toThrow(DedupeScanError);
  });
});

describe('dedupeScanNeedsConfirmation', () => {
  it('requires confirmation above threshold', () => {
    expect(dedupeScanNeedsConfirmation(DEDUPE_CONFIRM_THRESHOLD)).toBe(false);
    expect(dedupeScanNeedsConfirmation(DEDUPE_CONFIRM_THRESHOLD + 1)).toBe(true);
  });
});

describe('dedupeFetchProperties', () => {
  it('requests preview only when body criterion enabled', () => {
    const props = dedupeFetchProperties({ ...DEFAULT_DEDUPE_MATCH_CONFIG, body: true });
    expect(props).toContain('preview');
    expect(props).not.toContain('textBody');
    expect(props).not.toContain('bodyValues');
  });
});

describe('coerceJmapString', () => {
  it('coerces arrays and non-strings from JMAP', () => {
    expect(coerceJmapString(['<a@b.c>', '<d@e.f>'])).toBe('<a@b.c> <d@e.f>');
    expect(coerceJmapString(42)).toBe('42');
    expect(coerceJmapString(null)).toBe('');
  });
});

describe('normalizeMessageId', () => {
  it('handles non-string messageId without throwing', () => {
    expect(normalizeMessageId(['<id@example.com>'])).toBe('id@example.com');
    expect(normalizeMessageId(undefined)).toBeNull();
  });
});

describe('buildDedupeKey', () => {
  const baseEmail = {
    id: 'e1',
    threadId: 't1',
    mailboxIds: { m1: true },
    keywords: {},
    size: 100,
    receivedAt: '2026-01-01T00:00:00Z',
    hasAttachment: false,
  } as Email;

  it('does not throw when subject or messageId are malformed JMAP values', () => {
    const email = {
      ...baseEmail,
      messageId: ['<dup@example.com>'] as unknown as string,
      subject: { bad: true } as unknown as string,
      from: [{ email: 'user@example.com' }],
    };
    expect(() => buildDedupeKey(email, DEFAULT_DEDUPE_MATCH_CONFIG)).not.toThrow();
    expect(buildDedupeKey(email, DEFAULT_DEDUPE_MATCH_CONFIG)).toBe('mid:dup@example.com');
  });
});