---
name: jasmail-tester-docs
description: >
  JasMail tester documentation maintainer. Updates docs/TESTER_TASKS.md with manual QA steps
  for each release. Use before tagging a release or when user asks for tester tasks.
---

# JasMail Tester Docs Bot

Maintain `docs/TESTER_TASKS.md` for human QA.

## v1.7 tester tasks (add section)

### Dedupe scan-first flow
- [ ] Sidebar → "Scan for duplicates" on a folder — scan completes, no messages moved
- [ ] Settings → "Scan account" — account scan, no auto-move
- [ ] After scan with duplicates → "Choose action…" picker appears
- [ ] `review_only` — completes with zero JMAP writes
- [ ] `move_to_dupes` — creates `dupes/` only on Apply, moves duplicates after confirm
- [ ] `delete_with_retention` — moves to `deleted/`, shows 90-day retention copy
- [ ] Old URL `?action=remove` redirects to scan + picker (no auto-remove)
- [ ] Cancel during scan — no partial writes

### Audit (API / Docker)
- [ ] With volume mounted, `/data/dedupe-audit.db` persists across container restart
- [ ] GET `/api/dedupe/runs/:id` returns progress after scan

### Regression
- [ ] Existing mail operations unaffected
- [ ] All automated tests pass

Format: checkbox list with expected results and failure notes column.