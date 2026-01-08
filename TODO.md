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
- [x] Implement color tags with background tint display
- [x] Create compact dynamic color picker (hover to reveal)
- [x] Redesign Message Details with security & authentication indicators
- [x] Add SPF/DKIM/DMARC status display with visual indicators
- [x] Create organized sections for technical email details
- [x] Parse and display email header information
- [x] Add dark mode toggle with proper theme persistence
- [x] Add i18n (internationalization) support with English and French
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

### Address Book & Contacts
- [ ] Create contact store with Zustand
- [ ] Implement contact CRUD operations (create, read, update, delete)
- [ ] Create contacts list view with search/filter
- [ ] Add contact details view/edit form
- [ ] Implement contact groups/lists management
- [ ] Add vCard import/export support
- [ ] Sync contacts with JMAP server (if supported)
- [ ] Implement email autocomplete from contacts
- [ ] Integrate contacts with email composer
- [ ] Add bulk contact operations

### Advanced Features
- [ ] Implement filters and labels
- [ ] Add calendar integration (if server supports)
- [ ] Create email templates
- [ ] Add signature management
- [ ] Implement vacation responder settings
- [ ] Add email aliases support
- [ ] Create advanced search with filters
- [ ] Add email encryption support (PGP/GPG)

### Performance Optimizations
- [ ] Implement virtual scrolling for large email lists
- [ ] Add email content caching
- [ ] Optimize bundle size
- [ ] Add service worker for offline support
- [ ] Implement lazy loading for attachments
- [ ] Add image optimization for email content

### Testing
- [ ] Add unit tests for utilities
- [ ] Create component tests
- [ ] Add E2E tests with Playwright
- [ ] Test JMAP client methods
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
- [ ] Add health check endpoint
- [ ] Configure production build optimizations
- [ ] Set up monitoring and logging

### Security
- [x] Block external images/content by default (privacy protection)
- [x] Add user control for loading external content
- [x] Sanitize HTML email content with DOMPurify (comprehensive config with forbidden tags/attributes)
- [ ] Implement CSP headers (not configured in next.config)
- [ ] Add additional XSS protection layers (X-XSS-Protection, X-Content-Type-Options, X-Frame-Options)
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

## 📊 Code Audit Summary (Last verified: 2025-12-10)

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

### Feature Completeness
- **Authentication**: ✅ Complete (secure design, no password storage)
- **Email Operations**: ✅ Complete (including threading)
- **Real-time Updates**: ✅ Complete (EventSource push, toast notifications, status indicator)
- **UI Enhancements**: ✅ Settings fully integrated, drag-drop, context menus, mobile responsive, keyboard shortcuts
- **Contacts/Address Book**: ❌ Not started
- **Security**: ⚠️ Client-side done, server headers needed

