# Review: vX.Y.Z

| Field | Value |
|-------|-------|
| Date | YYYY-MM-DD |
| Plan | docs/plans/….md |
| Commits | `abc1234` … `def5678` |
| Orchestrator | jasmail-dev-os |

## Specialist verdicts

| Reviewer | Verdict | Issues | Skipped? |
|----------|---------|--------|----------|
| jasmail-code-reviewer | SHIP CLEAR / BLOCKED | 0 | no |
| jasmail-security-reviewer | SHIP CLEAR / BLOCKED | 0 | no |
| jasmail-test-reviewer | SHIP CLEAR / BLOCKED | 0 | no |
| jasmail-plan-reviewer | SHIP CLEAR / BLOCKED | 0 | no |
| jasmail-a11y-reviewer | SHIP CLEAR / BLOCKED / SKIPPED | 0 | UI unchanged |
| jasmail-i18n-reviewer | SHIP CLEAR / BLOCKED / SKIPPED | 0 | no strings |
| jasmail-stack-maintainer | SHIP CLEAR / BLOCKED / SKIPPED | 0 | no infra |

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
| `npx eslint . --max-warnings 0` | pass |
| `npm run typecheck` | pass |
| `npm run test` | pass (N tests) |
| `npm run check:locales` | pass |
| `npm run build` | pass |
| `docker compose build jasmail` | pass / skipped |

## Final verdict

**SHIP CLEAR: 0**

Tagging authorized: yes / no