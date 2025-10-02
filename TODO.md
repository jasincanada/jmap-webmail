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
- [x] Add session management
- [x] Implement logout functionality
- [x] Add remember me functionality
- [x] Handle authentication errors

### JMAP Server Connection
- [x] Connect to real JMAP server (mail.ma2t.com)
- [x] Implement session establishment
- [x] Handle connection errors and retries
- [x] Fetch and display storage quota
- [ ] Add server capability detection
- [ ] Implement keep-alive mechanism

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
- [ ] Add draft auto-save
- [x] Add attachment download support
- [ ] Add attachment upload support
- [ ] Implement batch operations (mark read/unread, delete multiple)
- [ ] Add email threading support

### Real-time Updates
- [ ] Set up EventSource for JMAP push notifications
- [ ] Implement state synchronization
- [ ] Handle email arrival notifications
- [ ] Update unread counts in real-time
- [ ] Handle mailbox changes

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
- [ ] Add loading states and skeletons
- [ ] Implement error boundaries
- [ ] Create settings page
- [ ] Add keyboard shortcuts (j/k navigation, etc.)
- [ ] Implement drag-and-drop for emails
- [ ] Add context menus
- [ ] Create mobile-responsive design
- [ ] Implement pagination/infinite scroll for email list

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
- [ ] Add health check endpoint
- [ ] Configure production build optimizations
- [ ] Set up monitoring and logging

### Security
- [x] Block external images/content by default (privacy protection)
- [x] Add user control for loading external content
- [x] Sanitize HTML email content with DOMPurify
- [ ] Implement CSP headers
- [ ] Add additional XSS protection layers
- [ ] Implement rate limiting
- [ ] Add CORS configuration
- [ ] Implement secure cookie handling

## 🐛 Known Issues
- [ ] Fix Next.js workspace root warning
- [x] Handle port conflicts more gracefully (using port 3001)
- [ ] Improve error messages for failed JMAP operations
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

