---
name: jasmail-github-issues
description: >
  JasMail GitHub issues maintainer bot. Opens, updates, and closes issues on jasincanada/JasMail
  to match shipped work and roadmap. Use before release or when syncing issue tracker.
---

# JasMail GitHub Issues Bot

Maintain [jasincanada/JasMail issues](https://github.com/jasincanada/JasMail/issues).

## On release

1. Close issues fixed in the release (reference commit/tag in comment)
2. Open new issues for deferred items or known regressions
3. Label: `bug`, `enhancement`, `v1.7`, `dedupe` as appropriate

## v1.7 expected closures

- Duplicate auto-remove retired (design change)
- Any dedupe-related open bugs fixed in v1.7

## Commands

```bash
gh issue list --repo jasincanada/JasMail --state open
gh issue close N --comment "Fixed in v1.7.0"
gh issue create --repo jasincanada/JasMail --title "..." --body "..."
```

Use `fork` remote context; repo is `jasincanada/JasMail`.