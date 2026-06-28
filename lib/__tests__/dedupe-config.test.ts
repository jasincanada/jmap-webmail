import { describe, expect, it } from 'vitest';
import type { Email } from '@/lib/jmap/types';
import {
  buildDedupeKey,
  coerceJmapString,
  DEDUPE_BODY_MAX_FOLDER_MESSAGES,
  DEDUPE_BROWSER_HARD_MAX,
  DEDUPE_CONFIRM_THRESHOLD,
  DEDUPE_DEFAULT_MAX_OBJECTS_IN_GET,
  DEDUPE_LIMIT_MULTIPLIERS,
  DEFAULT_DEDUPE_MATCH_CONFIG,
  DedupeScanError,
  dedupeFetchProperties,
  dedupeScanNeedsConfirmation,
  deriveDedupeLimits,
  formatDedupeScanErrorMessage,
  normalizeMessageId,
  validateDedupeScan,
} from '@/lib/dedupe-config';

describe('deriveDedupeLimits', () => {
  it('scales limits from maxObjectsInGet', () => {
    const limits = deriveDedupeLimits(500);
    expect(limits.maxObjectsInGet).toBe(500);
    expect(limits.confirmThreshold).toBe(500 * DEDUPE_LIMIT_MULTIPLIERS.confirm);
    expect(limits.bodyMaxFolderMessages).toBe(500 * DEDUPE_LIMIT_MULTIPLIERS.body);
    expect(limits.browserHardMax).toBe(500 * DEDUPE_LIMIT_MULTIPLIERS.hardMax);
  });

  it('matches Stalwart default exports', () => {
    const limits = deriveDedupeLimits(DEDUPE_DEFAULT_MAX_OBJECTS_IN_GET);
    expect(limits.confirmThreshold).toBe(DEDUPE_CONFIRM_THRESHOLD);
    expect(limits.bodyMaxFolderMessages).toBe(DEDUPE_BODY_MAX_FOLDER_MESSAGES);
    expect(limits.browserHardMax).toBe(DEDUPE_BROWSER_HARD_MAX);
  });
});

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

  it('tags body limit errors for CLI guidance', () => {
    const config = { ...DEFAULT_DEDUPE_MATCH_CONFIG, body: true };
    const limits = deriveDedupeLimits(500);
    try {
      validateDedupeScan(limits.bodyMaxFolderMessages + 1, config, limits);
    } catch (error) {
      expect(error).toBeInstanceOf(DedupeScanError);
      expect((error as DedupeScanError).code).toBe('body_limit');
      expect((error as DedupeScanError).suggestCli).toBe(true);
    }
  });

  it('tags folder_too_large errors for CLI guidance', () => {
    const limits = deriveDedupeLimits(500);
    try {
      validateDedupeScan(limits.browserHardMax + 1, DEFAULT_DEDUPE_MATCH_CONFIG, limits);
    } catch (error) {
      expect(error).toBeInstanceOf(DedupeScanError);
      expect((error as DedupeScanError).code).toBe('folder_too_large');
      expect((error as DedupeScanError).suggestCli).toBe(true);
    }
  });
});

describe('formatDedupeScanErrorMessage', () => {
  const t = (key: string, values?: Record<string, string | number>) =>
    `${key}:${JSON.stringify(values ?? {})}`;

  it('maps folder_too_large to i18n key with limit params', () => {
    const limits = deriveDedupeLimits(500);
    const err = new DedupeScanError({
      code: 'folder_too_large',
      suggestCli: true,
      messageCount: 60_000,
      limits,
      message: 'ignored in UI',
    });
    expect(formatDedupeScanErrorMessage(t, err)).toBe(
      'error_folder_too_large:{"count":60000,"limit":50000,"batch":500}',
    );
  });

  it('maps scan_interrupted to position params', () => {
    const err = new DedupeScanError({
      code: 'scan_interrupted',
      scanPosition: 1000,
      scanTotal: 5000,
      message: 'ignored in UI',
    });
    expect(formatDedupeScanErrorMessage(t, err)).toBe(
      'error_scan_interrupted:{"position":1000,"total":5000}',
    );
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

  it('coerces non-string threadId when thread criterion is enabled', () => {
    const config = { ...DEFAULT_DEDUPE_MATCH_CONFIG, messageId: false, threadId: true };
    const email = {
      ...baseEmail,
      messageId: undefined,
      threadId: ['thread-array'] as unknown as string,
      subject: 'Hello',
      from: [{ email: 'user@example.com' }],
    };
    const key = buildDedupeKey(email, config);
    expect(key).toContain('thread:thread-array');
  });
});