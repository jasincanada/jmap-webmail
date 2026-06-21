# JasMail changelog (fork addon)

**JasMail** is a fork of [root-fr/jmap-webmail](https://github.com/root-fr/jmap-webmail) with mail dedupe and list enhancements. Upstream releases remain in the root [`CHANGELOG.md`](../CHANGELOG.md).

Format: newest first. Types: **Feature**, **Bug fix**, **Oversight**.

The matching **CLI** lives in the stack `dedupe/` directory (outside this repo). Webmail-only passes are listed here.

---

## 1.6.1 (2026-06-21)

### Bug fixes (critical)

- **C1:** Batched folder scan — process messages in pages; slim stored refs; hard cap 50k (CLI above that); confirm above 10k.
- **C2:** Remove never auto-starts on `/dedupe` — explicit confirmation for folder and account-wide remove.
- **C3:** Body criterion uses preview only in browser; blocked above 2,000 messages; settings warning.

---

## 1.6.0 (2026-06-21)

### Release

- **Rebrand** fork as **JasMail** (`jasincanada/JasMail`); Docker image `jasmail:local`, compose service `jasmail`.
- **Docs:** `docs/TESTER_TASKS.md` manual QA checklist; GitHub release and issue tracking on the fork.

### Features (passes 7–12, cumulative)

- **`/dedupe` operations page** — live progress, expandable groups, per-folder results, view in mailbox, run again.
- **List filter & sort** — unread/read/starred/attachments; date/subject/sender sort; dedicated control row; search merge; scroll pagination.
- **List header stats** — total, unread, duplicate, and matching counts.
- **Settings → Duplicates** — criteria toggles, match modes, account/folder scan entry points.
- **Sidebar dedupe** — scan/remove, highlights, `dupes/` child folder handling, badge counts.
- **Dedupe safety** — addon never bulk-writes `$seen`; unread filter is query-only.

See passes below for detailed fix history.

---

## 2026-06-20 (pass 12)

### Bug fixes

- List filter/sort controls restored — always clickable, own header row, labeled dropdowns.
- Filter/sort work during search (merged JMAP filters); pagination uses the same query path.

### Features

- **Read** list filter; filter options show short descriptions.

---

## 2026-06-20 (pass 11)

### Bug fixes

- Addon audit: dedupe, list filter/sort, and JMAP helpers never write `keywords/$seen`.

---

## 2026-06-20 (pass 10)

### Bug fixes

- List filter/sort during search/advanced-search; refresh keeps active search.
- Server-side sort limited to date; subject/sender client-side on thread groups.
- `createMailbox` JMAP ID fixes; list stats and persisted filter/sort validation.

---

## 2026-06-20 (pass 9)

### Features

- Email list **Filter** and **Sort** controls with JMAP refetch and persistence.
- List header **total / unread / duplicate** counts.

---

## 2026-06-20 (pass 8)

### Bug fixes

- `ensureDupesMailbox()` JMAP ID fixes; proactive `dupes/` creation; move paths use resolved IDs.

---

## 2026-06-20 (pass 7)

### Features

- `/dedupe` operations page; sidebar/settings scan redirects to operations view.

---

## 2026-06-20 (passes 4–6)

### Bug fixes

- Read-only folder guards; partial move recovery; logout clears highlights; list totals via `calculateTotal: true`.

---

## 2026-06-19 / pass 1–3

### Features

- Initial dedupe addon: settings, sidebar scan/remove, list highlights, `dupes/` folder moves, configurable criteria.

### Bug fixes

- Message-ID grouping, locale keys, build fixes, batch move verification, config sanitization.

---

## Maintenance

1. Append passes here when shipping addon changes.
2. Update [`TESTER_TASKS.md`](TESTER_TASKS.md) with matching QA rows.
3. File follow-ups on [JasMail Issues](https://github.com/jasincanada/JasMail/issues).