# Development OS changelog

## 2.3.0 (2026-06-20)

### GitHub sync subagent

- `jasmail-github-sync` — commit/push safe work to `fork` between releases; never tags
- Invoke after work sessions or when issues reference unpushed local files

### Vulnerability reviewer — don't ship like Windows 95

- `jasmail-vulnerability-reviewer` — 8th mandatory specialist (CVEs, secrets, supply chain)
- `scripts/vulnerability-scan.mjs` + `npm run check:vulnerabilities`
- `check:ship:maximum` includes `vulnerability-scan` step (blocks high/critical prod CVEs + secret patterns)
- `jasmail-security-reviewer` scoped to app logic; pairs with vulnerability reviewer every round
- Review artifact template + RELEASE_CHECKLIST updated for 8 specialists

## 2.2.0 (2026-06-20)

### Option C — Maximum Quality (binding policy)

- `docs/DEV_OS_POLICY.md` — solo-dev maximum quality policy
- `DEV_OS_MODE=maximum` — all 7 specialists on every release (no skips)
- `npm run check:ship:maximum` — build + dedupe suite + Playwright E2E + upstream CVE check
- `npm run upstream:triage` — weekly mandatory upstream review
- `upstream-status.mjs` — CVE detection, `--strict` blocks tags when CVE pending
- `e2e/dedupe-smoke.spec.ts` — dedupe route smoke tests
- Pre-push hook uses `--maximum` for tags
- CI main branch runs maximum gate; weekly `upstream-triage.yml` workflow
- CVE = same full pipeline as features (no fast lane)

## 2.1.0 (2026-06-20)

### Upstream merge workflow

- `jasmail-upstream-maintainer` skill — fetch, classify, merge, regression
- `docs/UPSTREAM_MERGE.md` + `docs/UPSTREAM_MERGE_CHECKLIST.md`
- `UPSTREAM_VERSION` baseline pin + `docs/upstream/MERGE_LOG.md`
- `docs/upstream/fork-only-paths.json` — conflict resolution manifest
- `scripts/upstream-status.mjs` — `npm run upstream:status`
- `diff-scope.mjs` — `UPSTREAM_MERGE=1` forces full specialist round
- Orchestrator Phase 0 upstream gate before feature milestones

## 2.0.0 (2026-06-20)

### Tooling & automation (A+)

- `scripts/ship-gate.mjs` — unified lint, typecheck, test, locales, optional build + review validation
- `scripts/validate-review-artifact.mjs` — mechanical SHIP CLEAR check
- `scripts/diff-scope.mjs` — deterministic conditional reviewer selection
- `scripts/sync-locales.mjs`, `scripts/record-review-metrics.mjs`
- `.husky/pre-push` — blocks tag push without review artifact + full gate
- `.github/workflows/ci.yml` — quick + full ship gate on main
- `npm run lint` fixed to `eslint . --max-warnings 0`

### Documentation (A+)

- `docs/DEV_OS.md` — hub with architecture diagram and script reference
- `docs/DEV_OS_MAINTENANCE.md` — skill upgrade playbook
- `.grok/skills/README.md` — skill index

### Maintainability & learning (A+)

- `DEV_OS_VERSION` file (semver for the OS itself)
- `docs/reviews/metrics.jsonl` — per-release learning metrics
- `docs/reviews/RETROSPECTIVE_TEMPLATE.md`
- `references/METRICS.md` — metrics schema

## 1.0.0 (2026-06-20)

- Initial 14-bot pipeline, RELEASE_CHECKLIST, review TEMPLATE, review-patterns.md
- `check:locales`, specialist reviewers, orchestrator SKILL