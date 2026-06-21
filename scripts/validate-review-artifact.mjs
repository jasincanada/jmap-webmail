#!/usr/bin/env node
/**
 * Validates a release review artifact exists and shows SHIP CLEAR.
 * Usage: node scripts/validate-review-artifact.mjs 1.7.0
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib/dev-os-utils.mjs';

const version = process.argv[2]?.replace(/^v/, '');
if (!version) {
  console.error('Usage: validate-review-artifact.mjs <version>');
  process.exit(1);
}

const reviewsDir = join(ROOT, 'docs/reviews');
const suffix = `-v${version}-review.md`;
const match = readdirSync(reviewsDir).find((f) => f.endsWith(suffix));

if (!match) {
  console.error(`No review artifact matching *${suffix} in docs/reviews/`);
  console.error('Create one from docs/reviews/TEMPLATE.md before tagging.');
  process.exit(1);
}

const content = readFileSync(join(reviewsDir, match), 'utf8');
const required = [
  '## Specialist verdicts',
  '## Final verdict',
];

for (const section of required) {
  if (!content.includes(section)) {
    console.error(`Review artifact ${match} missing section: ${section}`);
    process.exit(1);
  }
}

if (!/SHIP CLEAR:\s*0/.test(content)) {
  console.error(`Review artifact ${match} does not contain "SHIP CLEAR: 0"`);
  process.exit(1);
}

if (/SHIP BLOCKED:\s*[1-9]/.test(content)) {
  console.error(`Review artifact ${match} contains SHIP BLOCKED with open issues`);
  process.exit(1);
}

console.log(`Review artifact OK: docs/reviews/${match}`);