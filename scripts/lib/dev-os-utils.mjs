import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export function run(cmd, opts = {}) {
  const { silent = false, cwd = ROOT } = opts;
  if (!silent) console.log(`→ ${cmd}`);
  return execSync(cmd, {
    cwd,
    stdio: silent ? 'pipe' : 'inherit',
    encoding: 'utf8',
  });
}

export function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function deepMergeMissing(target, source) {
  if (source === null || typeof source !== 'object' || Array.isArray(source)) {
    return target === undefined ? source : target;
  }
  const out = { ...(target && typeof target === 'object' && !Array.isArray(target) ? target : {}) };
  for (const [key, value] of Object.entries(source)) {
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      out[key] = deepMergeMissing(out[key], value);
    } else if (out[key] === undefined) {
      out[key] = value;
    }
  }
  return out;
}

export function git(args, { silent = true } = {}) {
  return execSync(`git ${args}`, { cwd: ROOT, encoding: 'utf8', stdio: silent ? 'pipe' : 'inherit' }).trim();
}

export function changedFiles(base = 'main') {
  try {
    const out = git(`diff --name-only ${base}...HEAD 2>/dev/null || git diff --name-only HEAD`);
    return out ? out.split('\n').filter(Boolean) : [];
  } catch {
    return git('diff --name-only HEAD').split('\n').filter(Boolean);
  }
}

export function loadDevOsVersion() {
  const path = join(ROOT, '.grok/skills/jasmail-dev-os/DEV_OS_VERSION');
  return existsSync(path) ? readFileSync(path, 'utf8').trim() : 'unknown';
}