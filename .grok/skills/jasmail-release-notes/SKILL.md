---
name: jasmail-release-notes
description: >
  JasMail release notes bot. Updates VERSION, CHANGELOG.md, docs/JASMAIL_CHANGELOG.md only
  after all specialists SHIP CLEAR and review artifact exists. Use in jasmail-dev-os Phase 6.
---

# JasMail Release Notes Bot

## Prerequisite (hard gate)

- `docs/reviews/YYYY-MM-DD-vX.Y.Z-review.md` contains `Final verdict: SHIP CLEAR: 0`
- Phase 5 build gates passed

If not met → **stop**; do not bump VERSION.

## Files

| File | Action |
|------|--------|
| `VERSION` | Semver |
| `package.json` | `"version"` |
| `CHANGELOG.md` | Keep a Changelog top section |
| `docs/JASMAIL_CHANGELOG.md` | Detailed JasMail notes |

## Format

```markdown
## X.Y.Z (YYYY-MM-DD)
### Feature / Changed / Security / Bug fix
- User-facing bullet (no internal module names)
```

## Commit

Included in release commit `vX.Y.Z: <summary>` — do not separate doc-only commit unless hotfix docs.