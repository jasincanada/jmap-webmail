# Review metrics schema

**File:** `docs/reviews/metrics.jsonl` (one JSON object per line)

## Record after each release

```bash
npm run metrics:record -- --version X.Y.Z --rounds 2 --findings 5
```

## Fields

| Field | Type | Description |
|-------|------|-------------|
| `version` | string | App semver released |
| `date` | string | ISO date |
| `devOsVersion` | string | From `DEV_OS_VERSION` |
| `reviewRounds` | number | Specialist rounds until SHIP CLEAR |
| `totalFindings` | number | Issues found across all rounds |
| `artifact` | string | Path to review markdown |
| `tests` | string | Test count at ship (optional) |

## Goals (learning)

| Metric | Target |
|--------|--------|
| `reviewRounds` | → 1 over time |
| `totalFindings` | → 0 at first round |
| Repeat patterns in `review-patterns.md` | → 0 per release |

## Analysis

```bash
cat docs/reviews/metrics.jsonl | jq -s '.'
```