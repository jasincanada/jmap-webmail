# Upstream merge checklist (Option C — Maximum Quality)

**No merge to `main`, no tag, until every required row is checked.**

## Merge metadata

| Field | Value |
|-------|-------|
| Your decision | merge / cherry-pick / defer |
| Decision rationale | |
| Upstream version | |
| JasMail version (if tagging) | |
| Merge branch | `upstream/merge-vX.Y.Z` |
| Review artifact | `docs/reviews/YYYY-MM-DD-upstream-vX.Y.Z-merge.md` |
| Date | |

---

## Phase 1 — Triage (you)

- [ ] `npm run upstream:triage` — upstream commits reviewed by **you**
- [ ] Decision recorded: merge / cherry-pick / defer
- [ ] If **defer**: `docs/upstream/MERGE_LOG.md` row with reason + next review date
- [ ] If **CVE**: defer forbidden without explicit risk note in MERGE_LOG
- [ ] Working tree clean on `main`

## Phase 2 — Merge

- [ ] Branch `upstream/merge-vX.Y.Z` from `main`
- [ ] `git merge origin/main` or `git cherry-pick <sha>`
- [ ] Conflicts classified via `docs/upstream/fork-only-paths.json`
- [ ] Fork-only paths preserved (dedupe, dev OS, JasMail docs)
- [ ] Shared hotspots manually merged
- [ ] `CHANGELOG.md` / lockfile / locales reconciled
- [ ] `npm run locales:sync` if `locales/en` changed

## Phase 3 — Maximum gates

- [ ] `npm run check:ship:maximum` pass (includes dedupe suite + E2E + CVE check)
- [ ] `docker compose build jasmail` pass
- [ ] `UPSTREAM_MERGE=1 npm run diff:scope` logged in artifact

## Phase 4 — Full review (8 specialists — no skips)

- [ ] `jasmail-upstream-maintainer` — SHIP CLEAR
- [ ] `jasmail-code-reviewer` — SHIP CLEAR
- [ ] `jasmail-security-reviewer` — SHIP CLEAR
- [ ] `jasmail-test-reviewer` — SHIP CLEAR
- [ ] `jasmail-plan-reviewer` — SHIP CLEAR
- [ ] `jasmail-a11y-reviewer` — SHIP CLEAR
- [ ] `jasmail-i18n-reviewer` — SHIP CLEAR
- [ ] `jasmail-stack-maintainer` — SHIP CLEAR
- [ ] Review artifact: `SHIP CLEAR: 0`
- [ ] `jasmail-bugfixer` loop complete if any BLOCKED

## Phase 5 — Pin & ship

- [ ] `UPSTREAM_VERSION` updated
- [ ] `docs/upstream/MERGE_LOG.md` entry appended
- [ ] `jasmail-release-notes` if tagging
- [ ] `jasmail-tester-docs` — upstream-impacted QA steps
- [ ] `npm run check:ship:maximum -- --version X.Y.Z` pass
- [ ] `git push fork main` (+ tag if releasing)

## Conflict log

| File | Category | Resolution |
|------|----------|------------|
| | fork-only / shared-hotspot / upstream-owned | ours / theirs / manual |