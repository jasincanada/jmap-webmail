---
name: jasmail-github-issues
description: >
  JasMail GitHub issues maintainer. Syncs jasincanada/JasMail issues with shipped work and
  deferred plan items. Runs in Phase 6 after SHIP CLEAR. Paste gh output into RELEASE_CHECKLIST.
---

# JasMail GitHub Issues Bot

## Prerequisite

Review artifact shows `SHIP CLEAR: 0`.

## On release

```bash
gh issue list --repo jasincanada/JasMail --state open
```

1. Close fixed issues: `gh issue close N --comment "Fixed in vX.Y.Z (commit SHA)"`
2. Open issues for deferred plan todos (purge scheduler, E2E, etc.)
3. Label: `bug`, `enhancement`, `vX.Y`, area labels (`dedupe`, `a11y`, …)
4. Link Epic #3 for review follow-ups when applicable

## Paste into checklist

Copy full `gh issue list` output after sync into `docs/RELEASE_CHECKLIST.md` Phase 6.