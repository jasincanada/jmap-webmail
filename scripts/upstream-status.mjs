#!/usr/bin/env node
/**
 * Compare JasMail main to upstream (origin fetch URL).
 * Usage:
 *   node scripts/upstream-status.mjs           # JSON report
 *   node scripts/upstream-status.mjs --fetch   # git fetch origin first
 *   node scripts/upstream-status.mjs --human     # readable summary
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, git, readJson, run } from './lib/dev-os-utils.mjs';
import { classifyFile, detectCveCommits, parseUpstreamVersionLines } from './lib/gate-logic.mjs';

const args = process.argv.slice(2);
const doFetch = args.includes('--fetch');
const human = args.includes('--human');
const strict = args.includes('--strict');
const upstreamRemote = process.env.UPSTREAM_REMOTE || 'origin';

function parseUpstreamVersion() {
  const path = join(ROOT, 'UPSTREAM_VERSION');
  if (!existsSync(path)) {
    return { version: 'unknown', mergeBase: null, lastChecked: null, lastMerge: null };
  }
  return parseUpstreamVersionLines(readFileSync(path, 'utf8'));
}

function listLines(cmd) {
  try {
    const out = git(cmd);
    return out ? out.split('\n').filter(Boolean) : [];
  } catch {
    return [];
  }
}

function nearestUpstreamTag() {
  try {
    return git(`describe --tags --abbrev=0 ${upstreamRemote}/main 2>/dev/null`) || null;
  } catch {
    return null;
  }
}

if (doFetch) {
  run(`git fetch ${upstreamRemote}`, { silent: false });
}

const pinned = parseUpstreamVersion();
const manifest = readJson(join(ROOT, 'docs/upstream/fork-only-paths.json'));
const mergeBase = pinned.mergeBase || git(`merge-base HEAD ${upstreamRemote}/main`);
const upstreamTip = `${upstreamRemote}/main`;
const forkAhead = listLines(`log --oneline ${upstreamTip}..HEAD`);
const upstreamAhead = listLines(`log --oneline ${mergeBase}..${upstreamTip}`);
const upstreamChangedFiles = listLines(`diff --name-only ${mergeBase}..${upstreamTip}`);
const classified = {};

for (const file of upstreamChangedFiles) {
  const bucket = classifyFile(file, manifest);
  classified[bucket] = classified[bucket] || [];
  classified[bucket].push(file);
}

const cveCommits = detectCveCommits(upstreamAhead);
const hasCve = cveCommits.length > 0;

const report = {
  upstreamRemote,
  upstreamFetchUrl: git(`remote get-url ${upstreamRemote}`),
  pinnedUpstream: pinned.version,
  pinnedMergeBase: pinned.mergeBase,
  currentMergeBase: mergeBase,
  nearestUpstreamTag: nearestUpstreamTag(),
  upstreamTip: git(`rev-parse --short ${upstreamTip}`),
  forkTip: git('rev-parse --short HEAD'),
  status:
    upstreamAhead.length === 0
      ? 'current'
      : hasCve
        ? 'cve-pending'
        : upstreamAhead.length <= 5
          ? 'updates-available'
          : 'major-drift',
  forkCommitsAhead: forkAhead.length,
  upstreamCommitsAhead: upstreamAhead.length,
  hasCve,
  cveCommits,
  upstreamCommits: upstreamAhead.slice(0, 20),
  forkCommits: forkAhead.slice(0, 10),
  upstreamChangedFiles: {
    total: upstreamChangedFiles.length,
    byCategory: classified,
  },
  recommendedAction:
    upstreamAhead.length === 0
      ? 'none'
      : hasCve
        ? 'CVE pending — run /jasmail-upstream-maintainer immediately (Option C: full pipeline, no shortcuts)'
        : 'review then /jasmail-upstream-maintainer or defer with MERGE_LOG entry — docs/DEV_OS_POLICY.md',
  policy: 'maximum',
  lastChecked: pinned.lastChecked,
  lastMerge: pinned.lastMerge,
};

if (human) {
  console.log(`Upstream: ${report.pinnedUpstream} (pinned) → ${report.nearestUpstreamTag || 'no tag'} @ ${report.upstreamTip}`);
  console.log(`Merge base: ${report.currentMergeBase}`);
  console.log(`Fork ahead: ${report.forkCommitsAhead} commits | Upstream ahead: ${report.upstreamCommitsAhead} commits`);
  console.log(`Status: ${report.status}${hasCve ? ' ⚠ CVE' : ''}`);
  if (hasCve) {
    console.log('\nCVE/security commits:');
    for (const c of cveCommits) console.log(`  ${c}`);
  }
  if (report.upstreamCommitsAhead > 0) {
    console.log('\nUpstream commits since merge-base:');
    for (const c of report.upstreamCommits) console.log(`  ${c}`);
    console.log('\nChanged files by category:');
    for (const [cat, files] of Object.entries(classified)) {
      console.log(`  ${cat}: ${files.length}`);
    }
  }
  console.log(`\n→ ${report.recommendedAction}`);
} else {
  console.log(JSON.stringify(report, null, 2));
}

if (strict && hasCve) {
  console.error('\nSTRICT: unmerged upstream CVE commits — merge or cherry-pick before tagging (Option C).');
  process.exit(1);
}