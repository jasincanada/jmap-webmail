# Review: vX.Y.Z

| Field | Value |
|-------|-------|
| Date | YYYY-MM-DD |
| Plan | docs/plans/….md or regression (dev-os proof) |
| Commits | `abc1234` … `def5678` |
| Orchestrator | jasmail-dev-os |
| Mode | maximum (Option C) |

## Specialist verdicts

| Reviewer | Verdict | Issues | Skipped? |
|----------|---------|--------|----------|
| jasmail-code-reviewer | SHIP CLEAR / BLOCKED | 0 | no |
| jasmail-security-reviewer | SHIP CLEAR / BLOCKED | 0 | no |
| jasmail-test-reviewer | SHIP CLEAR / BLOCKED | 0 | no |
| jasmail-plan-reviewer | SHIP CLEAR / BLOCKED | 0 | no |
| jasmail-a11y-reviewer | SHIP CLEAR / BLOCKED | 0 | no |
| jasmail-i18n-reviewer | SHIP CLEAR / BLOCKED | 0 | no |
| jasmail-stack-maintainer | SHIP CLEAR / BLOCKED | 0 | no |

## Merged findings

### Critical

(none)

### High

(none)

### Medium

(none)

### Low

(none)

## Build gates

| Gate | Result |
|------|--------|
| `npm run check:ship:maximum -- --version X.Y.Z` | pass |
| `npm run diff:scope` (maximum mode) | all 7 specialists |
| `docker compose build jasmail` | pass |

## Final verdict

**SHIP CLEAR: 0**