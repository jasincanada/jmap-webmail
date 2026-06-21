import { describe, it, expect } from 'vitest';
import {
  classifyFile,
  detectCveCommits,
  maximumGateStepNames,
  parseUpstreamVersionLines,
  validateReviewArtifactContent,
} from '../../scripts/lib/gate-logic.mjs';
import { deepMergeMissing } from '../../scripts/lib/dev-os-utils.mjs';
import manifest from '../../docs/upstream/fork-only-paths.json';

describe('gate-logic', () => {
  it('parseUpstreamVersionLines reads merge-base', () => {
    const parsed = parseUpstreamVersionLines('1.5.2\nmerge-base: abc123\nlast-checked: 2026-06-20') as {
      version: string;
      mergeBase?: string;
    };
    expect(parsed.version).toBe('1.5.2');
    expect(parsed.mergeBase).toBe('abc123');
  });

  it('classifyFile buckets fork-only dedupe paths', () => {
    expect(classifyFile('lib/mail-dedupe.ts', manifest)).toBe('fork-only');
    expect(classifyFile('stores/email-store.ts', manifest)).toBe('shared-hotspot');
    expect(classifyFile('CHANGELOG.md', manifest)).toBe('upstream-owned');
    expect(classifyFile('lib/utils.ts', manifest)).toBe('shared');
  });

  it('detectCveCommits flags security commits', () => {
    const commits = [
      'abc fix: UI tweak',
      'def fix: CVE-2026-44578 WebSocket SSRF',
    ];
    expect(detectCveCommits(commits)).toHaveLength(1);
    expect(detectCveCommits(commits)[0]).toContain('CVE');
  });

  it('validateReviewArtifactContent accepts SHIP CLEAR', () => {
    const ok = validateReviewArtifactContent(`
## Specialist verdicts
| code | SHIP CLEAR | 0 |
## Final verdict
SHIP CLEAR: 0
`);
    expect(ok.ok).toBe(true);
  });

  it('validateReviewArtifactContent rejects missing sections', () => {
    expect(validateReviewArtifactContent('SHIP CLEAR: 0').ok).toBe(false);
  });

  it('validateReviewArtifactContent rejects SHIP BLOCKED', () => {
    const bad = validateReviewArtifactContent(`
## Specialist verdicts
## Final verdict
SHIP BLOCKED: 2 | SHIP CLEAR: 0
`);
    expect(bad.ok).toBe(false);
  });

  it('maximumGateStepNames includes docker-build and vulnerability-scan', () => {
    const steps = maximumGateStepNames({ isMaximum: true, full: true, version: '1.7.1' });
    expect(steps).toContain('docker-build');
    expect(steps).toContain('review-artifact');
    expect(steps).toContain('e2e');
    expect(steps).toContain('vulnerability-scan');
  });
});

describe('dev-os-utils deepMergeMissing', () => {
  it('merges missing nested keys', () => {
    const out = deepMergeMissing({ a: { x: 1 } }, { a: { y: 2 }, b: 3 });
    expect(out).toEqual({ a: { x: 1, y: 2 }, b: 3 });
  });

  it('does not overwrite existing keys', () => {
    const out = deepMergeMissing({ a: 1 }, { a: 2 });
    expect(out.a).toBe(1);
  });
});