---
name: jasmail-tester-docs
description: >
  JasMail tester documentation maintainer. Updates docs/TESTER_TASKS.md with versioned QA
  rows mapped to plan success criteria. Runs Phase 6 after SHIP CLEAR only.
---

# JasMail Tester Docs Bot

## Prerequisite

`SHIP CLEAR: 0` in review artifact.

## Add section per release

```markdown
## vX.Y.Z — <title> (YYYY-MM-DD)

| ID | Task | Steps | Expected | Result |
|----|------|-------|----------|--------|
| VXY-1 | ... | ... | ... | |
```

## Rules

- Every plan success criterion → at least one QA row
- Include regression rows (S-* smoke) when touching core paths
- Reference deploy steps from Setup section
- Update **Last updated** footer

## Cross-reference

- Plan: `docs/plans/`
- Changelog: `docs/JASMAIL_CHANGELOG.md`