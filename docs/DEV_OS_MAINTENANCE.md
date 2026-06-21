# Maintaining the JasMail Development OS

## When to update

| Trigger | Action |
|---------|--------|
| New release shipped | Append `review-patterns.md`; record `metrics.jsonl`; fill retrospective |
| New defect class found | Add row to `review-patterns.md` with prevention owner |
| New milestone | Update `ACTIVE_MILESTONE.md` + plan in `docs/plans/` |
| New specialist needed | Add `.grok/skills/jasmail-<name>/SKILL.md`; update skill README + orchestrator roster |
| Upstream release merged | Update `UPSTREAM_VERSION` + `docs/upstream/MERGE_LOG.md` |
| Gate command changes | Update `scripts/ship-gate.mjs` + `DEV_OS.md` + CI workflow |
| Breaking OS change | Bump `DEV_OS_VERSION`; entry in `DEV_OS_CHANGELOG.md` |

## Skill file conventions

```
.grok/skills/jasmail-<role>/
  SKILL.md          # Required: frontmatter name + description + body
```

**Frontmatter `description` must include:** what it does, when to auto-invoke, trigger phrases.

## Review patterns format

Add to `.grok/skills/jasmail-dev-os/references/review-patterns.md`:

```markdown
| **Pattern name** | Symptom | Prevention | First seen |
```

Prevention must name a **specific reviewer or script**.

## Metrics loop

After each release:

```bash
npm run metrics:record -- --version X.Y.Z --rounds 2 --findings 5 \
  --artifact docs/reviews/2026-06-20-vX.Y.Z-review.md
```

Analyze trends in `docs/reviews/metrics.jsonl` (rounds ↓ = OS improving).

## Locale workflow

```bash
# After adding keys to locales/en/common.json
npm run locales:sync
npm run check:locales
```

## Testing OS changes

1. Run `npm run check:ship` and `npm run check:ship:full`
2. Run `node scripts/diff-scope.mjs` on a sample branch
3. Create fake review artifact from TEMPLATE; run `npm run ship:validate -- X.Y.Z`
4. Verify CI workflow locally with `act` (optional)

## Versioning

- **DEV_OS_VERSION** in `.grok/skills/jasmail-dev-os/DEV_OS_VERSION`
- App semver (VERSION) is independent
- OS 2.x = mechanical gates + CI + metrics