# JMAP Webmail - Architecture Reference

> Implementation details, file locations, and feature documentation.
> Last verified: 2026-02-22

## Settings Integration Status

All settings are properly wired to their functionality:

| Setting | Store Location | UI Control | Integration |
|---------|---------------|------------|-------------|
| deleteAction | settings-store.ts:26 | email-settings.tsx | Moves to trash or permanently deletes |
| showPreview | settings-store.ts:27 | email-settings.tsx | Conditionally renders preview in email list |
| externalContentPolicy | settings-store.ts:29 | email-settings.tsx | Controls external content blocking (ask/block/allow) |
| debugMode | settings-store.ts:40 | advanced-settings.tsx | Conditional logging via lib/debug.ts |
| animationsEnabled | settings-store.ts:17 | appearance-settings.tsx | Works via CSS variable |
| markAsReadDelay | settings-store.ts:25 | email-settings.tsx | Fully integrated |

## Email Features

### Drag-and-Drop
- Native HTML5 DnD API — drag emails to mailbox folders in sidebar
- Files: `contexts/drag-drop-context.tsx`, `hooks/use-email-drag.ts`, `hooks/use-mailbox-drop.ts`
- Multi-select support, permission validation, visual feedback

### Context Menus
- Right-click on email list items
- Files: `components/ui/context-menu.tsx`, `components/email/email-context-menu.tsx`, `hooks/use-context-menu.ts`
- Reply, Forward, Move to, Color tags, Delete — supports batch operations

### Mobile Responsive
- Adaptive single/multi-pane layout
- Files: `stores/ui-store.ts`, `hooks/use-media-query.ts`, `components/layout/mobile-header.tsx`
- Hamburger menu navigation, view switching, safe area support

### Keyboard Shortcuts
- Hook: `hooks/use-keyboard-shortcuts.ts`
- Modal: `components/keyboard-shortcuts-modal.tsx`
- Navigation: j/k or arrows (next/prev email), Enter/o (open), Esc (close)
- Actions: r (reply), R/a (reply all), f (forward), s (star), e (archive), #/Del (delete), u (unread)
- Global: c (compose), / (search), ? (help), Shift+G (refresh), Ctrl+A (select all)
- Threads: x (expand/collapse thread)
- Disabled when typing in inputs or when composer is open

### Email Threading
- Gmail-style inline expansion (desktop), full-screen conversation view (mobile)
- Files:
  - `lib/thread-utils.ts` — Thread grouping utilities
  - `lib/jmap/types.ts` — ThreadGroup interface
  - `lib/jmap/client.ts` — getThread(), getThreadEmails() methods
  - `stores/email-store.ts` — Thread expansion state
  - `components/email/thread-list-item.tsx` — Collapsed/expanded thread view
  - `components/email/thread-email-item.tsx` — Compact email within thread
  - `components/email/thread-conversation-view.tsx` — Full-screen mobile conversation view
  - `components/email/email-list.tsx` — Groups emails by threadId

### Dark Mode Email Readability
- Intelligent color transformation during HTML sanitization
- Files: `lib/color-transform.ts`, `components/email/email-viewer.tsx`
- Luminance < 0.4 (very dark): Inverted and brightened
- Luminance 0.4-0.6 (medium): Lightened by 40-50%
- Luminance > 0.6 (light): Preserved as-is

### Newsletter Unsubscribe (RFC 2369)
- Files: `lib/validation.ts`, `lib/email-headers.ts`, `components/email/unsubscribe-banner.tsx`
- URL validation blocks XSS vectors, two-step confirmation, localStorage persistence
- Supports both HTTP (one-click) and mailto methods

### Email Layout & Blocked Content Fix
- Removed `width: max-content` / `display: inline-block` from email content wrappers
- Files: `app/globals.css`, `lib/email-sanitization.ts`, `components/email/email-viewer.tsx`
- Blocked images: walks up DOM to collapse empty containers

## Identity Management & Sub-Addressing
- Full CRUD: `stores/identity-store.ts`, `lib/jmap/client.ts` (Identity/get, Identity/set)
- Components: `components/identity/identity-manager-modal.tsx`, `components/identity/identity-form.tsx`
- Sub-addressing: `lib/sub-addressing.ts` (parse, generate, suggest)
- Visual badges: `components/email/email-identity-badge.tsx`

## Calendar Integration

### Core
- JMAP Calendars: Full CalendarEvent CRUD with RFC 8984 types
- Files: `lib/jmap/types.ts`, `lib/jmap/client.ts`, `stores/calendar-store.ts`
- Capability detection: `urn:ietf:params:jmap:calendars` in auth-store.ts
- UI: `components/calendar/` (month-view, week-view, day-view, agenda-view, toolbar, event-modal, event-detail-popover, event-card, mini-calendar, calendar-sidebar-panel)
- Settings: `components/settings/calendar-settings.tsx`
- Keyboard: m (month), w (week), d (day), a (agenda), t (today), n (new event), arrows (navigate)

### Drag-and-Drop Rescheduling
- Week/day views: 15-min snap with visual indicator
- Month view: date move with blue ring highlight
- HTML5 DnD API with `application/x-calendar-event` payload

### Click-Drag to Create
- Pointer events, 5px movement threshold
- Shared hook: `hooks/use-time-grid-interactions.ts`

### Event Resize
- Drag bottom edge, 15-min snap, optimistic JMAP update
- `role="separator"` with aria-label

### Recurring Event Edit Scope
- "This event only" / "This and following" / "All events" dialog
- Files: `components/calendar/recurrence-scope-dialog.tsx`

### Event Detail Popover (Read-Only View)
- Click event → read-only popover (instead of edit form)
- Component: `components/calendar/event-detail-popover.tsx`
- Displays: title, calendar, date/time, location (URL-aware with `target="_blank" rel="noreferrer"`), virtual meeting link, participants with status badges, recurrence, reminder, description
- Actions: Edit (opens modal), Delete (with confirmation), Duplicate
- Quick note: inline input appends timestamped note to description
- RSVP bar for attendees (Accept/Tentative/Decline)
- Smart positioning: right → left → below → above, stays in viewport
- Portal-rendered, CSS transition entrance, dismisses on Escape/click-outside/scroll

### Double-Click Quick Create
- Inline title input, PT1H default, timer-based click disambiguation
- Component: `components/calendar/quick-event-input.tsx`

### iCalendar Import
- Files: `lib/jmap/client.ts` (parseCalendarEvents), `components/calendar/ical-import-modal.tsx`
- Multi-step flow: file select → preview list → calendar selector → import (5MB max)

## Email Filters & Sieve Rules (RFC 9661)
- Types: `lib/jmap/sieve-types.ts`
- Client: `lib/jmap/client.ts` (12 Sieve methods)
- Generator/Parser: `lib/sieve/generator.ts`, `lib/sieve/parser.ts`
- Store: `stores/filter-store.ts`
- UI: `components/settings/filter-settings.tsx`, `components/filters/filter-rule-modal.tsx`, `components/filters/sieve-editor-modal.tsx`
- Conditions: From, To, Cc, Subject, Custom Header, Size, Body
- Actions: Move, Copy, Forward, Mark read, Star, Label, Discard, Reject, Keep, Stop

## Email Templates
- Local storage via Zustand persist middleware
- Files: `lib/template-types.ts`, `stores/template-store.ts`, `lib/template-utils.ts`
- Components: `components/templates/` (template-manager-modal, template-form, template-picker, placeholder-fill-modal)
- Placeholder variables: `{{variable}}` syntax with auto-fill from composer context
- Composer shortcut: Ctrl+Shift+T

## Accessibility (WCAG 2.0 AA)
- Color contrast rules documented in CLAUDE.md
- All color via CSS variables or Tailwind classes
- ARIA roles on calendar grids, event cards, modals
- Focus trap in all modals, 44px mobile touch targets
- Reduced-motion media query, sr-only live region

## Dependency Versions (2026-02-16)
- next 16.1.6, react 19.2.4, next-intl 4.8.3, zustand 5.0.11, vitest 4.0.18
- @types/node 25, jsdom 28, lucide-react 0.564

## Feature Completeness Summary
- **Authentication**: Complete (Basic Auth + TOTP 2FA)
- **Email Operations**: Complete (threading, unsubscribe, templates)
- **Real-time Updates**: Complete (EventSource push)
- **UI**: Settings integrated, DnD, context menus, mobile, keyboard, WCAG AA
- **Identity Management**: Complete (CRUD, sub-addressing, signatures)
- **Contacts/Address Book**: Complete (groups, vCard, bulk ops)
- **Advanced Search**: Complete (JMAP filters, search chips)
- **Vacation Responder**: Complete (JMAP VacationResponse)
- **Calendar**: Phase 5 complete (event detail popover, quick notes, drag-create, resize, recurring scope, quick create, duplication, import, notifications)
- **Email Filters**: Complete (Sieve RFC 9661, visual + raw editor)
- **Security**: CSP Report-Only + all P0 headers
- **Testing**: 669 tests passing
