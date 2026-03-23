# Folder Management Design Spec

**Date:** 2026-03-23
**Issue:** GitHub #44 - IMAP folder menu
**Status:** Approved

## Overview

Add full CRUD folder management to the webmail sidebar: create, rename, move (reparent), and delete mailboxes. All operations are gated by JMAP `myRights` permissions. Personal mailboxes only (shared mailbox folder management excluded from scope).

## Scope

**In scope:**
- Create folders (top-level via "+" button, subfolders via context menu)
- Rename folders (inline editing via double-click, F2, or context menu)
- Move/reparent folders (drag-and-drop + context menu "Move to...")
- Delete folders (context menu, with content handling)

**Out of scope:**
- Shared mailbox folder management (personal only)
- Folder color/icon customization
- Folder subscription management (`isSubscribed`)
- Sort order editing (server-managed)
- Bulk folder operations

## UI Design

### Context Menu

Right-click any personal folder to see operations gated by `myRights`. The existing `handleMailboxContextMenu` guard (which only allows trash/junk with non-zero email count) must be fully replaced with a personal-mailbox-only check: `!mailbox.isShared && !mailbox.id.startsWith('shared-')`. This ensures the context menu appears on all personal folders, including empty ones.

| Action | Required Permission | Notes |
|--------|-------------------|-------|
| New subfolder | `mayCreateChild` | Creates child of right-clicked folder |
| Rename | `mayRename` | Triggers inline edit mode |
| Move to... | `mayRename` (changes parentId) | Submenu with folder tree (see Move To Picker below) |
| Empty folder | `mayRemoveItems` | Only for trash/junk (existing feature, preserved) |
| Delete folder | `mayDelete` | Confirmation dialog with content count |

Disabled items remain visible (greyed out with "no permission" indicator) so users understand the capability exists.

### Move To Picker (Context Menu Submenu)

The "Move to..." context menu item opens a submenu listing the folder tree, reusing the same pattern as the existing email "Move To" context submenu in `email-context-menu.tsx`:

- Flat list of personal folders with depth-based indentation
- Filters out: the folder being moved, its descendants (to prevent circular moves), and shared/virtual folders
- Checks `mayCreateChild` on target folder
- No search box (the submenu is compact; for deep trees, drag-and-drop is the alternative)

### Inline Rename

- **Triggers:** Double-click folder name, F2 key on selected folder, context menu "Rename"
- **UI:** Folder name replaced by text input with blue border, confirm (checkmark) and cancel (X) buttons
- **Keyboard:** Enter to confirm, Escape to cancel
- **Hint text:** "Enter to confirm, Escape to cancel" shown below input
- **Guards:** Ignored during active drag operations; only on folders with `mayRename`
- **F2 scope:** Handler attached to the sidebar container element (not `window`), only fires when no `<input>` or `<textarea>` is focused

### Create Folder

**Top-level folder ("+" button):**
- Small "+" icon button in the sidebar header, next to the "Folders" label
- Clicking it shows an inline input at the bottom of the personal folder list
- Green border to distinguish from rename (blue border)

**Subfolder (context menu):**
- "New subfolder" in context menu creates an inline input as a child of the target folder
- Parent folder auto-expands if collapsed
- Input indented to match child depth level

Both use: Enter to create, Escape to cancel, same hint text pattern.

### Folder Name Validation

- **Empty name:** Blocked client-side, input stays focused
- **Max length:** 200 characters (safe margin under server limits)
- **Forbidden characters:** `/` is disallowed (IMAP hierarchy separator, could cause unexpected nesting on some servers). Show inline error "Folder names cannot contain /"
- **Whitespace:** Leading/trailing whitespace trimmed before submission

### Delete Folder

**Folder with contents (recursive delete algorithm):**
1. Confirmation dialog shows email count and subfolder count
2. Message: "This folder contains N emails and M subfolders. All emails will be moved to Trash. Subfolders and their contents will also be moved to Trash."
3. Buttons: Cancel (neutral) / Delete (destructive red)
4. On confirm, the recursive delete proceeds bottom-up:
   - Collect all descendant folders (depth-first traversal)
   - For each folder, deepest first: move its emails to Trash using existing `client.queryMailboxEmailIds()` + `client.batchMoveEmails()`, then destroy the mailbox via `Mailbox/set`
   - Finally, move the parent's emails to Trash and destroy it

**Empty folder:**
- Simplified confirmation: "This folder is empty. It will be permanently deleted."
- Buttons: Cancel / Delete

**Special case - currently selected folder:**
- After deletion, auto-select Inbox

### Folder Drag-and-Drop (Reparenting)

- **Data format:** `application/x-mailbox-id` (distinct from email's `application/x-email-ids`)
- **Draggable:** Any personal folder where `mayRename` is true
- **Valid drop target:** Any personal folder where `mayCreateChild` is true
- **Circular prevention:** Cannot drop a folder onto itself or any of its descendants (client-side check)
- **Root drop:** Dropping on sidebar empty space moves folder to top level (`parentId: null`)
- **Visual feedback:** Same ring style as email drag (blue ring for valid, red ring for invalid)
- **Drop hint:** "drop to move inside" text on valid target during hover
- **Drag handle:** Entire folder row is draggable

#### DragDropContext Extension

The existing `DragDropContext` must be extended to support both email and folder drags:

- Add a `dragType: 'email' | 'mailbox' | null` field to the context state
- `startDrag` accepts an optional `type` parameter (defaults to `'email'` for backward compatibility)
- The `useMailboxDrop` hook is extended to check `dataTransfer` for both `application/x-email-ids` and `application/x-mailbox-id`:
  - If `x-email-ids`: existing email move behavior
  - If `x-mailbox-id`: reparent the folder (call `moveMailbox` store method)
- The `globalDragging` flag (`isDragging`) activates for both drag types, so drop handlers on sidebar folders are enabled during folder drags too
- Folder drag calls `startDrag(mailboxId, 'mailbox')` on drag start and `endDrag()` on drag end, just like email drags

## Architecture

### JMAP Client (`lib/jmap/client.ts`)

Three new methods:

**`createMailbox(name: string, parentId?: string): Promise<string>`**
- Calls `Mailbox/set` with `create`
- Inspects response for `notCreated` errors and throws typed error (see Error Handling)
- Returns server-assigned mailbox ID from `created` response

**`updateMailbox(id: string, changes: { name?: string; parentId?: string | null }): Promise<void>`**
- Calls `Mailbox/set` with `update`
- Inspects response for `notUpdated` errors and throws typed error
- Used for both rename (`name`) and reparent (`parentId`)
- Note: JMAP wire uses `null` for top-level parentId; the `Mailbox` type uses `undefined`. The client normalizes `null` to `undefined` when storing in state (consistent with existing `getMailboxes` behavior).

**`deleteMailbox(id: string): Promise<void>`**
- Reuses existing `queryMailboxEmailIds()` to enumerate emails and `batchMoveEmails()` to move them to Trash (same pattern as `emptyFolder`)
- Calls `Mailbox/set` with `destroy` and `onDestroyRemoveEmails: false` (explicit opt-out to ensure emails are moved to Trash, not permanently deleted)
- Inspects response for `notDestroyed` errors and throws typed error

### JMAP Error Typing

The three new client methods inspect `Mailbox/set` responses for `notCreated`/`notUpdated`/`notDestroyed` fields (per RFC 8620 section 5.3) and throw a `JMAPSetError` with structured info:

```typescript
interface JMAPSetError extends Error {
  type: string;        // e.g., "alreadyExists", "notFound", "forbidden", "invalidProperties"
  description?: string; // server-provided message
}
```

This allows the store layer to distinguish error types without string matching:
- `type === "alreadyExists"` -> "A folder with this name already exists"
- `type === "forbidden"` -> "You don't have permission for this action"
- Other types -> generic "Operation failed" message

### Store (`stores/email-store.ts`)

New methods wrapping JMAP calls with optimistic UI:

**`createMailbox(client, name, parentId?)`**
- Optimistically adds temp mailbox (`id: "temp-{timestamp}"`) to state
- The temp mailbox is marked non-interactive: click handler is disabled on `MailboxTreeItem` entries with `temp-` prefixed IDs, preventing users from selecting a folder with a transient ID
- On success: swaps temp ID with real server ID atomically (if `selectedMailbox` matches temp ID, it's updated too)
- On failure: removes temp entry, shows error toast (typed: name conflict vs generic)

**`renameMailbox(client, id, newName)`**
- Optimistically updates name in state
- On failure: restores previous name, shows error toast

**`moveMailbox(client, id, newParentId)`**
- Optimistically updates parentId in state
- On failure: restores previous parentId, shows error toast

**`deleteMailbox(client, id)`**
- If folder was selected: switch to Inbox first
- Collects all descendant mailbox IDs from current state (depth-first)
- For each descendant (deepest first) and then the target folder:
  - Moves emails to Trash via `client.queryMailboxEmailIds()` + `client.batchMoveEmails()` (reusing the same pattern as `emptyFolder`)
  - Destroys the mailbox via `client.deleteMailbox()`
- Optimistically removes all affected mailboxes from state before starting
- On failure: re-inserts removed mailboxes, shows error toast with partial progress info

### Sidebar Component (`components/layout/sidebar.tsx`)

Changes to existing component:

- **Replace context menu guard:** Remove both existing guards in `handleMailboxContextMenu` (role check and totalEmails check). Replace with personal-mailbox-only check: show menu on any folder where `!mailbox.isShared && !mailbox.id.startsWith('shared-')`
- **New state:** `renamingMailboxId: string | null`, `creatingSubfolder: { parentId: string | null } | null`
- **New handlers:** `onDoubleClick` on folder name for inline rename, F2 keyboard shortcut scoped to sidebar container
- **Folder drag:** Add `draggable` attribute and drag event handlers to `MailboxTreeItem`, using `application/x-mailbox-id` data format
- **"+" button:** Added to sidebar header next to "Folders" label
- **Temp folder guard:** `MailboxTreeItem` disables click handler for IDs starting with `temp-`

### i18n

New keys under `sidebar.folder_management.*` namespace across all 8 locales:

- `new_folder`, `new_subfolder`, `rename`, `move_to`, `delete_folder`
- `delete_confirm_title`, `delete_confirm_message`, `delete_confirm_with_contents`, `delete_confirm_empty`
- `folder_created`, `folder_renamed`, `folder_moved`, `folder_deleted`
- `folder_name_placeholder`, `folder_name_empty_error`, `folder_name_exists_error`, `folder_name_slash_error`, `folder_name_too_long_error`
- `create_error`, `rename_error`, `move_error`, `delete_error`, `permission_error`
- `no_permission`
- `drop_to_move_inside`

## Error Handling

| Scenario | Behavior |
|----------|----------|
| JMAP call fails (network) | Rollback optimistic update, show toast with error |
| Name conflict (`alreadyExists`) | Rollback, toast "A folder with this name already exists" |
| Permission denied (`forbidden`) | Rollback, toast "You don't have permission for this action" |
| Empty name | Client-side validation, prevent submit, keep input focused |
| Name contains `/` | Client-side validation, show inline error |
| Name exceeds 200 chars | Client-side validation, show inline error |
| Folder deleted by another session | Next `fetchMailboxes` removes it naturally |
| Delete currently selected folder | Auto-select Inbox after deletion |
| Rename during active drag | Ignore double-click/F2 |
| Circular reparent attempt | Prevented client-side (traverse ancestors before JMAP call) |
| User clicks temp folder before create completes | Click handler disabled on `temp-` IDs |
| Recursive delete partially fails | Re-insert remaining folders, toast with partial progress |
