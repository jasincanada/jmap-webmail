# JMAP Webmail

A modern, privacy-focused webmail client built with Next.js and the JMAP protocol.

## Screenshots

### Login
![Login](screenshots/01-login.png)

### Inbox
![Inbox](screenshots/02-inbox.png)

### Email Viewer
![Email Viewer](screenshots/03-email-viewer.png)

### Compose
![Compose](screenshots/04-compose.png)

### Dark Mode
![Dark Mode](screenshots/05-dark-mode.png)

### Settings
![Settings](screenshots/06-settings.png)

## Features

### Core Email
- **Modern UI** - Clean, minimalist three-pane layout
- **Email Threading** - Gmail-style conversation view with inline expansion
- **Real-time Updates** - Push notifications for new emails via EventSource
- **Attachments** - Upload and download file attachments
- **Search** - Full-text email search with pagination
- **Draft Auto-save** - Never lose your work while composing

### Identity & Privacy
- **Identity Management** - Multiple email identities with custom signatures
- **Sub-Addressing** - Generate tagged email addresses (user+tag@domain.com) for better organization
- **Newsletter Management** - RFC 2369 one-click unsubscribe with security validation
- **Spam Reporting** - Mark emails as spam with bidirectional handling and batch operations
- **External Content Blocking** - Privacy protection with user-controlled image loading
- **Shared Folders** - Multi-account access with proper ID namespacing

### User Experience
- **Keyboard Shortcuts** - Navigate efficiently with vim-style hotkeys (j/k, r, f, etc.)
- **Context Menus** - Right-click for quick actions on emails
- **Drag & Drop** - Move emails between folders with native HTML5 DnD
- **Color Tags** - Organize emails with color labels
- **Dark Mode** - Full dark theme with intelligent email color transformation for readability
- **i18n** - English, French, and Japanese language support with auto-detection
- **Mobile Responsive** - Adaptive single/multi-pane layout for all screen sizes

## Tech Stack

- **Framework**: Next.js 16 with Turbopack
- **Styling**: Tailwind CSS v4
- **State**: Zustand
- **Protocol**: JMAP (RFC 8620)
- **i18n**: next-intl

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and connect to your JMAP server.

## Configuration

Create a `.env.local` file:

```env
APP_NAME=Your Webmail
JMAP_SERVER_URL=https://your-jmap-server.com
```

### Runtime vs Build-time Configuration

| Variable | Type | Description |
|----------|------|-------------|
| `APP_NAME` | Runtime | App name displayed in the UI |
| `JMAP_SERVER_URL` | Runtime | JMAP server URL (required) |
| `NEXT_PUBLIC_APP_NAME` | Build-time | Legacy fallback for app name |
| `NEXT_PUBLIC_JMAP_SERVER_URL` | Build-time | Legacy fallback for server URL |

**Runtime variables** are read at request time, enabling post-build configuration (ideal for Docker).

**Build-time variables** are baked into the bundle and require a rebuild to change.

## License

MIT
