import { describe, expect, it } from 'vitest';
import { DEDUPE_LIMIT_MULTIPLIERS } from '@/lib/dedupe-config';
import type { JMAPClient } from '@/lib/jmap/client';
import { DedupeAbortedError, getDedupeBatchSize, getDedupeLimits } from '@/lib/mail-dedupe';

function mockClient(maxObjectsInGet: number): JMAPClient {
  return { getMaxObjectsInGet: () => maxObjectsInGet } as JMAPClient;
}

describe('DedupeAbortedError', () => {
  it('has a stable name for cancellation handling', () => {
    const err = new DedupeAbortedError();
    expect(err.name).toBe('DedupeAbortedError');
    expect(err.message).toBe('Operation cancelled');
  });
});

describe('getDedupeBatchSize', () => {
  it('reads maxObjectsInGet from the JMAP client', () => {
    expect(getDedupeBatchSize(mockClient(250))).toBe(250);
  });
});

describe('getDedupeLimits', () => {
  it('derives browser limits from the connected client', () => {
    const limits = getDedupeLimits(mockClient(200));
    expect(limits.maxObjectsInGet).toBe(200);
    expect(limits.browserHardMax).toBe(200 * DEDUPE_LIMIT_MULTIPLIERS.hardMax);
  });
});