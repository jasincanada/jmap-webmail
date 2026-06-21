#!/usr/bin/env node
/**
 * Unified JasMail ship gate — used by orchestrator, CI, and contributors.
 *
 * Usage:
 *   node scripts/ship-gate.mjs                    # quick: lint, typecheck, test, locales
 *   node scripts/ship-gate.mjs --full             # + production build
 *   node scripts/ship-gate.mjs --maximum          # full + dedupe suite + E2E + upstream CVE check
 *   node scripts/ship-gate.mjs --maximum --version 1.7.0  # + review artifact (pre-push / release)
 */
import { existsSync } from 'node:fs';
import { run, ROOT, loadDevOsMode } from './lib/dev-os-utils.mjs';

const COMPOSE_STACK = '/home/jas/dockersites/email';

const args = process.argv.slice(2);
const isMaximum = args.includes('--maximum');
const full = args.includes('--full') || isMaximum;
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

if (isMaximum) {
  steps.push({
    name: 'dedupe-suite',
    cmd: 'npm run test -- lib/__tests__/mail-dedupe lib/__tests__/dedupe-audit lib/__tests__/dedupe-actions lib/__tests__/dedupe-config',
  });
  steps.push({ name: 'e2e', cmd: 'npx playwright test' });
  steps.push({
    name: 'vulnerability-scan',
    cmd: 'node scripts/vulnerability-scan.mjs',
  });
  steps.push({
    name: 'upstream-cve-check',
    cmd: 'node scripts/upstream-status.mjs --fetch --strict',
  });
  if (existsSync(`${COMPOSE_STACK}/docker-compose.yml`)) {
    steps.push({
      name: 'docker-build',
      cmd: 'docker compose build jasmail',
      cwd: COMPOSE_STACK,
    });
  }
}

if (version) {
  steps.push({
    name: 'review-artifact',
    cmd: `node scripts/validate-review-artifact.mjs ${version}`,
  });
}

const label = isMaximum ? 'maximum' : full ? 'full' : 'quick';
const mode = loadDevOsMode();
console.log(`\nJasMail ship-gate (${label}, mode=${mode})${version ? ` v${version}` : ''}\n`);

const failed = [];
for (const step of steps) {
  try {
    run(step.cmd, { cwd: step.cwd || ROOT });
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