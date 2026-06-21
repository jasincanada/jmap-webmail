---
name: jasmail-release-notes
description: >
  JasMail release notes subagent. Updates VERSION, CHANGELOG.md, docs/JASMAIL_CHANGELOG.md
  with user-facing release notes for each shipped version. Use only after reviewer clears ship.
---

# JasMail Release Notes Bot

Update release artifacts **only after** code reviewer reports `SHIP CLEAR: 0 issues`.

## Files

| File | Purpose |
|------|---------|
| `VERSION` | Semver string |
| `package.json` | `"version"` field |
| `CHANGELOG.md` | Keep a Changelog format |
| `docs/JASMAIL_CHANGELOG.md` | JasMail-specific detailed notes |

## v1.7.0 template

```markdown
## [1.7.0] - YYYY-MM-DD

### Changed
- Duplicate handling is scan-first: no automatic mailbox writes until user chooses an action and confirms
- Removed one-click "Remove duplicates" entry points; action picker replaces auto-move to dupes/

### Added
- Dedupe action framework (review_only, move_to_folder, move_to_dupes, trash, archive, delete_with_retention)
- Server-side SQLite audit trail (`/api/dedupe/`) with progress and message-level change log
- `deleted/` subfolder with 90-day retention before permanent purge

### Security
- Non-destructive by default; tiered confirmation for write actions
```

## Commit message

`v1.7.0: scan-first dedupe, SQLite audit, deleted/ retention`