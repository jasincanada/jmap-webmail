/** Pure helpers for dev-os gates — unit tested. */

export const CVE_PATTERN = /cve|security|ssrf|xss|vuln|auth.?bypass|rce|sqli|csrf/i;

export function parseUpstreamVersionLines(text) {
  const lines = text.trim().split('\n');
  const out = { version: lines[0]?.trim() || 'unknown' };
  for (const line of lines.slice(1)) {
    const [key, val] = line.split(':').map((s) => s.trim());
    if (key === 'merge-base') out.mergeBase = val;
    if (key === 'last-checked') out.lastChecked = val;
    if (key === 'last-merge') out.lastMerge = val;
  }
  return out;
}

export function classifyFile(file, manifest) {
  const allFork = Object.values(manifest.categories).flat();
  for (const prefix of allFork) {
    if (file === prefix || file.startsWith(prefix)) return 'fork-only';
  }
  if (manifest.shared_hotspots.some((p) => file === p || file.startsWith(p))) return 'shared-hotspot';
  if (manifest.upstream_owned.some((p) => file === p || file.startsWith(p))) return 'upstream-owned';
  return 'shared';
}

export function detectCveCommits(commits, pattern = CVE_PATTERN) {
  return commits.filter((c) => pattern.test(c));
}

export function validateReviewArtifactContent(content) {
  const required = ['## Specialist verdicts', '## Final verdict'];
  for (const section of required) {
    if (!content.includes(section)) {
      return { ok: false, error: `missing section: ${section}` };
    }
  }
  if (!/SHIP CLEAR:\s*0/.test(content)) {
    return { ok: false, error: 'missing SHIP CLEAR: 0' };
  }
  if (/SHIP BLOCKED:\s*[1-9]/.test(content)) {
    return { ok: false, error: 'contains SHIP BLOCKED with open issues' };
  }
  return { ok: true };
}

export function maximumGateStepNames({ isMaximum, full, version }) {
  const steps = ['eslint', 'typecheck', 'test', 'locales'];
  if (full) steps.push('build');
  if (isMaximum) steps.push('dedupe-suite', 'e2e', 'vulnerability-scan', 'upstream-cve-check', 'docker-build');
  if (version) steps.push('review-artifact');
  return steps;
}