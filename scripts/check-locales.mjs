#!/usr/bin/env node
/**
 * Verifies all locale files have the same nested key structure as en/common.json.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LOCALES_DIR = join(ROOT, 'locales');
const REFERENCE = 'en';
const REQUIRED_LOCALES = ['de', 'en', 'es', 'fr', 'it', 'ja', 'nl', 'pt', 'ru', 'uk'];

function flattenKeys(obj, prefix = '') {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    return prefix ? [prefix] : [];
  }
  const keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...flattenKeys(value, path));
    } else {
      keys.push(path);
    }
  }
  return keys.sort();
}

function loadLocaleKeys(locale) {
  const file = join(LOCALES_DIR, locale, 'common.json');
  const data = JSON.parse(readFileSync(file, 'utf8'));
  return new Set(flattenKeys(data));
}

const present = readdirSync(LOCALES_DIR).filter((name) => REQUIRED_LOCALES.includes(name));
const missingLocales = REQUIRED_LOCALES.filter((l) => !present.includes(l));
if (missingLocales.length > 0) {
  console.error('Missing locale directories:', missingLocales.join(', '));
  process.exit(1);
}

const referenceKeys = loadLocaleKeys(REFERENCE);
let failed = false;

for (const locale of REQUIRED_LOCALES) {
  if (locale === REFERENCE) continue;
  const keys = loadLocaleKeys(locale);
  const missing = [...referenceKeys].filter((k) => !keys.has(k));
  const extra = [...keys].filter((k) => !referenceKeys.has(k));

  if (missing.length > 0 || extra.length > 0) {
    failed = true;
    console.error(`\n[${locale}]`);
    if (missing.length > 0) {
      console.error(`  Missing ${missing.length} key(s):`);
      missing.slice(0, 20).forEach((k) => console.error(`    - ${k}`));
      if (missing.length > 20) console.error(`    ... and ${missing.length - 20} more`);
    }
    if (extra.length > 0) {
      console.error(`  Extra ${extra.length} key(s):`);
      extra.slice(0, 10).forEach((k) => console.error(`    + ${k}`));
      if (extra.length > 10) console.error(`    ... and ${extra.length - 10} more`);
    }
  }
}

if (failed) {
  console.error('\nLocale check FAILED. Sync keys from locales/en/common.json.');
  process.exit(1);
}

console.log(
  `Locale check OK: ${REQUIRED_LOCALES.length} locales match ${REFERENCE} (${referenceKeys.size} keys).`,
);