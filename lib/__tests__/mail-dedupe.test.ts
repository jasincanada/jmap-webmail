import { describe, expect, it } from 'vitest';
import { DedupeAbortedError } from '@/lib/mail-dedupe';

describe('DedupeAbortedError', () => {
  it('has a stable name for cancellation handling', () => {
    const err = new DedupeAbortedError();
    expect(err.name).toBe('DedupeAbortedError');
    expect(err.message).toBe('Operation cancelled');
  });
});