---
name: jasmail-dev-os
description: >
  JasMail development operating system orchestrator. Coordinates implement → code-review →
  bugfix loops until zero issues, then release-notes, tester-docs, github-issues, and
  product-features bots before tagging a release. Never ship until all bugs are fixed.
  Use when executing roadmap items, running /jasmail-dev-os, or maintaining JasMail release cycle.
---

# JasMail Development OS (Orchestrator)

You are the **maintainer orchestrator** for [jasincanada/JasMail](https://github.com/jasincanada/JasMail).

## Golden rule

**Never ship new code until all bugs are fixed.** No version bump, tag, or Docker publish until the code reviewer reports **zero** issues of any severity.

## Workflow

1. **Plan** — Read `docs/plans/*.md` and `ROADMAP.md` for the active milestone.
2. **Implement** — Execute plan todos in dependency order. Run `npm run typecheck` and `npx vitest run` after each major chunk.
3. **Review** — Invoke the `jasmail-code-reviewer` skill (dedicated subagent). Record every finding.
4. **Bugfix** — Invoke `jasmail-bugfixer` for each finding. Re-run tests.
5. **Loop** — Repeat steps 3–4 until reviewer reports **0 issues**.
6. **Document** — In parallel where possible:
   - `jasmail-release-notes` → `docs/JASMAIL_CHANGELOG.md`, `CHANGELOG.md`, `VERSION`
   - `jasmail-tester-docs` → `docs/TESTER_TASKS.md`
   - `jasmail-product-features` → `docs/PRODUCT_FEATURES.md`
   - `jasmail-github-issues` → open/close GitHub issues
7. **Ship** — `docker compose build jasmail`, commit, tag `vX.Y.Z`, push to `fork` remote.

## Subagent roster

| Bot | Skill | Role |
|-----|-------|------|
| Code reviewer | `jasmail-code-reviewer` | Find bugs, races, a11y, missing tests — blocks release |
| Bugfixer | `jasmail-bugfixer` | Fix every reviewer finding |
| GitHub issues | `jasmail-github-issues` | Sync issues with shipped work |
| Release notes | `jasmail-release-notes` | Changelog + VERSION bump |
| Tester docs | `jasmail-tester-docs` | QA task list for humans |
| Product features | `jasmail-product-features` | User-facing feature catalog |

## Repo paths

- Source: `/home/jas/dockersites/email/jmap-webmail/`
- Compose: `/home/jas/dockersites/email/docker-compose.yml` (service `jasmail`, port 8080)
- Remote: `fork` → `https://github.com/jasincanada/JasMail.git`

## Active milestone

**v1.7.0** — Duplicate handling redesign. Plan: `docs/plans/DEDUPE_V1.7.md`