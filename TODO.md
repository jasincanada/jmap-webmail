# JMAP Webmail - TODO List

**Mail Server:** Using [Stalw.art](https://stalw.art/) JMAP server

## ✅ Completed

### Initial Setup
- [x] Initialize Next.js 15.5 project with TypeScript
- [x] Configure Tailwind CSS v4 with Oxide engine
- [x] Set up git repository
- [x] Install core dependencies (jmap-jam, zustand, lucide-react)

### UI Components
- [x] Create Button component with variants
- [x] Create Input component
- [x] Create EmailListItem component with unread/starred indicators
- [x] Create EmailList component with avatars
- [x] Create EmailViewer component with full HTML support
- [x] Create EmailComposer modal component
- [x] Create Sidebar with mailbox navigation
- [x] Create Avatar component with color hashing

### Layout & Styling
- [x] Implement three-pane layout (sidebar, list, viewer)
- [x] Add minimalist design system with gray palette
- [x] Configure custom scrollbars
- [x] Add responsive design considerations
- [x] Fix Tailwind CSS v4 compatibility issues

### State Management
- [x] Set up Zustand store for email state
- [x] Create mock data for development
- [x] Implement email selection logic
- [x] Implement mailbox selection

### JMAP Integration (Partial)
- [x] Create JMAP types (Email, Mailbox, Thread, etc.)
- [x] Create JMAP client wrapper class
- [x] Define core JMAP methods (getEmails, sendEmail, etc.)

## 📝 To Do

### Authentication
- [x] Create auth store with Zustand
- [x] Create login page with JMAP server URL input
- [x] Use environment variable for JMAP server URL configuration
- [x] Simplify login UI with minimalistic design (no technical jargon)
- [x] Redesign login page with modern minimalist UI
- [x] Disable browser autocomplete for username field
- [x] Implement custom username autocomplete with localStorage
- [x] Add session management (note: no persistent sessions by design - password not stored)
- [x] Implement logout functionality
- [x] Add remember me functionality (username history only - no password storage for security)
- [x] Handle authentication errors
- [x] Add TOTP 2FA support (Stalwart-compatible password$totp concatenation, user-toggled field)

### JMAP Server Connection
- [x] Connect to real JMAP server
- [x] Implement session establishment
- [x] Handle connection errors and retries
- [x] Fetch and display storage quota
- [x] Add server capability detection
- [x] Implement keep-alive mechanism
- [x] Add shared folders support (multi-account access)
- [x] Implement ID namespacing for shared mailboxes
- [x] Fix unread counters for shared folders
- [x] Auto-mark emails as read when opened in shared folders

### Email Operations
- [x] Wire up real email fetching from JMAP
- [x] Implement email sending functionality
- [x] Fetch full email content on selection
- [x] Display actual dates instead of relative time
- [x] Implement reply/reply-all/forward with proper quoting
- [x] Add color tags/labels for emails (like Thunderbird)
- [x] Implement mark as read/unread
- [x] Implement star/unstar emails
- [x] Implement delete email
- [x] Implement archive email
- [x] Implement full-text search
- [x] Add draft auto-save
- [x] Fix draft auto-save integration (properly use drafts when sending)
- [x] Add draft discard confirmation with cleanup
- [x] Add attachment download support
- [x] Add attachment upload support
- [x] Implement batch operations (mark read/unread, delete multiple)
- [x] Implement functional quick reply form
- [x] Add email threading support (Gmail-style inline expansion)
- [x] Add List-Unsubscribe header support (RFC 2369) with one-click unsubscribe

### Real-time Updates
- [x] Set up EventSource for JMAP push notifications
- [x] Implement state synchronization
- [x] Handle email arrival notifications
- [x] Update unread counts in real-time
- [x] Handle mailbox changes

### UI Enhancements
- [x] Improve mailbox subfolder UI/UX with hierarchical display
- [x] Improve email viewer UI with better sender display
- [x] Add compact attachment display with file type icons
- [x] Modernize email list with better visual hierarchy
- [x] Widen email list panel for better readability
- [x] Redesign email action buttons with modern look
- [x] Improve email headers display with expandable details
- [x] Add minimalist external content warning banner
- [x] Simplify email notification banners (removed separators, cleaner spacing)
- [x] Implement color tags with background tint display
- [x] Create compact dynamic color picker (hover to reveal)
- [x] Redesign Message Details with security & authentication indicators
- [x] Add SPF/DKIM/DMARC status display with visual indicators
- [x] Create organized sections for technical email details
- [x] Parse and display email header information
- [x] Add dark mode toggle with proper theme persistence
- [x] Add i18n (internationalization) support with English, French, Japanese, Spanish, Italian, German, Dutch, and Portuguese
- [x] Fix next-intl timezone configuration with auto-detection for global users
- [x] Redesign sidebar footer with improved UI/UX for settings
- [x] Fix theme switching and light mode application
- [x] Fix language switcher functionality
- [x] Add visual storage quota indicator with progress bar
- [x] Add loading states and skeletons
- [x] Add smooth email loading transitions with cross-fade effect
- [x] Implement functional quick reply with auto-expand and direct send
- [x] Implement error boundaries
- [x] Create settings page
- [x] Integrate mark-as-read delay setting in email viewer
- [x] Integrate delete action setting (trash vs permanent)
- [x] Integrate show preview toggle in email list
- [x] Integrate external content policy with image loading
- [x] Integrate debug mode with console logging
- [x] Integrate animations toggle throughout components (uses CSS variable --transition-duration)
- [x] Add keyboard shortcuts (j/k navigation, etc.)
- [x] Implement drag-and-drop for emails (native HTML5 DnD API)
- [x] Add context menus (right-click on emails with all actions)
- [x] Create mobile-responsive design (hamburger menu, single/multi-pane adaptive layout)
- [x] Implement pagination/infinite scroll for email list
- [x] Fix dark mode email readability (transform inline color styles for unreadable emails)
- [x] Fix email layout overflow (horizontal scroll, left-side clipping, blocked image empty spaces)

### Identity Management & Sub-Addressing
- [x] Add Identity/set methods to JMAP client (create, update, delete)
- [x] Create identity store with Zustand (identities + sub-addressing state)
- [x] Create sub-addressing utilities (parse, generate, suggest tags)
- [x] Build Identity Manager Modal (list, create, edit, delete identities)
- [x] Build Identity Form component (name, email, signatures)
- [x] Create Identity Settings panel
- [x] Add Identities tab to Settings page
- [x] Add i18n keys for identity management (EN + FR + JA + ES + IT + DE + NL + PT)
- [x] Build Sub-Address Helper component (tag input, suggestions, preview)
- [x] Build Email Identity Badge component (viewer + list display)
- [x] Integrate identity selector into email composer
- [x] Add sub-addressing support to email composer
- [x] Show identity badges in email viewer
- [x] Show sub-address badges in email list
- [x] Test identity CRUD operations (20 JMAP client tests)
- [x] Test sub-addressing workflow (60 unit tests)
- [x] Test error handling and edge cases (31 store tests)

### Calendar Integration
- [x] Add JMAP Calendar TypeScript types (Calendar, CalendarEvent, Participant, RecurrenceRule, Alert, Location)
- [x] Add JMAP Calendar client methods (getCalendars, queryCalendarEvents, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent)
- [x] Add calendar capability detection (supportsCalendars via urn:ietf:params:jmap:calendars)
- [x] Create calendar Zustand store with persist middleware (calendars, events, view mode, date range)
- [x] Add calendar i18n translations (all 8 locales: EN/FR/JA/ES/IT/DE/NL/PT)
- [x] Build calendar page with month/week/day/agenda views
- [x] Build event modal (create/edit/delete with date/time, recurrence, reminders)
- [x] Build mini-calendar sidebar and calendar list with color toggles
- [x] Add calendar settings tab (default view, week start, time format)
- [x] Integrate calendar into sidebar navigation (capability-gated)
- [x] Integrate calendar into auth store (auto-fetch on login, clear on logout)
- [x] Add calendar state to push notification handling
- [x] Fix multi-day events rendering across all spanned days
- [x] Fix overlapping timed events with column-based layout (Google Calendar style)
- [x] Wire firstDayOfWeek and timeFormat settings to all calendar views
- [x] Add locale-aware date formatting via next-intl useFormatter
- [x] Add error handling with toast feedback on event CRUD failures
- [x] Add capability check on calendar page (redirect if unsupported)
- [x] Add ARIA roles/labels to calendar grids (role=grid, gridcell, aria-selected)
- [x] Add ARIA labels to event cards (title, time, calendar context)
- [x] Add timezone support on event creation (Intl.DateTimeFormat auto-detection)
- [x] Add input length validation on event fields (title, description, location)
- [x] Add color value sanitization for calendar/event colors in inline styles
- [x] Add start/end time validation in event modal (auto-adjust end if before start)
- [x] Add focus trap in event modal
- [x] Add mobile touch targets (44px minimum) on event card chips
- [x] Add P1W (week) duration parsing in event cards
- [x] Fix current time indicator to update every minute (was static)
- [x] Fix week view date label to use correct week start
- [x] Fix calendar push notifications (Calendar/CalendarEvent state changes now refresh data)
- [x] Fix error messages to use generic text (no server detail leakage)
- [x] Fix debug logging (calendar store now uses lib/debug.ts)
- [x] Fix ICU pluralization for alert time translations (all 8 locales)
- [x] Fix sidebar panel heading semantic mismatch (now uses "My calendars")
- [x] Add loading indicator during event fetching
- [x] Add store error state display via toast
- [x] Add agenda view keyboard shortcut (a)

### Address Book & Contacts
- [x] Create contact store with Zustand (dual mode: JMAP sync + local fallback)
- [x] Implement contact CRUD operations (create, read, update, delete)
- [x] Create contacts list view with search/filter
- [x] Add contact details view/edit form
- [x] Sync contacts with JMAP server (RFC 9553/9610 ContactCard/AddressBook)
- [x] Implement email autocomplete from contacts
- [x] Integrate contacts with email composer (To/Cc/Bcc autocomplete)
- [x] Add i18n support for contacts (all 8 languages)
- [x] Implement contact groups/lists management (JMAP members map, group CRUD, composer autocomplete expansion)
- [x] Add vCard import/export support (custom RFC 6350 parser/generator, import with duplicate detection, export via Blob API)
- [x] Add bulk contact operations (multi-select, bulk delete, bulk add to group, bulk export)

### Advanced Features
- [x] Implement email filters (JMAP Sieve Scripts RFC 9661 — visual rule builder + raw Sieve editor, capability-gated)
- [x] Add calendar integration (JMAP Calendars - see Calendar Integration section)
- [ ] Create email templates
- [x] Add calendar event drag-and-drop rescheduling (week/day time snap, month date move, visual indicators)
- [x] Add participant scheduling with iTIP invitations (organizer/attendee UI, RSVP buttons, contact autocomplete, scheduling messages, DnD notification, 26 tests)
- [ ] Add free/busy queries (Principal/getAvailability)
- [x] Add iCalendar import via CalendarEvent/parse (file upload, preview, bulk import, 5MB limit)
- [x] Add inline calendar invitation banner in email viewer (auto-detect .ics attachments, parse event details, RSVP Accept/Maybe/Decline, import to calendar, cancellation display, 25 tests)
- [ ] Add calendar sharing UI (JMAP Sharing RFC 9670)
- [x] Add calendar event notifications display (client-side alert evaluation, toast notifications, sound, global hook, settings toggles, 26 tests)
- [x] Add signature management (implemented via Identity Management - per-identity signatures)
- [x] Implement vacation responder settings (JMAP VacationResponse singleton, settings tab, sidebar indicator)
- [x] Add email aliases support (implemented via Sub-Addressing - user+tag@domain.com)
- [x] Create advanced search with filters (JMAP filter panel, search chips, debounced inputs, AbortController dedup)
- [ ] Add email encryption support (PGP/GPG)

### Performance Optimizations
- [x] Implement virtual scrolling for large email lists (@tanstack/react-virtual, dynamic measurement, keyboard scroll-to)
- [ ] Add email content caching
- [ ] Optimize bundle size
- [ ] Add service worker for offline support
- [ ] Implement lazy loading for attachments
- [ ] Add image optimization for email content

### Testing
- [x] Add unit tests for utilities (validation.test.ts: 57 tests, full coverage including XSS vectors)
- [x] Add unit tests for contact store (contact-store.test.ts: 56 tests)
- [x] Add unit tests for JMAP contact client (jmap-contact-client.test.ts: 41 tests)
- [x] Add unit tests for vCard parser (vcard.test.ts: 18 tests)
- [x] Add unit tests for thread utilities (thread-utils.test.ts: 20 tests)
- [x] Add unit tests for email headers (email-headers.test.ts: 39 tests)
- [x] Create component tests (contact-list, contact-detail, contact-form, contact-list-item, button, input, avatar: 41 tests)
- [x] Test JMAP client methods (identity: 20 tests, contacts: 41 tests)
- [x] Set up Playwright E2E framework (login, contacts, email test skeletons)
- [ ] Add E2E tests with real JMAP server
- [ ] Add accessibility testing
- [ ] Performance testing

### Documentation
- [ ] Create user documentation
- [ ] Add API documentation for JMAP client
- [ ] Create deployment guide
- [ ] Add configuration documentation
- [ ] Create contributing guidelines

### Deployment
- [x] Create environment variable management (.env.local and .env.example)
- [x] Add runtime configuration support (Docker-friendly, no rebuild required)
- [x] Add health check endpoint
- [x] Add Docker support (Dockerfile multi-stage build, docker-compose.yml, .dockerignore)
- [x] Add Next.js standalone output for container deployments
- [x] Add structured server-side logger (lib/logger.ts - text/JSON format, configurable level)
- [ ] Configure production build optimizations
- [ ] Set up monitoring and logging

### Security
- [x] Block external images/content by default (privacy protection)
- [x] Add user control for loading external content
- [x] Sanitize HTML email content with DOMPurify (comprehensive config with forbidden tags/attributes)
- [x] Implement CSP headers (Content-Security-Policy-Report-Only via proxy.ts middleware with per-request nonce)
- [x] Add security headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, X-XSS-Protection)
- [ ] Implement rate limiting
- [ ] Add CORS configuration
- [ ] Implement secure cookie handling (note: uses Basic Auth, no session tokens)

## 🐛 Known Issues
- [ ] Fix Next.js workspace root warning
- [x] Handle port conflicts more gracefully (using port 3001)
- [x] Improve error messages for failed JMAP operations (login errors now properly displayed)
- [x] Fixed JamClient import issue from jmap-jam library
- [x] Fixed multiple JMAP client files issue (cleaned up to single client.ts)
- [x] Fixed session persistence on page refresh (using sessionStorage for credentials)
- [x] Fixed mailbox ID mismatch (now using actual IDs from server)
- [x] Fixed email not displaying (proper mailbox filtering)
- [x] Fixed mailbox counters showing fake data (now showing real server data)
- [x] Fixed color removal not working (keywords now set to false instead of deleted)
- [x] Fixed color indicator showing previous color after removal
- [x] Fixed HTML emails showing unwanted borders (selective CSS for data tables)
- [x] Fixed email remaining open when switching mailboxes (now clears selection)
- [x] Fixed attachment downloads returning 404 (proper URI template handling)
- [x] Fixed plain text emails displaying on one line (smart HTML/text version selection)
- [x] Fixed light mode not applying properly (replaced hardcoded colors with CSS variables)
- [x] Fixed all hardcoded colors in email viewer for proper theme support
- [x] Fixed sidebar footer menu extending page height when scrolling (overflow containment)
- [x] Fixed dark mode folder selection not visible (improved accent color contrast)
- [x] Fixed inbox not selected by default on login (auto-select primary account inbox)
- [x] Fixed email store not cleared on logout (proper state reset)
- [x] Fixed search results limited to 50 (added pagination support to searchEmails)
- [x] Fixed email layout horizontal scroll and left-side text clipping (removed width: max-content CSS)
- [x] Fixed blocked external images leaving large empty spaces in newsletter emails (container collapsing)

## 📊 Code Audit Summary (Last verified: 2026-02-16)

### Settings Integration Status
All settings are now properly wired to their functionality:
| Setting | Store Location | UI Control | Actual Integration |
|---------|---------------|------------|-------------------|
| deleteAction | settings-store.ts:26 | email-settings.tsx | ✅ Moves to trash or permanently deletes |
| showPreview | settings-store.ts:27 | email-settings.tsx | ✅ Conditionally renders preview in email list |
| externalContentPolicy | settings-store.ts:29 | email-settings.tsx | ✅ Controls external content blocking (ask/block/allow) |
| debugMode | settings-store.ts:40 | advanced-settings.tsx | ✅ Conditional logging via lib/debug.ts |
| animationsEnabled | settings-store.ts:17 | appearance-settings.tsx | ✅ Works via CSS variable |
| markAsReadDelay | settings-store.ts:25 | email-settings.tsx | ✅ Fully integrated |

### New UI Features (2025-12-10)
- **Drag-and-Drop**: Native HTML5 DnD API - drag emails to mailbox folders in sidebar
  - Files: contexts/drag-drop-context.tsx, hooks/use-email-drag.ts, hooks/use-mailbox-drop.ts
  - Multi-select support, permission validation, visual feedback
- **Context Menus**: Right-click on email list items
  - Files: components/ui/context-menu.tsx, components/email/email-context-menu.tsx, hooks/use-context-menu.ts
  - Reply, Forward, Move to, Color tags, Delete - supports batch operations
- **Mobile Responsive**: Adaptive single/multi-pane layout
  - Files: stores/ui-store.ts, hooks/use-media-query.ts, components/layout/mobile-header.tsx
  - Hamburger menu navigation, view switching, safe area support

### Keyboard Shortcuts (2025-12-10)
- **Hook**: hooks/use-keyboard-shortcuts.ts
- **Modal**: components/keyboard-shortcuts-modal.tsx
- **Navigation**: j/k or arrows (next/prev email), Enter/o (open), Esc (close)
- **Actions**: r (reply), R/a (reply all), f (forward), s (star), e (archive), #/Del (delete), u (unread)
- **Global**: c (compose), / (search), ? (help), Shift+G (refresh), Ctrl+A (select all)
- **Threads**: x (expand/collapse thread)
- Disabled when typing in inputs or when composer is open

### Email Threading (2025-12-10)
- **Style**: Gmail-style inline expansion (desktop), full-screen conversation view (mobile)
- **Files**:
  - lib/thread-utils.ts - Thread grouping utilities
  - lib/jmap/types.ts - ThreadGroup interface
  - lib/jmap/client.ts - getThread(), getThreadEmails() methods
  - stores/email-store.ts - Thread expansion state (expandedThreadIds, threadEmailsCache)
  - components/email/thread-list-item.tsx - Collapsed/expanded thread view (desktop), tap-to-open (mobile)
  - components/email/thread-email-item.tsx - Compact email within thread
  - components/email/thread-conversation-view.tsx - Full-screen mobile conversation view
  - components/email/email-list.tsx - Groups emails by threadId
- **Desktop Features**:
  - Threads grouped by threadId (client-side grouping)
  - Collapsed view shows: participants, email count badge, latest subject/date
  - Expanded view shows: all emails in thread with indentation
  - Lazy loading: complete thread fetched via Thread/get on expansion
  - State preserved per-mailbox, cleared on mailbox switch
  - Keyboard: x to expand/collapse selected thread
- **Mobile Features**:
  - Tap thread → full-screen conversation view (no inline expansion)
  - Collapsible email cards, most recent auto-expanded
  - Full HTML email content with DOMPurify sanitization
  - External content blocking with user override
  - Inline attachments with download support
  - Reply/Reply All/Forward buttons on expanded cards
  - Back navigation returns to email list

### Dark Mode Email Readability (2026-01-08)
- **Problem**: HTML emails with inline color styles (e.g., `color: #333333`) became unreadable in dark mode
- **Solution**: Intelligent color transformation during HTML sanitization
- **Files**:
  - lib/color-transform.ts - Color parsing, luminance calculation, and transformation utilities
  - lib/__tests__/color-transform.test.ts - Comprehensive test suite (40 tests)
  - components/email/email-viewer.tsx - Extended DOMPurify hook to transform inline styles
- **Features**:
  - Automatically detects and transforms dark text colors in dark mode
  - Preserves light colors and original design intent
  - Only affects dark mode (light mode unchanged)
  - Supports multiple color formats (hex, rgb, rgba, hsl, named colors)
  - Transforms `color`, `background-color`, `background`, and `border-color` properties
  - Uses WCAG 2.0 luminance calculation for accurate color detection
  - Handles edge cases: transparency, inherit, currentColor, !important
- **Technical Details**:
  - Luminance < 0.4 (very dark): Inverted and brightened
  - Luminance 0.4-0.6 (medium): Lightened by 40-50%
  - Luminance > 0.6 (light): Preserved as-is
  - Falls back gracefully on parse errors

### Identity Management & Sub-Addressing (2026-01-08)
- **Identity Management**: Full CRUD operations for multiple email identities
  - Files: stores/identity-store.ts, lib/jmap/client.ts (Identity/get, Identity/set)
  - Components: components/identity/identity-manager-modal.tsx, components/identity/identity-form.tsx
  - UI Integration: components/settings/identity-settings.tsx
- **Sub-Addressing**: Generate tagged email addresses (user+tag@domain.com)
  - Files: lib/sub-addressing.ts (parse, generate, suggest utilities)
  - Component: components/identity/sub-address-helper.tsx
  - Features: Tag suggestions based on mailbox/subject, email preview, validation
- **Email Composer Integration**:
  - Identity selector dropdown with signatures
  - Sub-address generation with real-time preview
  - Automatic From field population
- **Visual Indicators**:
  - components/email/email-identity-badge.tsx - Shows identity + sub-address tags
  - Displayed in email viewer (recipient chips) and email list (compact badges)
- **i18n Support**: Full EN/FR/JA/ES/IT/DE/NL/PT translations in locales/*/common.json (identity.*, sub_address.*)
- **Security**: Input validation, XSS prevention in signatures (DOMPurify), sub-address format validation

### Newsletter Unsubscribe (2026-01-08)
- **RFC 2369 Compliance**: Parses List-Unsubscribe headers from emails
  - Files: lib/validation.ts (parseUnsubscribeUrls, isValidUnsubscribeUrl)
  - Files: lib/email-headers.ts (extractListHeaders function)
  - Component: components/email/unsubscribe-banner.tsx
  - Integration: email-viewer.tsx detects and displays unsubscribe banner
- **Security Features**:
  - URL validation blocks XSS vectors (javascript:, data:, file:, etc.)
  - Only allows http://, https://, and mailto: protocols
  - Email validation for mailto: URLs
  - Comprehensive test coverage (57 tests including XSS attack vectors)
- **User Experience**:
  - Two-step confirmation process (prevents accidental clicks)
  - Dismissible with localStorage persistence (won't re-show for same email)
  - Supports both HTTP (one-click) and mailto methods
  - Auto-prefers HTTP over mailto when both available
  - Integrated with external content banner (unified notification area)
  - Success/error states with auto-dismiss
  - Mobile-friendly with 44px touch targets
- **i18n Support**: Full EN/FR/JA/ES/IT/DE/NL/PT translations in email_viewer.unsubscribe_banner.*

### Accessibility Improvements (2026-01-08)
- **WCAG 2.0 Level AA Compliance**: Comprehensive color contrast review and fixes
  - Files: app/globals.css (blockquote/quoted text colors)
  - Files: components/email/email-viewer.tsx (email preview colors)
  - Documentation: CLAUDE.md (accessibility guidelines and standards)
- **Critical Fixes**:
  - Replaced hardcoded hex colors (#666, #999) with CSS variables in email preview
  - Strengthened blockquote text color from #6b7280 → #4b5563 (5.3:1 → 7.8:1 contrast)
  - Strengthened quoted email text color to match blockquote improvement
  - All fixes maintain dark mode compatibility
- **Color Contrast Standards**:
  - Normal text: 4.5:1 minimum (AA), 7:1 target (AAA)
  - Large text: 3:1 minimum
  - Tested combinations documented in CLAUDE.md
- **Guidelines Established**:
  - Never use hardcoded hex colors in components
  - Always use CSS variables or Tailwind classes
  - Minimum opacity 0.7 for text-muted-foreground in light mode
  - Semantic color patterns for success/error/warning/info states
  - Testing requirements for both light and dark modes
- **Developer Resources**:
  - Color decision tree for choosing appropriate text colors
  - Common mistakes to avoid documented
  - Browser DevTools accessibility testing instructions

### Email Layout & Blocked Content Fix (2026-02-16)
- **Problem**: Newsletter emails had horizontal scroll, left-side text clipping, and large empty spaces when images blocked
- **Root Cause**: CSS `width: max-content` and `display: inline-block` on email content wrappers forced content wider than container
- **Files**:
  - app/globals.css - Removed problematic width/display rules from `.email-content-wrapper` and `.email-content`
  - lib/email-sanitization.ts - New `collapseBlockedImageContainers()` utility
  - components/email/email-viewer.tsx - Post-processing to collapse empty containers after DOMPurify
  - components/email/thread-conversation-view.tsx - Same fix for thread view
- **Fixes**:
  - Removed `display: inline-block` from wrapper, `width: max-content` from content, `min-width: max-content` from tables
  - Added `overflow-wrap: break-word` for long text handling
  - Blocked images: walks up DOM from hidden `<img>` to parent `<td>`/`<th>`/`<div>`, collapses if no visible text/links/media

### Dependency Updates (2026-02-16)
- All packages updated to latest compatible versions
- Major upgrades: @types/node 22→25, jsdom 27→28, lucide-react 0.562→0.564
- Notable: next 16.1.6, react 19.2.4, next-intl 4.8.3, zustand 5.0.11, vitest 4.0.18
- eslint 10 skipped (ecosystem plugins not yet compatible)

### Calendar Integration (2026-02-16)
- **JMAP Calendars**: Full CalendarEvent CRUD with RFC 8984 types
  - Files: lib/jmap/types.ts (Calendar, CalendarEvent, Participant, RecurrenceRule, Alert, Location types)
  - Files: lib/jmap/client.ts (getCalendars, queryCalendarEvents, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent)
  - Capability detection: `urn:ietf:params:jmap:calendars` in auth-store.ts
- **Store**: stores/calendar-store.ts (Zustand with persist middleware)
  - Calendars, events, view mode (month/week/day/agenda), date range, selected event
  - Auto-fetch on login, clear on logout via auth-store integration
  - Error logging via lib/debug.ts, generic user-facing error messages
- **UI Components**: components/calendar/ (9 components)
  - month-view.tsx, week-view.tsx, day-view.tsx, agenda-view.tsx
  - toolbar.tsx, event-modal.tsx, event-card.tsx
  - mini-calendar.tsx, calendar-sidebar-panel.tsx
- **Settings**: components/settings/calendar-settings.tsx (default view, week start, time format)
- **Page**: app/[locale]/calendar/page.tsx
  - Capability check (redirects if server doesn't support calendars)
  - Error handling with toast feedback on CRUD failures
  - Loading indicator during event fetching
  - Settings forwarded to all view components (firstDayOfWeek, timeFormat)
- **Integration**: auth-store capability detection, sidebar nav link (capability-gated), settings tab, push notification state handling (Calendar + CalendarEvent)
- **i18n**: Full EN/FR/JA/ES/IT/DE/NL/PT translations (calendar.* namespace, ICU pluralization)
- **Multi-day Events**: Events spanning multiple days render on each day they cover
- **Overlap Detection**: Column-based layout for concurrent events (Google Calendar style)
- **Locale-aware Dates**: Month/day names via next-intl useFormatter (respects user locale)
- **Accessibility**: ARIA grid roles, event card labels, 44px mobile touch targets, focus trap in modal
- **Security**: Input length validation, color value sanitization, timezone auto-detection, error message sanitization
- **Keyboard Shortcuts**: m (month), w (week), d (day), a (agenda), t (today), n (new event), arrows (navigate)
- **Drag-and-Drop Rescheduling**: Drag events in week/day views to change time (15-min snap), month view to change date
  - HTML5 DnD API with `application/x-calendar-event` payload
  - Visual snap indicator with time label in week/day views, blue ring highlight in month view
  - Optimistic update via updateEvent, error rollback with toast
  - `aria-roledescription="draggable event"` for accessibility
- **iCalendar Import**: Upload .ics files, parse via JMAP CalendarEvent/parse, bulk create
  - Files: lib/jmap/client.ts (parseCalendarEvents), components/calendar/ical-import-modal.tsx
  - Multi-step flow: file select → preview list → calendar selector → import
  - File validation (5MB max, .ics/.ical extension), DOMPurify for descriptions
  - Select/deselect individual events, progress indicator, success/error toasts
  - Toolbar Import button with Upload icon
  - i18n: calendar.import.* keys in all 8 locales (17 strings each)

### Email Filters & Sieve Rules (2026-02-16)
- **JMAP Sieve Scripts (RFC 9661)**: Full server-side email filtering with visual builder + raw editor
  - Types: lib/jmap/sieve-types.ts (SieveScript, SieveCapabilities, FilterRule, FilterCondition, FilterAction)
  - Client: lib/jmap/client.ts (12 Sieve methods: supportsSieve, getSieveCapabilities, getSieveScripts, getSieveScriptContent, createSieveScript, updateSieveScript, deleteSieveScript, activateSieveScript, deactivateSieveScript, validateSieveScript)
  - Capability detection: `urn:ietf:params:jmap:sieve` in auth-store.ts
- **Sieve Generator/Parser**: lib/sieve/generator.ts, lib/sieve/parser.ts
  - Rules stored as JSON metadata in `/* @metadata:begin ... @metadata:end */` comment block
  - Dynamic `require` extension computation from enabled rules' actions
  - Round-trip fidelity: parse → edit → regenerate preserves all rule data
  - Hand-edited scripts detected as "opaque" → raw editor only
  - 64 tests (50 generator + 14 parser)
- **Store**: stores/filter-store.ts (Zustand, no persist)
  - Rules CRUD: addRule, updateRule, deleteRule, reorderRules, toggleRule
  - fetchFilters, saveFilters, validateScript via JMAP client
  - Opaque script detection for hand-edited Sieve scripts
  - Auto-fetch on login via auth-store, clear on logout
- **UI Components**:
  - components/settings/filter-settings.tsx — Settings tab: rule list with drag-and-drop reorder, toggle, edit, delete, raw editor toggle
  - components/filters/filter-rule-modal.tsx — Modal: name, match type (all/any), condition rows, action rows, stop processing
  - components/filters/sieve-editor-modal.tsx — Modal: monospace editor with line numbers, validate button, two-step save confirmation
- **Conditions**: From, To, Cc, Subject, Custom Header, Size, Body with comparators: contains, not contains, is, not is, starts with, ends with, matches, greater than, less than
- **Actions**: Move to folder, Copy to folder, Forward, Mark as read, Star, Add label, Discard, Reject, Keep, Stop processing
- **Integration**: Settings tab (capability-gated), push notification handling (SieveScript state changes), auth-store init/cleanup
- **i18n**: Full EN/FR/JA/ES/IT/DE/NL/PT translations (settings.filters.* namespace + sieve_editor sub-namespace)
- **Accessibility**: Focus trap in modals, ARIA labels, keyboard support (Esc to close, Ctrl+Enter to save), drag-and-drop reorder with grip handles

### Feature Completeness
- **Authentication**: ✅ Complete (secure design, no password storage)
- **Email Operations**: ✅ Complete (including threading, unsubscribe)
- **Real-time Updates**: ✅ Complete (EventSource push, toast notifications, status indicator)
- **UI Enhancements**: ✅ Settings fully integrated, drag-drop, context menus, mobile responsive, keyboard shortcuts, WCAG AA accessibility
- **Identity Management**: ✅ Complete (CRUD, sub-addressing, signatures, visual badges)
- **Newsletter Management**: ✅ RFC 2369 List-Unsubscribe support with security validation
- **Contacts/Address Book**: ✅ Phase 2 complete (groups, vCard import/export, bulk ops, composer group expansion)
- **Advanced Search**: ✅ Complete (JMAP filters, advanced panel, search chips, cross-mailbox)
- **Vacation Responder**: ✅ Complete (JMAP VacationResponse, settings tab, sidebar indicator, 8 locales)
- **Virtual Scrolling**: ✅ Complete (@tanstack/react-virtual, dynamic measurement, keyboard scroll-to)
- **Security**: ✅ CSP Report-Only + all P0 headers deployed (nonce-based scripts, proxy.ts middleware)
- **Calendar**: ✅ Phase 3 complete (inline invitation banner with RSVP/import, drag-and-drop rescheduling, iCalendar import, plus phase 1: views, event CRUD, multi-day, overlaps, locale dates, accessibility, security)
- **Email Filters**: ✅ Complete (JMAP Sieve RFC 9661, visual rule builder, raw Sieve editor, 64 tests, capability-gated, 8 locales)
- **Calendar Notifications**: ✅ Complete (client-side alert evaluation, toast display, notification sound, proactive event fetch, settings toggles, acknowledged persistence, 44 tests)
- **Testing**: ✅ 607 tests passing (identity, sub-addressing, contacts, vCard, validation, color, threads, headers, sieve generator, sieve parser, calendar alerts, calendar notification store, calendar invitation)

