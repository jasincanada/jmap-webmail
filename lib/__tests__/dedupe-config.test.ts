import { describe, expect, it } from 'vitest';
import {
  DEDUPE_BODY_MAX_FOLDER_MESSAGES,
  DEDUPE_BROWSER_HARD_MAX,
  DEDUPE_CONFIRM_THRESHOLD,
  DEFAULT_DEDUPE_MATCH_CONFIG,
  DedupeScanError,
  dedupeFetchProperties,
  dedupeScanNeedsConfirmation,
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