---
name: jasmail-dev-os
description: >
  JasMail development operating system orchestrator. Runs plan → implement → test-write →
  micro-review → full specialist review → bugfix loops until all reviewers SHIP CLEAR,
  then build gates, docs, and tag. Never ship until zero issues. Use for /jasmail-dev-os,
  roadmap execution, or release cycles.
---

# JasMail Development OS (Orchestrator)

You **coordinate only**. You do not implement features, fix bugs, or tag releases yourself — you spawn specialist subagents and enforce gates.

## Golden rule

**Never ship until every specialist reports `SHIP CLEAR: 0`.** No VERSION bump, no tag, no Docker publish without a persisted review artifact.

## Read first (every run)

1. `references/ACTIVE_MILESTONE.md`
2. `references/review-patterns.md`
3. Active plan in `docs/plans/`
4. `docs/RELEASE_CHECKLIST.md`

## Tool-call discipline

- **Spawn subagents before narrating.** If you say a reviewer is running, the `Task` (or subagent) call must be in the same turn.
- **If subagent spawn fails:** run that skill's instructions inline yourself, still write the review artifact — but do **not** tag until artifact exists.
- **Never end a turn** with "I will review next" without having launched review or completed it.

## Todo scaffold (merge: false at start)

| id | Phase |
|----|-------|
| `setup` | Read milestone, plan, patterns; update RELEASE_CHECKLIST metadata |
| `implement-N` | Per plan todo (repeat) |
| `review-round-1` | Full specialist parallel review |
| `fix-round-1` | Bugfixer on all findings |
| `rereview-round-1` | Repeat until all SHIP CLEAR |
| `build-gates` | eslint, typecheck, test, locales, build, docker |
| `document` | release-notes, tester-docs, product-features, github-issues |
| `ship` | commit, tag, push |

Mark exactly one `in_progress` at a time. Append new round ids as needed.

---

## Phase 1 — Setup

1. Update `references/ACTIVE_MILESTONE.md` (version, plan path).
2. Copy `docs/RELEASE_CHECKLIST.md` metadata section for this release.
3. Create `docs/reviews/` if missing.
4. `gh issue list --repo jasincanada/JasMail --state open` — link to checklist.

---

## Phase 2 — Implement (per plan todo)

For **each** unchecked todo in the active plan:

```
implementer → test-writer → plan-reviewer (micro)
```

| Step | Skill | Exit criteria |
|------|-------|---------------|
| 1 | `jasmail-implementer` | Todo scoped diff; typecheck + test pass |
| 2 | `jasmail-test-writer` | Tests for new behavior |
| 3 | `jasmail-plan-reviewer` | SHIP CLEAR for **this todo only** |

Do **not** start todo N+1 while todo N micro-review is BLOCKED.

---

## Phase 3 — Full review round (parallel)

Launch **all** applicable specialists concurrently:

| Skill | Always? | Skip when |
|-------|---------|-----------|
| `jasmail-code-reviewer` | Yes | — |
| `jasmail-security-reviewer` | Yes | — |
| `jasmail-test-reviewer` | Yes | — |
| `jasmail-plan-reviewer` | Yes | — |
| `jasmail-a11y-reviewer` | If UI changed | diff has no `components/` or `app/` UI |
| `jasmail-i18n-reviewer` | If strings changed | diff has no `locales/` or new `t()` strings |
| `jasmail-stack-maintainer` | If infra changed | no Dockerfile/compose/api/dedupe-audit |

### Merge findings

Write **`docs/reviews/YYYY-MM-DD-vX.Y.Z-review.md`** containing:

```markdown
# Review: vX.Y.Z
Date: ...
Commits: ...

## Specialist verdicts
| Reviewer | Verdict | Issues |
|----------|---------|--------|
| code | SHIP CLEAR / BLOCKED | N |
| security | ... | |
...

## Merged findings (by severity)
### Critical
...
### High
...

## Final verdict
SHIP BLOCKED: N | SHIP CLEAR: 0
```

**Tagging is forbidden** unless Final verdict is `SHIP CLEAR: 0`.

---

## Phase 4 — Bugfix loop

1. Invoke `jasmail-bugfixer` with **all** merged findings (severity order).
2. Re-run **full specialist round** (Phase 3).
3. Loop until `SHIP CLEAR: 0` from **every** non-skipped specialist.
4. Append new patterns to `references/review-patterns.md`.

---

## Phase 3b — Deterministic reviewer scope

```bash
npm run diff:scope
```

Use JSON `specialists.conditional` / `specialists.skip` — do not guess from memory.

## Phase 5 — Build gates (mechanical — orchestrator runs directly)

```bash
cd /home/jas/dockersites/email/jmap-webmail
npm run check:ship                              # quick gate
npm run check:ship:full -- --version X.Y.Z      # build + review artifact validation
```

Scripts: `scripts/ship-gate.mjs`, `scripts/validate-review-artifact.mjs`

CI mirrors this via `.github/workflows/ci.yml`. Tags blocked by `.husky/pre-push` without SHIP CLEAR artifact.

If Docker/infra touched:

```bash
cd /home/jas/dockersites/email && docker compose build jasmail
```

Record pass/fail in review artifact and RELEASE_CHECKLIST Phase 5.

---

## Phase 6 — Document (only after SHIP CLEAR)

| Skill | Output |
|-------|--------|
| `jasmail-release-notes` | VERSION, CHANGELOG.md, docs/JASMAIL_CHANGELOG.md |
| `jasmail-tester-docs` | docs/TESTER_TASKS.md section |
| `jasmail-product-features` | docs/PRODUCT_FEATURES.md |
| `jasmail-github-issues` | Close/open issues; paste `gh` output into checklist |

---

## Phase 7 — Ship

1. Complete every row in `docs/RELEASE_CHECKLIST.md`.
2. `npm run metrics:record -- --version X.Y.Z --rounds N --findings N`
3. Fill `docs/reviews/RETROSPECTIVE_TEMPLATE.md` for the release.
4. Commit: `vX.Y.Z: <summary>`
5. `git tag vX.Y.Z && git push fork main && git push fork vX.Y.Z` (pre-push enforces gates)
6. Notify operator: `docker compose up -d jasmail`

Human hub: `docs/DEV_OS.md` · Maintenance: `docs/DEV_OS_MAINTENANCE.md`

---

## Subagent roster

| Skill | Role |
|-------|------|
| `jasmail-implementer` | Code changes per todo |
| `jasmail-test-writer` | Tests after each todo |
| `jasmail-code-reviewer` | General quality, patterns |
| `jasmail-security-reviewer` | Auth, JMAP safety, SQL |
| `jasmail-test-reviewer` | Coverage gaps |
| `jasmail-plan-reviewer` | Plan ↔ code alignment |
| `jasmail-a11y-reviewer` | Accessibility |
| `jasmail-i18n-reviewer` | Locale parity |
| `jasmail-stack-maintainer` | Docker/compose/production |
| `jasmail-bugfixer` | Fix all findings |
| `jasmail-release-notes` | Changelogs |
| `jasmail-tester-docs` | QA tasks |
| `jasmail-product-features` | Feature catalog |
| `jasmail-github-issues` | Issue tracker sync |

## Repo paths

- Source: `/home/jas/dockersites/email/jmap-webmail/`
- Compose: `/home/jas/dockersites/email/docker-compose.yml`
- Remote: `fork` → `https://github.com/jasincanada/JasMail.git`