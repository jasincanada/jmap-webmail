# Human tester tasks — mail dedupe & webmail addon

Manual QA checklist for **JasMail** (Stalwart + JMAP webmail + dedupe stack). Use this after deploys or before release sign-off.

**Tracking:** Code review follow-ups live in [Epic #3](https://github.com/jasincanada/JasMail/issues/3) on this fork. Upstream mirror: [root-fr/jmap-webmail#97](https://github.com/root-fr/jmap-webmail/issues/97).

**Scope:** addon features and bug fixes (JasMail webmail + stack CLI). Pass history: [`JASMAIL_CHANGELOG.md`](JASMAIL_CHANGELOG.md). Core upstream webmail behaviour is only covered where our addon touches it.

**How to use**

1. Deploy the stack (see [Setup](#setup)).
2. Work top to bottom, or jump to the section matching the change under test.
3. Mark each row: **Pass**, **Fail**, or **Skip** (with reason).
4. On **Fail**, note steps, expected vs actual, browser, and account used in [Reporting](#reporting-failures).
5. When developers add a changelog pass, append matching rows here (same pass number).

---

## Setup

| Step | Action |
|------|--------|
| 1 | `cd /home/jas/dockersites/email` |
| 2 | `docker compose build jasmail && docker compose up -d jasmail` |
| 3 | Open webmail (default compose port **8080** unless overridden) |
| 4 | Hard-refresh after deploy: **Ctrl+Shift+R** (or clear site cache) |
| 5 | Log in with a test account that has **many messages** (e.g. All Mail 100k+) and some **known duplicates** in at least one folder |

**Suggested test account:** `jas@cryptocomputing.ca` (or equivalent staging user).

**CLI (optional):** `docker compose --profile tools run --rm mail-dedupe --help`

---

## Quick smoke

| ID | Task | Steps | Expected | Result |
|----|------|-------|----------|--------|
| S-1 | Login | Open webmail, sign in | Inbox/list loads without console errors | |
| S-2 | Mailbox switch | Open **All Mail** (or large folder) | List populates; header shows conversation count | |
| S-3 | Open message | Click one email | Viewer opens; message body loads | |
| S-4 | Settings → Duplicates | Settings → **Duplicates** tab | Criteria toggles visible; no missing translation keys | |
| S-5 | Dedupe route | Navigate to **`/dedupe`** | Operations page loads (idle or last run state) | |

---

## Email list — filter & sort (pass 9–12)

Controls sit on a **second row** under the conversation title (labeled buttons, not icon-only).

| ID | Task | Steps | Expected | Result |
|----|------|-------|----------|--------|
| L-1 | Filter button clickable | Click **Filter** (shows current value, e.g. “All mail”) | Dropdown opens above list; options have titles + short descriptions | |
| L-2 | Unread filter | Filter → **Unread** | List refetches; only unread threads; header shows **matching** count | |
| L-3 | Read filter | Filter → **Read** (pass 12) | Only read messages; count updates | |
| L-4 | Starred filter | Filter → **Starred** | Only flagged/starred messages | |
| L-5 | Attachments filter | Filter → **Has attachment** | Only messages with attachments | |
| L-6 | All mail reset | Filter → **All mail** | Full folder list returns | |
| L-7 | Sort button clickable | Click **Sort** | Menu opens with 6 options | |
| L-8 | Newest / oldest | Sort → **Newest first**, then **Oldest first** | Order changes (by conversation date) | |
| L-9 | Subject sort | Sort → **Subject A–Z** / **Z–A** | Threads reorder by subject (client-side) | |
| L-10 | Sender sort | Sort → **Sender A–Z** / **Z–A** | Threads reorder by sender (client-side) | |
| L-11 | Persistence | Set filter **Unread** + sort **Oldest first**, reload page | Same filter/sort restored; list matches | |
| L-12 | Scroll pagination | With filter active, scroll to load more | Additional pages respect active filter/sort (pass 12) | |
| L-13 | No overlap | Narrow list pane (tablet width) | Filter/sort row remains clickable; not hidden under title | |

### Filter/sort + search (pass 10–12)

| ID | Task | Steps | Expected | Result |
|----|------|-------|----------|--------|
| L-14 | Search + filter | Sidebar search for a term; set Filter → **Unread** | Controls stay enabled; hint “Also applies to search results”; results are unread ∩ search | |
| L-15 | Advanced search | Open advanced search, set e.g. **Has attachment**; use list Filter | List filter/sort still work; refresh keeps search + list filter | |
| L-16 | Refresh during search | With active search, trigger refresh (Shift+G or reload) | Search results return (not replaced by unfiltered mailbox only) (pass 10) | |

---

## Email list — stats & header (pass 5–9)

| ID | Task | Steps | Expected | Result |
|----|------|-------|----------|--------|
| H-1 | Total count | Open folder with many messages | Subtitle shows **total emails** (compact `1.2k` style when large) | |
| H-2 | Unread count | Same folder | **Unread** count shown (from mailbox metadata) | |
| H-3 | Duplicates count | Folder with known dupes (after scan) | **Duplicates** count shown; amber when &gt; 0 | |
| H-4 | Matching count | Filter → anything except All mail | **Matching** count appears next to total | |
| H-5 | Conversation total | Large folder, partial load | Title shows `X of Y conversations` or `X+` when more to load | |

---

## Unread status — addon safety (pass 11)

**Goal:** Addon code must not bulk-change read/unread. (Core webmail may still mark read when opening a message — that is upstream behaviour.)

| ID | Task | Steps | Expected | Result |
|----|------|-------|----------|--------|
| U-1 | Baseline unread | Note unread count in folder | Record number | |
| U-2 | Folder dedupe scan | Right-click folder → **Scan for duplicates**; wait for finish | Unread count unchanged (no mass mark-read) | |
| U-3 | Account dedupe scan | Settings → Duplicates → account **Scan** (or `/dedupe` scan) | Unread count unchanged | |
| U-4 | List filter unread | Filter → **Unread** only | Query only; does not mark messages read | |
| U-5 | Move duplicates | **Remove duplicates** on a folder with known dupes (dry run first if unsure) | Dupes move to `dupes/`; unread status of untouched messages unchanged | |
| U-6 | CLI dry-run | `docker compose --profile tools run --rm mail-dedupe --dry-run …` (see CLI README) | No `$seen` / read flag changes on server | |

---

## Dedupe — settings & config (pass 2–4, 19)

| ID | Task | Steps | Expected | Result |
|----|------|-------|----------|--------|
| D-1 | Criteria toggles | Enable/disable Message-ID, subject, from, etc. | Saves; persists after reload | |
| D-2 | Match mode | Switch **Message-ID first** ↔ **All enabled** | Persists; affects scan results | |
| D-3 | Invalid persisted config | (Dev) corrupt localStorage dedupe config if possible | App falls back to safe defaults | |
| D-4 | Read-only folder | Scan folder without remove rights | Dedupe actions disabled or clear error (pass 4) | |

---

## Dedupe — sidebar & folder context (pass 5–8, 19)

| ID | Task | Steps | Expected | Result |
|----|------|-------|----------|--------|
| D-10 | Folder badge | After scan, folder with dupes | Sidebar shows duplicate badge/count | |
| D-11 | Scan feedback | **Scan for duplicates** on folder | Toast/spinner/banner while scanning; list highlights update after | |
| D-12 | List highlights | After scan, view folder in list | Colored stripes: keeper vs duplicate; banner if more rows off-screen | |
| D-13 | `dupes/` creation | Scan folder with duplicates (not dry-run) | Child folder **`dupes/`** appears under that folder (pass 8) | |
| D-14 | Remove without scan | **Remove duplicates** without prior scan | Confirmation warns; safe move only | |
| D-15 | Remove after scan | **Remove duplicates** after scan | Moves extras to `dupes/`; keeper stays; counts refresh | |
| D-16 | Remove failure recovery | (If testable) interrupt or force partial failure | Highlights cleared; mailboxes/list refresh; no stuck UI (pass 4) | |
| D-17 | Logout | Scan folder, then logout/login | Dedupe highlights cleared (pass 6) | |
| D-18 | Trash/junk/dupes | Try scan on Trash, Junk, `dupes/` | Skipped or disabled | |

---

## Dedupe — operations page `/dedupe` (pass 7)

| ID | Task | Steps | Expected | Result |
|----|------|-------|----------|--------|
| O-1 | Redirect from scan | Sidebar or Settings → **Scan** | Lands on `/dedupe` with live progress | |
| O-2 | Progress phases | Run folder or account scan | Phases visible (query → load → analyze / removing) | |
| O-3 | Group cards | After scan with dupes | Expandable groups; keeper vs duplicate IDs listed | |
| O-4 | Per-folder results | Account-wide scan | Per-folder breakdown with counts | |
| O-5 | View in mailbox | **View in mailbox** on a result | Opens correct folder; highlights visible | |
| O-6 | Run again | **Run again** after complete | New scan starts cleanly | |
| O-7 | Error state | (If testable) invalid folder / network error | Error badge/message; no stuck “scanning” forever | |

---

## Dedupe — CLI (pass 2–4, 19)

Run from repo root. Adjust account flags per [`dedupe/README`](dedupe/README) or `run-dedupe.sh`.

| ID | Task | Steps | Expected | Result |
|----|------|-------|----------|--------|
| C-1 | Dry-run | Scan folder with `--dry-run` | Reports duplicates; **no** moves | |
| C-2 | Live move | Scan + move on test folder | Extras in `dupes/`; oldest kept per group | |
| C-3 | Bad config | Point `DEDUPE_CONFIG` at invalid JSON | Clear error exit (pass 4) | |
| C-4 | Empty Message-ID | Messages without Message-ID | Do not all group into one duplicate bucket (pass 2) | |

---

## Regression — core interactions

| ID | Task | Steps | Expected | Result |
|----|------|-------|----------|--------|
| R-1 | Compose & send | Send test message to self | Appears in Sent; no duplicate SMTP drop regression | |
| R-2 | Multi-select | Select several emails; batch mark read/unread | Only selected messages change (explicit user action) | |
| R-3 | Shared folder | If available, open shared mailbox | List/filter/dedupe respect account boundaries | |
| R-4 | Create subfolder | Create folder under Inbox | Appears in tree; JMAP IDs correct (pass 10) | |

---

## Reporting failures

[Open a GitHub issue](https://github.com/jasincanada/JasMail/issues/new) (or comment on [Epic #3](https://github.com/jasincanada/JasMail/issues/3) for review items). Copy this block:

```
**Test ID:** (e.g. L-2)
**Changelog pass:** (e.g. pass 12)
**Environment:** webmail URL, browser, date
**Account:** (e.g. jas@…)
**Steps:**
1.
2.
**Expected:**
**Actual:**
**Screenshot/console:** (attach if possible)
```

---

## Maintenance for developers

When you ship a new changelog pass ([`JASMAIL_CHANGELOG.md`](JASMAIL_CHANGELOG.md)):

1. Add a section or rows to this file with **IDs**, **steps**, and **expected** outcomes.
2. Reference the **pass number** in the task section heading or ID prefix.
3. Remove or mark **obsolete** rows if behaviour was removed.
4. Keep **Unread safety (U-*)** rows for any change that touches JMAP `Email/set`, list fetch, or dedupe move paths.

**Last updated:** 2026-06-21 (JasMail v1.6.0 publish — pass 12, fork issue tracking).