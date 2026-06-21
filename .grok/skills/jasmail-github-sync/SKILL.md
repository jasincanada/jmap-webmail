---
name: jasmail-github-sync
description: >
  JasMail GitHub sync subagent. Commits and pushes safe work to jasincanada/JasMail
  (docs, plans, skills, gates, fixes with passing check:ship). Updates issues so
  tracker matches repo. Never tags releases without SHIP CLEAR. Use after work sessions,
  when user asks to sync/push GitHub, or when issues reference unpushed local files.
---

# JasMail GitHub Sync Bot

Keeps **fork** (`jasincanada/JasMail`) aligned with local work between formal releases. Complements `jasmail-github-issues` (issue hygiene at release) and `jasmail-dev-os` Phase 7 (tagged production ship).

## Golden rules

1. **Push `fork main`, never upstream `root-fr`.**
2. **Never `git tag`** — tagging requires full dev-os + review artifact (`jasmail-dev-os` Phase 7).
3. **Run `npm run check:ship`** before every push; abort if it fails.
4. **Do not push** broken WIP, secrets, or `.env` files.

## What to sync (safe without manual QA)

| Safe to push | Requires release cycle first |
|--------------|------------------------------|
| `docs/plans/`, `docs/DEV_OS*.md`, skills | Tagged `vX.Y.Z` releases |
| `.grok/skills/` | Large UI behavior changes (optional: note in issue) |
| `scripts/*-gate.mjs`, `vulnerability-scan.mjs` | Dedupe apply-path changes affecting live mail |
| Tests + lib fixes with passing unit tests | — |
| Locale sync (`locales:sync` output) | — |
| `lib/dedupe-config.ts` coercion/guardrails | — |

When unsure, push docs/skills/gates only; leave UI code for next `/jasmail-dev-os` round.

## Workflow

```bash
cd /home/jas/dockersites/email/jmap-webmail
git status -sb
git fetch fork
```

1. **Stage** logical groups (or one commit if session batch):
   - `docs:` plans, dev-os, reviews template
   - `dev-os:` skills, gates, vulnerability reviewer
   - `feat(dedupe):` UI/shell/limits when tests pass
   - `fix:` small lib fixes

2. **Verify**
   ```bash
   npm run check:ship
   npm run check:vulnerabilities   # warn-only moderate OK; must pass gate
   ```

3. **Commit** — complete sentences; reference issues `#24` `#25` when relevant.

4. **Push**
   ```bash
   git push fork main
   ```

5. **Issues** — invoke `jasmail-github-issues` lite pass:
   - Comment on planning issues when referenced files now exist on `main`
   - Open issue for deferred manual-QA items if needed
   ```bash
   gh issue list --repo jasincanada/JasMail --state open --limit 20
   ```

6. **Report** to operator:
   - Commits pushed (SHAs)
   - What remains local/uncommitted
   - What still needs manual testing or `/jasmail-dev-os` before tag

## When to auto-invoke

- End of a long agent session with uncommitted files
- User says: sync GitHub, push to fork, keep github up to date
- Planning issue body says "commit pending" for files that now exist locally

## When NOT to invoke

- Before `SHIP CLEAR` when user asked to **release/tag**
- When `check:ship` fails
- When `upstream:status --strict` reports `cve-pending` and change is unrelated docs-only (still OK for docs-only)

## Repo

- Path: `/home/jas/dockersites/email/jmap-webmail/`
- Remote: `fork` → `https://github.com/jasincanada/JasMail.git`