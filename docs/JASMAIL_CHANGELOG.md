# JasMail changelog (fork addon)

**JasMail** is a fork of [root-fr/jmap-webmail](https://github.com/root-fr/jmap-webmail) with mail dedupe and list enhancements. Upstream releases remain in the root [`CHANGELOG.md`](../CHANGELOG.md).

Format: newest first. Types: **Feature**, **Bug fix**, **Oversight**.

The matching **CLI** lives in the stack `dedupe/` directory (outside this repo). Webmail-only passes are listed here.

---

## 1.6.5 (2026-06-20)

Three review→fix cycles after v1.6.4. Highlights:

- Dedupe: auto-start race, account scan confirm on cold load, AbortError handling, invalid folder URL error, run-again double-start, account-wide progress banner
- List: `loadMoreEmails` stale-append guard; `getEmails` surfaces real errors
- JMAP moves: source mailbox removal on single/batch/thread moves; `Email/set` response validation; thread moves batched (500)
- Threads: chunked `getThreadEmails` with strict chunk validation; shared-folder `accountId` on conversation load; archive scoped per account
- Cleanup: removed dead `dedupeBusy` state in sidebar

---

## 1.6.4 (2026-06-20)

### Bug fixes (medium)

- **#13:** Folder remove clears only that mailbox's highlight banner (not stale duplicate count).
- **#14:** GroupCard copy button copies match key to clipboard with toast.
- **#15:** `startedRef` cleared on every `/dedupe` unmount so re-run works on same URL.
- **#16:** `mergeJMAPFilters` deduplicates identical conditions (e.g. duplicate `inMailbox`).
- **#17:** Account scan runs up to 3 folders in parallel.
- **#18:** List filter/sort/control strings translated in all 9 non-en locales.
- **#19:** Settings "Remove duplicates" shows confirmation before navigating.
- **M1:** Advanced search abort signal passed through `fetchEmails` → `getEmails` → `request()`.
- **M2:** Server list query uses date sort for subject/sender; client re-sorts thread groups.
- **M3:** Dedupe JMAP calls (`count`, `query`, `get`, `move`) honour abort `signal`.
- **N4:** Account-wide scan confirms when any eligible folder exceeds 10k messages.
- **N5:** Body criterion warning notes preview false-positive risk.
- **N6:** `scanned` stat reflects actual messages processed, not initial folder total.

---

## 1.6.3 (2026-06-21)

### Bug fixes (high)

- **H1:** Dedupe abort now resets operations store and `startedRef` — fixes stuck “Scanning” sidebar badge after navigate-away or cancel; guards against post-abort completion toasts.

---

## 1.6.2 (2026-06-21)

### Bug fixes (high)

- **#7/#8/N2:** Search, advanced search, and push refresh use the same `resolveMailboxListQuery` path as normal list fetch (list filter + sort merged).
- **#9:** Server-side subject/sender sort on JMAP queries; partial-sort hint when more pages remain.
- **#10:** `getEmailsForDedupe` namespaces `mailboxIds` on shared folders.
- **#11:** Folder scan no longer creates `dupes/` subfolders (`prepareDupesFolder` removed from scan path).
- **#12:** Cancel button and abort between batches on `/dedupe` operations.
- **N1:** “Run again” re-checks large-folder scan confirmation.

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