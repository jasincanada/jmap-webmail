#!/usr/bin/env node
/**
 * Unified JasMail ship gate — used by orchestrator, CI, and contributors.
 *
 * Usage:
 *   node scripts/ship-gate.mjs              # quick: lint, typecheck, test, locales
 *   node scripts/ship-gate.mjs --full         # + production build
 *   node scripts/ship-gate.mjs --version 1.7.0  # + review artifact validation
 */
import { run, ROOT } from './lib/dev-os-utils.mjs';

const args = process.argv.slice(2);
const full = args.includes('--full');
const versionIdx = args.indexOf('--version');
const version = versionIdx >= 0 ? args[versionIdx + 1]?.replace(/^v/, '') : null;

const steps = [
  { name: 'eslint', cmd: 'npx eslint . --max-warnings 0' },
  { name: 'typecheck', cmd: 'npm run typecheck' },
  { name: 'test', cmd: 'npm run test' },
  { name: 'locales', cmd: 'npm run check:locales' },
];

if (full) {
  steps.push({ name: 'build', cmd: 'npm run build' });
}

if (version) {
  steps.push({
    name: 'review-artifact',
    cmd: `node scripts/validate-review-artifact.mjs ${version}`,
  });
}

console.log(`\nJasMail ship-gate${full ? ' (full)' : ''}${version ? ` v${version}` : ''}\n`);

const failed = [];
for (const step of steps) {
  try {
    run(step.cmd, { cwd: ROOT });
    console.log(`✓ ${step.name}\n`);
  } catch {
    failed.push(step.name);
    console.error(`✗ ${step.name}\n`);
  }
}

if (failed.length > 0) {
  console.error(`Ship gate FAILED: ${failed.join(', ')}`);
  process.exit(1);
}

console.log('Ship gate PASSED');