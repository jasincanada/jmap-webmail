# Review artifacts

The `jasmail-dev-os` orchestrator writes merged specialist reviews here before any release tag.

| File | Purpose |
|------|---------|
| `TEMPLATE.md` | Review artifact template |
| `RETROSPECTIVE_TEMPLATE.md` | Post-release learning |
| `YYYY-MM-DD-vX.Y.Z-review.md` | Merged specialist review (required for tag) |
| `metrics.jsonl` | Per-release metrics (rounds, findings) |

**Naming:** `YYYY-MM-DD-vX.Y.Z-review.md`

**Ship rule:** `.husky/pre-push` runs `npm run ship:validate -- X.Y.Z` — tagging fails without `Final verdict: SHIP CLEAR: 0`.