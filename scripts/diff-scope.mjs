#!/usr/bin/env node
/**
 * Deterministic reviewer scope from git diff.
 * Usage: node scripts/diff-scope.mjs [base-branch]
 * Output: JSON with flags and recommended specialists.
 */
import { changedFiles } from './lib/dev-os-utils.mjs';

const base = process.argv[2] || process.env.GIT_BASE || 'main';
const files = changedFiles(base);

const scope = {
  base,
  fileCount: files.length,
  ui: files.some((f) => /^components\//.test(f) || /^app\/.*\.tsx$/.test(f)),
  i18n: files.some((f) => /^locales\//.test(f)),
  stack: files.some((f) =>
    /^(Dockerfile|next\.config\.|instrumentation|\.env\.example)/.test(f) ||
    f.startsWith('app/api/') ||
    f.startsWith('lib/dedupe-audit/'),
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
    'jasmail-test-reviewer',
    'jasmail-plan-reviewer',
  ],
  conditional: [],
  skip: [],
};

if (scope.ui) specialists.conditional.push('jasmail-a11y-reviewer');
else specialists.skip.push('jasmail-a11y-reviewer');

if (scope.i18n || scope.ui) specialists.conditional.push('jasmail-i18n-reviewer');
else specialists.skip.push('jasmail-i18n-reviewer');

if (scope.stack) specialists.conditional.push('jasmail-stack-maintainer');
else specialists.skip.push('jasmail-stack-maintainer');

scope.reviewers = [...specialists.always, ...specialists.conditional];
scope.specialists = specialists;

console.log(JSON.stringify(scope, null, 2));