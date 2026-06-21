#!/usr/bin/env node
/**
 * Adds missing keys from en/common.json into other locales (preserves translations).
 * Usage: npm run locales:sync && npm run check:locales
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, deepMergeMissing } from './lib/dev-os-utils.mjs';

const LOCALES_DIR = join(ROOT, 'locales');
const REFERENCE = 'en';
const TARGETS = ['de', 'es', 'fr', 'it', 'ja', 'nl', 'pt', 'ru', 'uk'];

const en = JSON.parse(readFileSync(join(LOCALES_DIR, REFERENCE, 'common.json'), 'utf8'));

for (const locale of TARGETS) {
  const path = join(LOCALES_DIR, locale, 'common.json');
  const existing = JSON.parse(readFileSync(path, 'utf8'));
  const merged = deepMergeMissing(existing, en);
  writeFileSync(path, `${JSON.stringify(merged, null, 2)}\n`);
  console.log(`Synced missing keys: ${locale}/common.json`);
}

console.log('Run npm run check:locales to verify parity.');