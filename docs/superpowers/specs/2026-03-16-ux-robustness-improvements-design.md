# UX & Robustness Improvements — Design Spec

**Date:** 2026-03-16
**Version target:** 1.2.0 (minor — new features, non-breaking)
**Motivation:** Distill high-value improvements identified from competitive analysis into our codebase, executed properly.

---

## P0: Core Improvements

### 1. Hybrid Email Rendering (Iframe + Div)

**Problem:** HTML emails can bleed CSS into the app, and complex newsletters fight our color-transform heuristics.

**Security model:** DOMPurify remains the sole security boundary. The iframe provides **CSS isolation only** — preventing email stylesheets from affecting the app UI. The `allow-same-origin` sandbox flag is required for `ResizeObserver` access to `contentDocument.body` for auto-height. This is not a defense against DOMPurify bypasses. Future hardening: migrate to null-origin iframe with `postMessage`-based height reporting (tracked separately).

**Design:**
- **Decision point:** New `needsIframeRendering()` function (replaces using `hasRichFormatting()` which is too broad — it matches `<b>`, `<strong>`, `<blockquote>`, etc.)
  - `needsIframeRendering()` checks for: `<table>`, `<style>`, `background` in inline styles, `<link>`, complex CSS selectors — patterns that cause CSS bleed
  - Rich HTML → iframe path
  - Plain text / simple HTML → current div path (DOMPurify-sanitized)
- **Iframe path:**
  - `DOMPurify.sanitize()` with existing config and hooks (unchanged)
  - Render in `<iframe sandbox="allow-same-origin" srcdoc={wrappedHtml}>`
  - Wrap sanitized HTML in minimal `<html>` shell with:
    - `<style>` block using `prefers-color-scheme` for native dark mode adaptation
    - Base readability styles (max-width, word-wrap, font defaults)
  - Auto-resize iframe height via `ResizeObserver` on `contentDocument.body`
  - Intercept link clicks → open in new tab with `rel="noopener noreferrer"`
- **Div path:** Unchanged — DOMPurify sanitized content rendered in a div
- **CSP:** Change `frame-src 'none'` to `frame-src 'self'` in `proxy.ts` (line 24). Note: CSP is currently `Content-Security-Policy-Report-Only` — keep report-only for now, test `srcdoc` iframe behavior across browsers before enforcing.
- **External content blocking:** Unchanged, runs in DOMPurify hooks before either path

**Files:**
- `components/email/email-viewer.tsx` — routing logic between iframe/div
- `components/email/thread-conversation-view.tsx` — same iframe routing (also renders HTML emails)
- New: `components/email/sandboxed-email-frame.tsx` — iframe rendering component
- `lib/email-sanitization.ts` — add `needsIframeRendering()` function
- `proxy.ts` — CSP header update (`frame-src 'none'` → `frame-src 'self'`)
- `lib/color-transform.ts` — adapt for iframe `<style>` injection

### 2. API Retry with Exponential Backoff

**Problem:** Transient server errors (503, network blips) cause broken UI state with no recovery.

**Design:**
- Add retry logic inside `authenticatedFetch()` in `lib/jmap/client.ts`
- **Retry on:** 429, 502, 503, 504, `TypeError` (network failure)
- **Never retry:** 400, 401, 403, 404, 409
- **Strategy:** Exponential backoff — 500ms, 1s, 2s (3 attempts max)
- **429:** Respect `Retry-After` header if present
- **Jitter:** random ±20% to avoid thundering herd
- **Abort signal:** Respect caller's `AbortSignal` between retries
- **Opt-out:** Add optional `{ retry: false }` parameter to `authenticatedFetch()` for callers that must not retry:
  - `downloadBlob` — streaming partial downloads should not retry silently
  - `uploadBlob` — POST retry could create duplicate blobs if the request succeeded but response was lost
  - EventSource polling (`buildStatePollingRequest`) — already periodic, retry adds latency
- Default: retry enabled for standard JMAP API calls

**Files:**
- `lib/jmap/client.ts` — modify `authenticatedFetch()`, add private `retryWithBackoff()` helper, add `retry: false` to blob/upload/polling callers

### 3. Mobile Bottom Action Bar + Long-Press Context Menu

**Problem:** Mobile users must reach top of screen for email actions; context menus don't work on touch.

**Design:**

**Bottom Action Bar:**
- Visible on mobile (`max-lg:`) when viewing an email only
- Fixed bottom, 56px height, matches mobile-header style
- Actions: Reply, Reply All, Archive, Delete, More (overflow → bottom sheet)
- Bottom sheet "More": Forward, Move to, Star, Mark unread, Spam
- Hidden in list view
- Replaces existing NavigationRail which already hides in viewer mode (per UI_UX_PATTERNS.md)
- Accessibility: `role="toolbar"`, `aria-label`, focus management on appear/disappear
- Bottom sheet "More" gets a focus trap and Escape-to-close
- Existing keyboard shortcuts (r, R, e, #, f) remain active alongside the bar

**Long-Press Context Menu:**
- On email list items: 300ms `touchstart`/`touchend` timer
- Cancel on `touchmove` > 10px (no scroll conflict)
- Visual feedback during hold: subtle scale to 0.98 + background highlight
- `navigator.vibrate(10)` where supported (graceful no-op where not)
- Triggers existing `email-context-menu.tsx` — same items as desktop right-click

**Context Menu Touch Fix:**
- Submenus: tap-to-expand on `pointer: coarse` devices (replaces hover)
- No user-agent sniffing

**Files:**
- New: `components/email/mobile-action-bar.tsx`
- `components/ui/context-menu.tsx` — touch support, tap-to-expand
- `components/email/email-list-item.tsx` — long-press handler
- `components/email/email-viewer.tsx` — integrate bottom bar on mobile

---

## P1: Polish Round

### 4. Tag Counts in Sidebar

**Prerequisite:** The sidebar currently has no tags/labels section — only mailbox folders. This feature requires two parts:

**Part A — Tags sidebar section:**
- Add a collapsible "Tags" section below mailbox folders in the sidebar
- List all color tags that have at least 1 email
- Each tag shows its color dot, name, and count badge
- Click a tag → filter email list to show emails with that tag

**Part B — Count fetching:**
- Batch `Email/query` with `hasKeyword` filter per tag + `calculateTotal: true` in single JMAP request
- Display count badge (same style as unread counts)
- Refresh on push state changes
- Cache in email store

**Files:** `components/layout/sidebar.tsx`, `stores/email-store.ts`, `stores/tag-store.ts` (may need new store or extend email store)

### 5. Empty Folder (Junk/Trash)

- Context menu option on Junk and Trash mailboxes only
- Confirmation dialog showing folder name and email count
- `Email/query` then `Email/set` destroy in batches of 500
- If > 500 emails: loop with progress indicator in toast ("Deleting... 500/1,247")
- Optimistic UI: clear list immediately, show progress toast for batch operations
- On batch failure mid-way: stop, show error toast with count of deleted vs remaining, do not roll back already-deleted emails
- i18n: `sidebar.empty_folder.*` keys in all 8 locales

**Files:** `components/layout/sidebar.tsx`, `components/ui/context-menu.tsx`, 8 locale files

### 6. Extra-Compact Density

- Add `'extra-compact'` to `ListDensity` type
- `--list-item-height: 28px` on desktop
- **Mobile override:** On `pointer: coarse` devices, enforce minimum 44px touch target (per WCAG / UI_UX_PATTERNS.md) — extra-compact reduces visual density (no avatar, no snippet) but keeps 44px row height
- Hide: avatar, preview snippet, attachment indicator
- Keep: sender name, subject (single line truncated), date, unread dot
- New radio option in appearance settings
- i18n: label in all 8 locales

**Files:** `stores/settings-store.ts`, `components/settings/appearance-settings.tsx`, `components/email/email-list-item.tsx`, 8 locale files

### 7. Security Tooltips on SPF/DKIM/DMARC

- Wrap existing badges in tooltip component
- Plain-language explanations per protocol and all result types:
  - **SPF:** pass, fail, softfail, neutral, temperror, permerror, none
  - **DKIM:** pass, fail, policy, neutral, temperror, permerror
  - **DMARC:** pass, fail, none
  - Example: SPF pass → "The sending server is authorized to send on behalf of this domain"
  - Example: DKIM fail → "This email's content may have been altered in transit"
  - Example: DMARC fail → "The sender's domain could not verify this email's authenticity"
- i18n: `email_viewer.security.{protocol}_{result}` keys in all 8 locales (full matrix)

**Files:** `components/email/email-viewer.tsx`, 8 locale files

### 8. Resizable Sidebars

- Drag handle (4px invisible hit area, `col-resize` cursor) on sidebar right edge
- `mousedown` then `mousemove` updates `--sidebar-width` CSS variable
- Touch support: `touchstart`/`touchmove` for tablet users
- Min: 180px, Max: 400px, Default: 256px
- Keyboard: when handle is focused, Left/Right arrow keys resize by 20px increments
- Persist in settings store
- Apply to mail, calendar, contacts (all share sidebar component)
- Mobile: ignored (full-width overlay)

**Files:** `components/layout/sidebar.tsx`, `stores/settings-store.ts`

### 9. Sender Info Panel

- Expandable section in email viewer — click sender name/avatar to toggle
- Shows: full email address, contact card (if exists), "Add to contacts" (if not), "View all emails from sender" (triggers search)
- Reuses contact store data — no new API calls if contact exists
- Collapsed by default, takes no space
- i18n keys: `email_viewer.sender_info.add_to_contacts`, `email_viewer.sender_info.view_all_emails`, `email_viewer.sender_info.no_contact`

**Files:** `components/email/email-viewer.tsx`, new `components/email/sender-info-panel.tsx`, 8 locale files

---

## Out of Scope (Deferred)

- WebDAV/JMAP file browser (scope creep, non-standard)
- iCal/webcal subscriptions (calendar polish deferred)
- Wildcard search (server-dependent, low ROI)
- Null-origin iframe with postMessage (future security hardening)

---

## i18n Impact

New translation keys required across all 8 locales (`en`, `fr`, `ja`, `es`, `it`, `de`, `nl`, `pt`):
- `sidebar.tags.*` — tag section header, filter labels
- `sidebar.empty_folder.title`, `sidebar.empty_folder.confirm`, `sidebar.empty_folder.success`, `sidebar.empty_folder.progress`, `sidebar.empty_folder.error`
- `settings.list_density.extra_compact`
- `email_viewer.security.{spf,dkim,dmarc}_{pass,fail,softfail,neutral,temperror,permerror,none,policy}` (full matrix, ~20 keys)
- `email_viewer.sender_info.add_to_contacts`, `email_viewer.sender_info.view_all_emails`, `email_viewer.sender_info.no_contact`
- `email_viewer.mobile_actions.reply`, `email_viewer.mobile_actions.reply_all`, `email_viewer.mobile_actions.archive`, `email_viewer.mobile_actions.delete`, `email_viewer.mobile_actions.more`, `email_viewer.mobile_actions.forward`, `email_viewer.mobile_actions.move_to`, `email_viewer.mobile_actions.star`, `email_viewer.mobile_actions.mark_unread`, `email_viewer.mobile_actions.spam`

## Testing Strategy

- Unit tests for `needsIframeRendering()` boundary — verify `<table>` routes to iframe, `<b>` stays in div
- Unit tests for retry logic (mock fetch with failing then succeeding responses, verify backoff timing, verify opt-out)
- Unit tests for iframe content wrapping and height calculation
- CSP header test: verify `frame-src 'self'` is present in response headers
- Visual regression for extra-compact density (desktop and mobile variants)
- Manual testing: mobile bottom bar and long-press on actual mobile device/emulator
- Accessibility: verify bottom bar has proper ARIA roles, focus trap on bottom sheet
- Existing E2E skeletons can be extended for empty folder flow
