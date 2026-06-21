# JasMail release checklist (Option C — Maximum Quality)

**Do not tag or publish until every required row is checked.** Policy: [DEV_OS_POLICY.md](DEV_OS_POLICY.md). The orchestrator (`jasmail-dev-os`) fills this file per release.

## Release metadata

| Field | Value |
|-------|-------|
| Version | |
| Plan | |
| Review artifact | `docs/reviews/YYYY-MM-DD-vX.Y.Z-review.md` |
| Orchestrator commit | |
| Date | |

---

## Phase 1 — Plan

- [ ] `ACTIVE_MILESTONE.md` updated with version + plan path
- [ ] Plan todos have dependency order documented
- [ ] GitHub issues opened/linked for deferred scope

## Phase 2 — Implement (per plan todo)

For each todo:

- [ ] `jasmail-implementer` completed todo
- [ ] `jasmail-test-writer` added/updated tests for todo
- [ ] `npm run typecheck` pass
- [ ] `npm run test` pass
- [ ] Micro-review: `jasmail-plan-reviewer` — 0 issues for this todo

## Phase 0 — Upstream gate

- [ ] `npm run upstream:triage` — no `cve-pending` status
- [ ] If upstream ahead: merged, cherry-picked, or deferred with `MERGE_LOG` entry

## Phase 3 — Full review round (all 7 specialists — no skips)

- [ ] `jasmail-code-reviewer` — SHIP CLEAR
- [ ] `jasmail-security-reviewer` — SHIP CLEAR
- [ ] `jasmail-test-reviewer` — SHIP CLEAR
- [ ] `jasmail-plan-reviewer` — SHIP CLEAR
- [ ] `jasmail-a11y-reviewer` — SHIP CLEAR
- [ ] `jasmail-i18n-reviewer` — SHIP CLEAR
- [ ] `jasmail-stack-maintainer` — SHIP CLEAR

Review artifact written with merged findings and final verdict.

## Phase 4 — Bugfix loop

- [ ] `jasmail-bugfixer` fixed **all** findings
- [ ] Re-run full specialist review round until **all** SHIP CLEAR
- [ ] `review-patterns.md` updated with any new recurring patterns

## Phase 5 — Build gates (maximum)

- [ ] `npm run check:ship:maximum -- --version X.Y.Z` (build + dedupe + E2E + CVE check + review artifact)
- [ ] `npm run diff:scope` logged in review artifact (maximum mode = all specialists)
- [ ] `docker compose build jasmail` (every release)

## Phase 6 — Document & track

- [ ] `jasmail-release-notes` — VERSION, CHANGELOG.md, docs/JASMAIL_CHANGELOG.md
- [ ] `jasmail-tester-docs` — docs/TESTER_TASKS.md section for this version
- [ ] `jasmail-product-features` — docs/PRODUCT_FEATURES.md
- [ ] `jasmail-github-issues` — close fixed, open deferred (paste `gh` output)

## Phase 7 — Ship

- [ ] `npm run metrics:record -- --version X.Y.Z --rounds N --findings N`
- [ ] Retrospective from `docs/reviews/RETROSPECTIVE_TEMPLATE.md` completed
- [ ] Single release commit message: `vX.Y.Z: <summary>`
- [ ] Tag `vX.Y.Z` on release commit (pre-push hook validates artifact + full gate)
- [ ] `git push fork main && git push fork vX.Y.Z`
- [ ] `docker compose up -d jasmail` (stack operator)

---

## Sign-off

| Role | Verdict | Date |
|------|---------|------|
| Orchestrator | | |
| Code reviewer | SHIP CLEAR / BLOCKED | |
| Security reviewer | SHIP CLEAR / BLOCKED | |
| All specialists | SHIP CLEAR / BLOCKED | |