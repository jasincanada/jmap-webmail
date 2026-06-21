# JasMail Product Features

User-facing feature catalog for JasMail (jasincanada/JasMail fork).

## Core mail

- JMAP webmail with three-pane layout, threading, search, compose, attachments
- OAuth2/OIDC and Basic Auth with encrypted session cookies
- Real-time push via EventSource, dark/light themes, 10 locales

## Duplicate detection (v1.6+)

- Configurable match criteria (Message-ID, subject, from, size, etc.)
- Folder and account-wide scanning with progress UI
- Highlight banner and per-group review on operations page

## Duplicate actions (v1.7+)

- **Scan-first, user-confirmed** — no automatic mailbox manipulation
- Built-in actions: review only, move to folder, move to dupes/, trash, archive, delete with 90-day retention in `deleted/`
- Action picker with tiered confirmation before any write
- Server-side SQLite audit trail (scan/apply progress, per-message change log)
- Daily purge of messages held in `deleted/` past retention period

## Planned (see ROADMAP.md)

- v1.8: Audit log UI, resume interrupted scans, per-group keeper override
- v2.0: Plugin action API, near-duplicate detection