# Changelog

## JasMail 1.7.0 (2026-06-20) — scan-first dedupe

Full addon notes: [`docs/JASMAIL_CHANGELOG.md`](docs/JASMAIL_CHANGELOG.md). Plan: [`docs/plans/DEDUPE_V1.7.md`](docs/plans/DEDUPE_V1.7.md).

### Changed

- Duplicate handling is **scan-first**: no JMAP mailbox writes until the user chooses an action and confirms.
- Removed one-click “Remove duplicates” entry points; `?action=remove` redirects to scan + action picker.

### Added

- Dedupe **action framework** (review only, move to folder, dupes/, trash, archive, delete with retention).
- Server-side **SQLite audit** (`/api/dedupe/`) with progress and per-message change log.
- `deleted/` subfolder with **90-day retention** before permanent purge (`POST /api/dedupe/purge`).
- JasMail **development OS** skills under `.grok/skills/jasmail-*`.

---

## JasMail 1.6.0 (2026-06-21) — fork release

Fork of upstream 1.5.2. Full addon history: [`docs/JASMAIL_CHANGELOG.md`](docs/JASMAIL_CHANGELOG.md).

### Features

- Mail **dedupe addon**: settings, sidebar actions, `/dedupe` operations page, list highlights, `dupes/` folder handling.
- **List filter & sort** (passes 9–12): unread/read/starred/attachments, date/subject/sender sort, search merge, scroll pagination.
- **JasMail** branding; Docker image `jasmail:local`; manual QA in [`docs/TESTER_TASKS.md`](docs/TESTER_TASKS.md).

### Tracking

- Release: [v1.6.0](https://github.com/jasincanada/JasMail/releases/tag/v1.6.0)
- Review follow-ups: [Epic #3](https://github.com/jasincanada/JasMail/issues/3) on `jasincanada/JasMail`

---

## Upstream 1.5.2 (2026-05-14)

### Security

- **Next.js upgraded to 16.2.6 to patch CVE-2026-44578**
  (GHSA-c4j6-fc7j-m34r, CVSS 8.6). The framework's WebSocket upgrade
  handler did not apply the safe-rewrite checks used for normal HTTP
  requests, so a single unauthenticated HTTP upgrade could cause the
  Node server to issue an internal request to any host reachable on
  port 80 and return the response to the attacker. Self-hosted
  deployments (the only mode this project supports) were exposed to
  cloud metadata endpoints, internal APIs, and admin panels. The bump
  to 16.2.6 also pulls in eleven other May 2026 advisories covering
  middleware/proxy bypass, denial of service, and a React patch.
- **`next-intl` upgraded to patch GHSA-4c35-wcg5-mm9h**, a prototype
  pollution issue in the experimental precompile path. This project
  doesn't enable that path, but the dependency is patched anyway.
- **Hardening note for self-hosters**: a public PoC for CVE-2026-44578
  exists. Redeploy on `rootfr/jmap-webmail:1.5.2` (or `latest`) and,
  where you can, keep the container off untrusted networks and block
  egress to cloud metadata endpoints (AWS IMDS, GCP metadata).

### Fixes

- **Bulk delete now honours the "delete to trash" setting**: emptying
  a selection from the toolbar always performed a hard delete, even
  when the user had configured deletes to move to Trash first. The
  store path used by the toolbar now routes through the same trash
  helper as the single-message delete action, so the behaviour matches
  Settings.
- **Favicon clears the unread badge as soon as the inbox empties**:
  on `unreadCount === 0` the favicon kept the last-painted badge until
  the next refresh because the redraw skipped the zero case. The hook
  now repaints the base icon on the zero transition so the badge
  disappears immediately.

## 1.5.1 (2026-04-17)

### Fixes

- **Attachments from Gmail-origin mail now render**: Gmail stamps a
  `Content-ID` on every attachment it sends, even when the HTML body
  never references it inline. The viewer treated any cid-bearing part
  as an inline image and hid it from the attachment panel, so the
  paperclip indicator showed but no downloadable block did. The viewer
  now marks an attachment as inline only when its cid is actually
  cited as `cid:...` in the HTML body — everything else renders as a
  regular attachment. Applied to both the single-email viewer and the
  threaded conversation view. Closes #58. Thanks @melges-morgen for
  the repro.
- **Email-to-self no longer discarded as duplicate**: the sending
  account's own MTA was dropping inbound delivery for self-send
  because the client created the outgoing copy in Sent before
  submission, so the Message-ID was already known locally when SMTP
  tried to deliver the same message back. The send flow now keeps the
  message in Drafts during submission and uses
  `EmailSubmission.onSuccessUpdateEmail` to move it to Sent only
  after SMTP has accepted the outbound copy. Closes #60. Thanks
  @tamisoft for the report.

## 1.5.0 (2026-04-17)

### Features

- **Archive applies to the whole thread**: archiving from a threaded
  conversation now moves every message in the thread to Archive in a
  single `Email/set`, matching Gmail / Apple Mail behaviour. Closes #49.
  Thanks @capitanroy for the issue and the implementation suggestion.
- **Russian and Ukrainian locales**: `ru` and `uk` are now available in
  the language switcher, each with a full translation set (1210 keys)
  and proper Slavic plural forms. Thanks @VsevolodSauta (#59).
- **Custom favicon with unread badge**: the tab icon is now a mail SVG,
  and a red badge with the inbox unread count is painted on top (a `+`
  when there are more than nine unread). Also fixes a latent bug where
  the sidebar unread counter could go stale after a JMAP push. Thanks
  @jabiinfante (#63).
- **Optional domain-favicon avatars**: when a contact has no photo,
  Settings → Email → "Domain avatars" replaces the initials avatar with
  the favicon of the sender's domain. The lookup goes through a local
  `/api/favicon` proxy and only the domain name is ever sent out — no
  email address, no hashing. Freemail providers (gmail, outlook, yahoo,
  icloud, proton, gmx and others) keep initials so the same logo isn't
  shown for every sender on a shared host. Off by default. Closes #22.

### Fixes

- **Plain-text email printing**: the Print action (button, Ctrl+P, menu)
  now prints only the email content on a clean white page — reply /
  archive / delete buttons, quick reply and sidebar are all hidden.
  Dark-mode themes are neutralised so text stays black on white even
  when the browser's "Print background graphics" toggle is off.
- **HTML email printing**: messages rendered in the sandboxed iframe
  now print correctly. The print pipeline inlines the iframe body into
  the print overlay so the browser doesn't see an empty frame. Wide
  newsletters shrink to the page width instead of being clipped on the
  right edge.
- **Contacts load past 500 entries**: `ContactCard/get` is now batched
  to respect the server's `maxObjectsInGet` (Stalwart default is 500),
  so address books with more than 500 contacts no longer silently load
  as empty. Closes #45. Thanks @capitanroy (#46).
- **Sieve filter destinations preserve the folder hierarchy**:
  selecting a nested folder as a filter destination now writes the full
  `Parent/Child` path to the generated script instead of just the leaf
  name, so the server can resolve it. Closes #62. Thanks @travier for
  the report.
- **OIDC error over plain HTTP is readable**: Sign in with SSO now
  surfaces a clear "requires a secure connection" banner instead of
  throwing `crypto.subtle is undefined`. Closes #23. Thanks @jothoma1
  for the report.
- **Print layout excludes the sidebar and email list**: the printed
  page shows only the email viewer, not the full application chrome.
  Thanks @prastowoagungwidodo (#55).
- **Contact empty-state buttons**: the "New Contact" / "Import vCard"
  action row no longer overflows in the contact panel's empty state.
  Thanks @prastowoagungwidodo (#56).
- **Contact delete dialog renders in every locale**: added the missing
  `delete_confirm_title` and `form.delete` keys across all nine non-
  Dutch locales. Previously hitting Delete in English threw a
  `MISSING_MESSAGE` error.
- **Favicon badge hook no longer crashes React**: the hook now owns a
  single `data-dynamic-favicon` link and leaves Next.js's icon link
  alone, fixing a `parentNode is null` crash on route changes.
- **Avatar fallback when a domain has no favicon**: the `/api/favicon`
  proxy returns a real `404` for domains DuckDuckGo can't resolve, so
  the `<img>` error event fires and the avatar falls back to the
  initials rather than showing a generic placeholder icon.

### Documentation

- **README**: added an example for `OAUTH_ONLY=true` to disable Basic
  Auth when running in SSO-only mode. Thanks @travier (#61).

### Infrastructure

- **Docker major version tag**: container images are now also published
  under `jmap-webmail:1`, so deployments can pin to the current major
  and receive non-breaking minor / patch updates automatically. Thanks
  @joelpurra (#57, closes #54).

## 1.4.1 (2026-04-16)

### Security

- **XSS in plain-text email renderer**: Plain-text bodies escaped `<`, `>`, `&` but
  not `"` or `'` before the URL linkifier built the anchor tag. A crafted URL
  containing a double or single quote broke out of the `href` attribute and could
  inject event handlers (e.g. `onmouseover`). Both the single-email viewer and the
  threaded conversation view are affected. Fixed by a shared `plainTextToSafeHtml`
  helper that escapes all five HTML-significant characters before linkification,
  with regression tests. Reported privately by Linus Rath (@rathlinus) — thank you.
- **Apache JAMES compose compatibility**: Email submission now includes an explicit
  `type: "text/plain"` on the `textBody` part per RFC 8621 §4.1.4. Stalwart accepts
  either form; JAMES 3.9 rejects the request without it (#48). Thanks @jbfreymann-sara
  for the report.

### Dependencies

- Next.js 16.1.5 → 16.2.4 (DoS in Server Components, GHSA-q4gf-8mx6-v5v3)
- next-intl 4.5.8 → 4.9.1 (open redirect, GHSA-8f24-v5vv-gm5j)
- DOMPurify 3.3.1 → 3.4.0 (`FORBID_TAGS` bypass, GHSA-39q2-94rc-95cp)
- Transitive fixes for vite, picomatch, brace-expansion

## 1.4.0 (2026-03-23)

### Features

- **Folder management**: Create, rename, move, and delete mailbox folders from the sidebar
  context menu, with drag-and-drop reparenting and inline editing (#44)
- **Mail multi-selection**: Select multiple emails with checkboxes or shift-click, then
  batch move or delete from the toolbar. Includes a "Move to" popover with search and
  keyboard navigation (#43)

### Fixes

- **Health endpoint**: Container restarts caused by false-positive memory alerts. The check
  was using V8's current heap allocation as the max instead of the real heap limit (#41).
  Thanks @wrenix and @ClemaX for reporting and diagnosing.
- **Identity deletion**: Fix "delete identity always failed" by adding the required
  `urn:ietf:params:jmap:submission` capability to all Identity and EmailSubmission
  operations (#42). Thanks @freddij for reporting.
- **Inline images**: CID-referenced images now render inline instead of showing as
  attachments
- **Email list**: Eliminate flicker during loading and after-action refreshes
- **Copy to clipboard**: Visual feedback on copy, fix dark mode background tint
- **Console cleanup**: Remove production console statements

### Dependencies

- Next.js 16.2.0 -> 16.2.1
- Tailwind CSS 4.2.1 -> 4.2.2
- Zustand 5.0.11 -> 5.0.12
- typescript-eslint 8.56.1 -> 8.57.1
- Fix flatted prototype pollution (GHSA-rf6f-7fwh-wjgh)

## 1.3.3 (2026-03-20)

### Fixes

- **Security**: Update Next.js 16.1.6 -> 16.2.0 (CSRF bypass, HTTP request smuggling, image disk cache DoS, resume buffering DoS, dev HMR CSRF)
- **Calendar**: Participant/invitation handling aligned with Stalwart JMAP, deduplicate self-attendees (#36)
- **Calendar**: Double-click to create event from month view with smart time suggestion (#37)
- **Calendar**: Week numbers column in month view, respects firstDayOfWeek setting (#38)
- **Calendar**: Replace inline delete confirms with centered modal dialog (#34)
- **Calendar**: Sticky week headers aligned with calendar grid (#33)
- **Contacts**: Simplified bulk selection actions into compact dropdown menu (#39)
- **Navigation**: Hide vertical nav rail on tablet to avoid duplicate navigation (#40)

## 1.3.2 (2026-03-17)

### Fixes

- **Navigation**: Bottom navigation bar now consistent across all pages (Mail, Calendar, Contacts) on tablet/landscape breakpoint (#30)
- **Navigation**: Fixed nav bar layering (content no longer bleeds through) and removed redundant active indicator bar

## 1.3.1 (2026-03-16)

### Fixes

- **Navigation**: Bottom navigation bar now shows on tablet/landscape breakpoint (768-1023px) where neither mobile nor desktop nav was rendering (#30)

## 1.3.0 (2026-03-16)

### Features

- **Sandboxed email rendering**: Rich HTML emails (newsletters, tables) now render in a sandboxed iframe for CSS isolation — prevents email styles from bleeding into the app UI
- **API retry with backoff**: JMAP requests now automatically retry on transient failures (503, 429, network errors) with exponential backoff
- **Mobile action bar**: Bottom toolbar with Reply, Reply All, Archive, Delete, and More actions when viewing emails on mobile
- **Long-press context menu**: Long-press on email list items triggers the context menu on touch devices, with haptic feedback
- **Tag counts in sidebar**: Collapsible Tags section shows color-coded tags with email counts
- **Empty folder**: One-click empty for Junk and Trash folders with confirmation and batch deletion progress
- **Extra-compact density**: New density option that hides avatars and previews for maximum information density (44px touch targets on mobile)
- **Security tooltips**: SPF, DKIM, and DMARC indicators now show plain-language explanations on hover
- **Resizable sidebars**: Drag the sidebar edge to resize (180-400px), with keyboard and touch support, persisted in settings
- **Sender info panel**: Click a sender's name to see their contact info, add to contacts, or search all their emails
- **OAuth-only mode**: New `OAUTH_ONLY` env var hides the username/password form and only shows SSO login (#32)
- **OAuth retry**: Added retry button when OAuth discovery fails, preventing dead-end login pages

### Improvements

- Mobile/tablet layout transitions are now CSS-first — no more blink on orientation change
- More Actions dropdown works on touch devices (was hover-only)
- Touch-friendly context menu submenus (tap-to-expand instead of hover)
- Wide HTML emails are horizontally scrollable in iframe view

## 1.1.4 (2026-03-16)

### Fixes

- **Mobile**: Bottom navigation bar now stays visible when viewing an email, so users can switch between Mail/Calendar/Contacts (#30)
- **Move to folder**: Dialog now shows hierarchical folder structure instead of a flat list (#29)

## 1.1.3 (2026-03-16)

### Fixes

- **Calendar**: Fix crash when opening calendar with events that have no duration field (e.g. all-day events from certain clients) (#31)
- **Sieve filters**: Fix "Invalid property or value" error when saving filters — use `onSuccessActivateScript` per RFC 9661 instead of setting `isActive` directly (#21)
- **Security**: Update dompurify 3.3.1→3.3.3 (XSS fix), undici 7.22.0→7.24.4 (WebSocket crash, CRLF injection, HTTP smuggling), flatted 3.3.3→3.4.1 (DoS fix)

## 1.1.2 (2026-03-02)

### Fixes

- **Context menu**: Fix "Move to folder" submenu closing when scrolling the folder list or moving the mouse to the submenu (#19)
- **Move to folder**: Fix emails not actually moving on the server — JMAP response errors were silently ignored and shared account IDs were not resolved correctly
- **Dependencies**: Update tailwindcss, lucide-react, @tanstack/react-virtual, @typescript-eslint/*, globals, @types/node

## 1.1.1 (2026-02-28)

### Fixes

- **Email viewer**: Show/hide details toggle now stays in place when expanded instead of jumping to the bottom of the details section (#18)
- **Email viewer**: Details toggle text is now properly translated (was hardcoded in English)
- **Instrumentation**: Resolve Edge Runtime warnings by splitting Node.js-only code into a separate module
- **Security**: Patch minimatch ReDoS vulnerability (CVE-2026-27903) — upgrade 9.0.6→9.0.9 and 3.1.3→3.1.5

## 1.1.0 (2026-02-28)

- Server-side version update check on startup (logs when a newer release is available)

## 1.0.2 (2026-02-27)

- Fix 4 CVEs in production Docker image (removed npm, upgraded Alpine packages)

## 1.0.1 (2026-02-26)

- Remove stale references, clean up README

## 1.0.0 (2026-02-25)

- Initial public release
