# Development OS changelog

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