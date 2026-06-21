#!/usr/bin/env node
/**
 * Deterministic reviewer scope from git diff.
 * Usage: node scripts/diff-scope.mjs [base-branch]
 *        UPSTREAM_MERGE=1 node scripts/diff-scope.mjs  # force full scope
 * Output: JSON with flags and recommended specialists.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { changedFiles, git, ROOT, loadDevOsMode } from './lib/dev-os-utils.mjs';

const base = process.argv.find((a) => !a.startsWith('-') && a !== process.argv[0] && a !== process.argv[1])
  || process.env.GIT_BASE
  || 'main';
const files = changedFiles(base);

const upstreamMerge =
  process.env.UPSTREAM_MERGE === '1' ||
  process.env.UPSTREAM_MERGE === 'true' ||
  isUpstreamMergeBranch() ||
  hasMergeCommitFromUpstream(base);

function isUpstreamMergeBranch() {
  try {
    const branch = git('rev-parse --abbrev-ref HEAD');
    return /^upstream\/merge-/.test(branch);
  } catch {
    return false;
  }
}

function hasMergeCommitFromUpstream(baseRef) {
  try {
    const log = git(`log --merges --oneline -5 ${baseRef}..HEAD`);
    return /merge upstream|origin\/main|root-fr/i.test(log);
  } catch {
    return false;
  }
}

const maximumMode = loadDevOsMode() === 'maximum' || process.env.DEV_OS_MODE === 'maximum';

const scope = {
  base,
  fileCount: files.length,
  devOsMode: maximumMode ? 'maximum' : 'standard',
  upstreamMerge,
  ui: files.some((f) => /^components\//.test(f) || /^app\/.*\.tsx$/.test(f)),
  i18n: files.some((f) => /^locales\//.test(f)),
  stack: files.some((f) =>
    /^(Dockerfile|next\.config\.|instrumentation|\.env\.example)/.test(f) ||
    f.startsWith('app/api/') ||
    f.startsWith('lib/dedupe-audit/'),
  ),
  dedupe: files.some((f) =>
    /dedupe|mail-dedupe/.test(f),
  ),
  lib: files.some((f) => f.startsWith('lib/')),
  stores: files.some((f) => f.startsWith('stores/')),
  tests: files.some((f) => /\.test\.(ts|tsx)$/.test(f) || f.includes('__tests__')),
  skills: files.some((f) => f.startsWith('.grok/skills/')),
  files,
};

const specialists = {
  always: [
    'jasmail-code-reviewer',
    'jasmail-security-reviewer',
    'jasmail-vulnerability-reviewer',
    'jasmail-test-reviewer',
    'jasmail-plan-reviewer',
  ],
  conditional: [],
  skip: [],
};

if (scope.upstreamMerge || maximumMode) {
  if (scope.upstreamMerge) {
    specialists.always.unshift('jasmail-upstream-maintainer');
  }
  specialists.conditional.push(
    'jasmail-a11y-reviewer',
    'jasmail-i18n-reviewer',
    'jasmail-stack-maintainer',
  );
} else {
  if (scope.ui) specialists.conditional.push('jasmail-a11y-reviewer');
  else specialists.skip.push('jasmail-a11y-reviewer');

  if (scope.i18n || scope.ui) specialists.conditional.push('jasmail-i18n-reviewer');
  else specialists.skip.push('jasmail-i18n-reviewer');

  if (scope.stack) specialists.conditional.push('jasmail-stack-maintainer');
  else specialists.skip.push('jasmail-stack-maintainer');
}

scope.reviewers = [...specialists.always, ...specialists.conditional];
scope.specialists = specialists;

if (scope.upstreamMerge && existsSync(join(ROOT, 'UPSTREAM_VERSION'))) {
  scope.upstreamPinned = readFileSync(join(ROOT, 'UPSTREAM_VERSION'), 'utf8').split('\n')[0].trim();
}

console.log(JSON.stringify(scope, null, 2));