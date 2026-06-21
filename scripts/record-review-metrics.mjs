#!/usr/bin/env node
/**
 * Appends release metrics to docs/reviews/metrics.jsonl for learning loops.
 * Usage: node scripts/record-review-metrics.mjs --version 1.7.0 --rounds 2 --findings 3
 */
import { appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, loadDevOsVersion } from './lib/dev-os-utils.mjs';

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : null;
}

const version = arg('version')?.replace(/^v/, '');
if (!version) {
  console.error('Usage: record-review-metrics.mjs --version X.Y.Z [--rounds N] [--findings N] [--artifact path]');
  process.exit(1);
}

const metricsPath = join(ROOT, 'docs/reviews/metrics.jsonl');
if (!existsSync(join(ROOT, 'docs/reviews'))) {
  mkdirSync(join(ROOT, 'docs/reviews'), { recursive: true });
}

const entry = {
  version,
  date: new Date().toISOString().slice(0, 10),
  devOsVersion: loadDevOsVersion(),
  reviewRounds: Number(arg('rounds') || '1'),
  totalFindings: Number(arg('findings') || '0'),
  artifact: arg('artifact') || `docs/reviews/*-v${version}-review.md`,
  tests: arg('tests') || null,
};

appendFileSync(metricsPath, `${JSON.stringify(entry)}\n`);
console.log(`Recorded metrics: ${JSON.stringify(entry)}`);