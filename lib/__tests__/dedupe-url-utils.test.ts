import { describe, it, expect } from 'vitest';
import { isLegacyRemoveAction, redirectRemoveToScanParams } from '../dedupe-url-utils';

describe('dedupe-url-utils', () => {
  it('isLegacyRemoveAction detects remove', () => {
    expect(isLegacyRemoveAction('remove')).toBe(true);
    expect(isLegacyRemoveAction('scan')).toBe(false);
    expect(isLegacyRemoveAction(null)).toBe(false);
  });

  it('redirectRemoveToScanParams rewrites action=remove (V17-8)', () => {
    for (const input of ['action=remove&folder=abc', 'folder=abc']) {
      const params = new URLSearchParams(redirectRemoveToScanParams(input));
      expect(params.get('action')).toBe('scan');
      if (input.includes('folder')) expect(params.get('folder')).toBe('abc');
    }
  });
});