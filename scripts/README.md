# JasMail automation scripts

Used by the [Development OS](../docs/DEV_OS.md), Husky hooks, and CI.

| Script | npm command | Purpose |
|--------|-------------|---------|
| `ship-gate.mjs` | `npm run check:ship` | Quick gate; `--full` + build; `--maximum` + dedupe + E2E + CVE |
| `validate-review-artifact.mjs` | `npm run ship:validate -- X.Y.Z` | Requires `SHIP CLEAR: 0` in `docs/reviews/` |
| `diff-scope.mjs` | `npm run diff:scope` | JSON flags for conditional reviewers |
| `check-locales.mjs` | `npm run check:locales` | 10-locale key parity |
| `sync-locales.mjs` | `npm run locales:sync` | Copy missing keys from `en` |
| `record-review-metrics.mjs` | `npm run metrics:record --` | Append to `docs/reviews/metrics.jsonl` |
| `upstream-status.mjs` | `npm run upstream:status` | Fork vs upstream drift; `--strict` fails on CVE |
| | `npm run upstream:triage` | Weekly fetch + human report |
| `lib/dev-os-utils.mjs` | — | Shared helpers (not invoked directly) |

## Examples

```bash
npm run check:ship
npm run check:ship:maximum -- --version 1.8.0
npm run upstream:triage
npm run ship:validate -- 1.8.0
npm run diff:scope main
npm run metrics:record -- --version 1.8.0 --rounds 1 --findings 0
npm run upstream:status -- --fetch --human
UPSTREAM_MERGE=1 npm run diff:scope
```