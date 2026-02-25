# JMAP Webmail - Roadmap

This document tracks the development status and planned features for JMAP Webmail.

## Completed Features

### Core Infrastructure
- [x] Next.js 16 with TypeScript and App Router
- [x] Tailwind CSS v4 with Oxide engine
- [x] Zustand state management
- [x] JMAP client implementation (jmap-jam)

### Authentication
- [x] Login with JMAP server authentication
- [x] Session management (no password storage for security)
- [x] Username autocomplete with history
- [x] Logout functionality
- [x] Authentication error handling
- [x] OAuth2/OIDC with PKCE (SSO login, session persistence, RP-initiated logout)

### JMAP Server Connection
- [x] Session establishment and keep-alive
- [x] Connection error handling and retries
- [x] Storage quota display with progress bar
- [x] Server capability detection
- [x] Shared folders support (multi-account access)

### Email Operations
- [x] Email fetching and display
- [x] Full HTML email rendering
- [x] Compose, reply, reply-all, forward
- [x] Draft auto-save with discard confirmation
- [x] Mark as read/unread with configurable delay
- [x] Star/unstar emails
- [x] Delete and archive
- [x] Color tags/labels with background tint display
- [x] Full-text search with pagination
- [x] Attachment upload and download
- [x] Batch operations (multi-select)
- [x] Quick reply form with auto-expand
- [x] Email threading (Gmail-style inline expansion)
- [x] Spam reporting with bidirectional handling (mark as spam / not spam)
- [x] Batch spam operations (mark multiple emails)
- [x] Newsletter unsubscribe (RFC 2369 List-Unsubscribe support)

### Identity Management
- [x] Multiple email identities with CRUD operations
- [x] Per-identity custom signatures
- [x] Identity selector in composer
- [x] Sub-addressing support (user+tag@domain.com)
- [x] Sub-address helper with tag suggestions
- [x] Identity badges in email viewer and list
- [x] Identities settings panel

### Real-time Updates
- [x] EventSource for JMAP push notifications
- [x] State synchronization
- [x] Email arrival notifications with toast messages
- [x] Real-time unread counts
- [x] Mailbox change handling
- [x] Connection status indicator

### User Interface
- [x] Three-pane layout (sidebar, list, viewer)
- [x] Minimalist design system with gray palette
- [x] Dark and light theme support with system preference detection
- [x] Dark mode email readability (intelligent color transformation)
- [x] Custom scrollbars
- [x] Mobile responsive design with adaptive layout
- [x] Keyboard shortcuts (j/k navigation, r/f actions, etc.)
- [x] Drag-and-drop email organization
- [x] Right-click context menus
- [x] Hierarchical mailbox display
- [x] Email list with avatars and visual hierarchy
- [x] Expandable email headers with technical details
- [x] External content warning banner (unified with unsubscribe)
- [x] SPF/DKIM/DMARC status indicators
- [x] Loading states and skeletons
- [x] Smooth transitions with cross-fade effects
- [x] Infinite scroll pagination
- [x] Error boundaries
- [x] Settings page with multiple categories

### Internationalization
- [x] English language support
- [x] French language support
- [x] Japanese language support
- [x] Automatic browser language detection
- [x] Language preference persistence
- [x] Timezone auto-detection

### Security & Privacy
- [x] External content blocked by default (privacy protection)
- [x] HTML sanitization with DOMPurify (comprehensive XSS prevention)
- [x] User control for loading external content (ask/block/allow policies)
- [x] Newsletter unsubscribe URL validation (protocol whitelist)
- [x] Spam reporting with undo mechanism
- [x] Email header security indicators (SPF/DKIM/DMARC)
- [x] Trusted senders list for automatic image loading

### Deployment
- [x] Runtime environment variables (Docker-friendly configuration)
- [x] Environment variable management (.env.local and .env.example)

## Planned Features

### Address Book & Contacts
- [ ] Contact store with CRUD operations
- [ ] Contacts list view with search/filter
- [ ] Contact details view/edit form
- [ ] Contact groups management
- [ ] vCard import/export
- [ ] JMAP contacts sync (if server supports)
- [ ] Email autocomplete from contacts
- [ ] Contacts integration in composer
- [ ] Bulk contact operations

### Advanced Features
- [ ] Email filters and rules
- [ ] Calendar integration (JMAP Calendars)
- [ ] Email templates
- [ ] Vacation responder settings
- [ ] Advanced search with filters
- [ ] Email encryption (PGP/GPG)

### Performance Optimizations
- [ ] Virtual scrolling for large lists
- [ ] Email content caching
- [ ] Bundle size optimization
- [ ] Service worker for offline support
- [ ] Lazy loading for attachments
- [ ] Image optimization for email content

### Testing
- [x] Unit tests for utilities (validation, color transformation - 97 tests)
- [ ] Component tests
- [ ] E2E tests with Playwright
- [ ] Accessibility testing
- [ ] Performance testing

### Deployment
- [ ] Health check endpoint
- [ ] Production build optimizations
- [ ] Monitoring and logging

### Security Enhancements
- [ ] CSP headers configuration
- [ ] Additional XSS protection layers (X-XSS-Protection, etc.)
- [ ] Rate limiting
- [ ] CORS configuration

## Known Issues

- [ ] Next.js workspace root warning (cosmetic)

## Contributing

Want to help implement a feature? Check out our [CONTRIBUTING.md](CONTRIBUTING.md) guide!
