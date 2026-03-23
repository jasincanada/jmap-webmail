# Folder Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full CRUD folder management (create, rename, move, delete) to the sidebar, gated by JMAP `myRights` permissions.

**Architecture:** Extend the JMAP client with `Mailbox/set` operations, add store methods with optimistic UI, extend the sidebar context menu and add inline editing. Folder drag-and-drop reuses the existing `DragDropContext` with a new `dragType` discriminant.

**Tech Stack:** Next.js 16, TypeScript, Zustand, JMAP RFC 8620/8621, next-intl (8 locales), Tailwind v4, Lucide icons

**Spec:** `docs/superpowers/specs/2026-03-23-folder-management-design.md`

---

### Task 1: JMAP Client - Mailbox/set Methods

**Files:**
- Modify: `lib/jmap/client.ts` (add 3 new methods after `batchMoveEmails` at ~line 763)

- [ ] **Step 1: Add `JMAPSetError` class**

Add this error class at the top of `client.ts`, after the interface definitions (~line 50):

```typescript
export class JMAPSetError extends Error {
  type: string;
  description?: string;
  constructor(type: string, description?: string) {
    super(description || `Mailbox/set error: ${type}`);
    this.name = 'JMAPSetError';
    this.type = type;
    this.description = description;
  }
}
```

- [ ] **Step 2: Add `createMailbox` method**

Add after `batchMoveEmails` method (~line 763):

```typescript
async createMailbox(name: string, parentId?: string): Promise<string> {
  const create: Record<string, unknown> = { name };
  if (parentId) create.parentId = parentId;

  const response = await this.request([
    ["Mailbox/set", {
      accountId: this.accountId,
      create: { "new-mailbox": create },
    }, "0"],
  ]);

  const result = response.methodResponses?.[0]?.[1];
  if (result?.notCreated?.["new-mailbox"]) {
    const err = result.notCreated["new-mailbox"];
    throw new JMAPSetError(err.type || "unknown", err.description);
  }

  const realId = result?.created?.["new-mailbox"]?.id;
  if (!realId) throw new JMAPSetError("unknown", "Server did not return created mailbox ID");
  return realId;
}
```

- [ ] **Step 3: Add `updateMailbox` method**

```typescript
async updateMailbox(id: string, changes: { name?: string; parentId?: string | null }): Promise<void> {
  const response = await this.request([
    ["Mailbox/set", {
      accountId: this.accountId,
      update: { [id]: changes },
    }, "0"],
  ]);

  const result = response.methodResponses?.[0]?.[1];
  if (result?.notUpdated?.[id]) {
    const err = result.notUpdated[id];
    throw new JMAPSetError(err.type || "unknown", err.description);
  }
}
```

- [ ] **Step 4: Add `destroyMailbox` method**

```typescript
async destroyMailbox(id: string): Promise<void> {
  const response = await this.request([
    ["Mailbox/set", {
      accountId: this.accountId,
      destroy: [id],
      onDestroyRemoveEmails: false,
    }, "0"],
  ]);

  const result = response.methodResponses?.[0]?.[1];
  if (result?.notDestroyed?.[id]) {
    const err = result.notDestroyed[id];
    throw new JMAPSetError(err.type || "unknown", err.description);
  }
}
```

- [ ] **Step 5: Verify build**

Run: `npm run build 2>&1 | head -30`
Expected: No TypeScript errors in `client.ts`

- [ ] **Step 6: Commit**

```bash
git add lib/jmap/client.ts
git commit -m "feat(jmap): add Mailbox/set methods for create, update, destroy (#44)"
```

---

### Task 2: Email Store - Mailbox Management Methods

**Files:**
- Modify: `stores/email-store.ts` (add interface methods at ~line 100, implementations after `emptyFolder` at ~line 1232)

- [ ] **Step 1: Add store interface methods**

Add after the `emptyFolder` signature (line ~100), before `loadMockData`:

```typescript
// Folder management
createMailbox: (client: JMAPClient, name: string, parentId?: string) => Promise<string | null>;
renameMailbox: (client: JMAPClient, mailboxId: string, newName: string) => Promise<boolean>;
moveMailbox: (client: JMAPClient, mailboxId: string, newParentId: string | null) => Promise<boolean>;
deleteMailbox: (client: JMAPClient, mailboxId: string) => Promise<boolean>;
```

- [ ] **Step 2: Implement `createMailbox`**

Add implementation after `emptyFolder` (~line 1232), before `loadMockData`:

```typescript
createMailbox: async (client, name, parentId) => {
  const tempId = `temp-${Date.now()}`;
  const mailboxes = get().mailboxes;

  // Find the parent to determine depth for sortOrder
  const parentMailbox = parentId ? mailboxes.find(mb => mb.id === parentId) : null;
  const tempMailbox: Mailbox = {
    id: tempId,
    name,
    parentId: parentId || undefined,
    sortOrder: 999,
    totalEmails: 0,
    unreadEmails: 0,
    totalThreads: 0,
    unreadThreads: 0,
    myRights: {
      mayReadItems: true, mayAddItems: true, mayRemoveItems: true,
      maySetSeen: true, maySetKeywords: true, mayCreateChild: true,
      mayRename: true, mayDelete: true, maySubmit: false,
    },
    isSubscribed: true,
  };

  // Optimistic add
  set({ mailboxes: [...mailboxes, tempMailbox] });

  try {
    const realId = await client.createMailbox(name, parentId);

    // Swap temp ID with real ID
    set((state) => {
      const updated = state.mailboxes.map(mb =>
        mb.id === tempId ? { ...mb, id: realId } : mb
      );
      const newState: Partial<EmailStore> = { mailboxes: updated };
      if (state.selectedMailbox === tempId) {
        newState.selectedMailbox = realId;
      }
      return newState;
    });

    return realId;
  } catch (error) {
    // Rollback
    set({ mailboxes: get().mailboxes.filter(mb => mb.id !== tempId) });
    throw error;
  }
},
```

- [ ] **Step 3: Implement `renameMailbox`**

```typescript
renameMailbox: async (client, mailboxId, newName) => {
  const mailboxes = get().mailboxes;
  const mailbox = mailboxes.find(mb => mb.id === mailboxId);
  if (!mailbox) return false;

  const previousName = mailbox.name;
  const jmapId = mailbox.originalId || mailboxId;

  // Optimistic update
  set({
    mailboxes: mailboxes.map(mb =>
      mb.id === mailboxId ? { ...mb, name: newName } : mb
    ),
  });

  try {
    await client.updateMailbox(jmapId, { name: newName });
    return true;
  } catch (error) {
    // Rollback
    set({
      mailboxes: get().mailboxes.map(mb =>
        mb.id === mailboxId ? { ...mb, name: previousName } : mb
      ),
    });
    throw error;
  }
},
```

- [ ] **Step 4: Implement `moveMailbox`**

```typescript
moveMailbox: async (client, mailboxId, newParentId) => {
  const mailboxes = get().mailboxes;
  const mailbox = mailboxes.find(mb => mb.id === mailboxId);
  if (!mailbox) return false;

  const previousParentId = mailbox.parentId;
  const jmapId = mailbox.originalId || mailboxId;

  // Optimistic update
  set({
    mailboxes: mailboxes.map(mb =>
      mb.id === mailboxId ? { ...mb, parentId: newParentId || undefined } : mb
    ),
  });

  try {
    await client.updateMailbox(jmapId, { parentId: newParentId });
    return true;
  } catch (error) {
    // Rollback
    set({
      mailboxes: get().mailboxes.map(mb =>
        mb.id === mailboxId ? { ...mb, parentId: previousParentId } : mb
      ),
    });
    throw error;
  }
},
```

- [ ] **Step 5: Implement `deleteMailbox`**

```typescript
deleteMailbox: async (client, mailboxId) => {
  const mailboxes = get().mailboxes;
  const mailbox = mailboxes.find(mb => mb.id === mailboxId);
  if (!mailbox) return false;

  // If this folder is selected, switch to inbox first
  if (get().selectedMailbox === mailboxId) {
    const inbox = mailboxes.find(mb => mb.role === 'inbox');
    if (inbox) set({ selectedMailbox: inbox.id });
  }

  // Collect all descendants (depth-first)
  const collectDescendants = (parentId: string): Mailbox[] => {
    const children = mailboxes.filter(mb => mb.parentId === parentId);
    const descendants: Mailbox[] = [];
    for (const child of children) {
      descendants.push(...collectDescendants(child.id));
      descendants.push(child);
    }
    return descendants;
  };

  const descendants = collectDescendants(mailboxId);
  const allToDelete = [...descendants, mailbox]; // deepest first, parent last
  const allIds = new Set(allToDelete.map(mb => mb.id));

  // Find trash mailbox for moving emails
  const trashMailbox = mailboxes.find(mb => mb.role === 'trash');
  const trashId = trashMailbox?.originalId || trashMailbox?.id;

  // Optimistic removal
  set({ mailboxes: mailboxes.filter(mb => !allIds.has(mb.id)) });

  try {
    for (const mb of allToDelete) {
      const jmapId = mb.originalId || mb.id;

      // Move emails to trash if trash exists and folder has emails
      if (trashId && mb.totalEmails > 0) {
        let position = 0;
        while (true) {
          const batch = await client.queryMailboxEmailIds(jmapId, 500, position);
          if (batch.ids.length === 0) break;
          await client.batchMoveEmails(batch.ids, trashId);
          if (batch.ids.length < 500) break;
          position = 0; // Reset position since emails were moved out
        }
      }

      await client.destroyMailbox(jmapId);
    }

    // Refresh mailbox list from server
    await get().fetchMailboxes(client);
    return true;
  } catch (error) {
    // Rollback: re-fetch from server to get accurate state
    await get().fetchMailboxes(client);
    throw error;
  }
},
```

- [ ] **Step 6: Verify build**

Run: `npm run build 2>&1 | head -30`
Expected: No TypeScript errors

- [ ] **Step 7: Commit**

```bash
git add stores/email-store.ts
git commit -m "feat(store): add mailbox CRUD methods with optimistic UI (#44)"
```

---

### Task 3: DragDropContext Extension

**Files:**
- Modify: `contexts/drag-drop-context.tsx`
- Modify: `hooks/use-email-drag.ts` (minor: pass drag type)

- [ ] **Step 1: Add `dragType` to context**

Replace the `DragDropState` interface and `startDrag` signature in `contexts/drag-drop-context.tsx`:

```typescript
type DragType = 'email' | 'mailbox';

interface DragDropState {
  isDragging: boolean;
  dragType: DragType | null;
  draggedEmails: Email[];
  dragCount: number;
  sourceMailboxId: string | null;
  draggedMailboxId: string | null;
}

interface DragDropContextValue extends DragDropState {
  startDrag: (emails: Email[], sourceMailboxId: string, type?: DragType) => void;
  startMailboxDrag: (mailboxId: string) => void;
  endDrag: () => void;
}
```

- [ ] **Step 2: Update initial state and provider**

```typescript
const initialState: DragDropState = {
  isDragging: false,
  dragType: null,
  draggedEmails: [],
  dragCount: 0,
  sourceMailboxId: null,
  draggedMailboxId: null,
};
```

Update the `DragDropProvider` function:

```typescript
export function DragDropProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DragDropState>(initialState);

  const startDrag = useCallback((emails: Email[], sourceMailboxId: string, type: DragType = 'email') => {
    setState({
      isDragging: true,
      dragType: type,
      draggedEmails: emails,
      dragCount: emails.length,
      sourceMailboxId,
      draggedMailboxId: null,
    });
  }, []);

  const startMailboxDrag = useCallback((mailboxId: string) => {
    setState({
      isDragging: true,
      dragType: 'mailbox',
      draggedEmails: [],
      dragCount: 0,
      sourceMailboxId: null,
      draggedMailboxId: mailboxId,
    });
  }, []);

  const endDrag = useCallback(() => {
    setState(initialState);
  }, []);

  return (
    <DragDropContext.Provider value={{ ...state, startDrag, startMailboxDrag, endDrag }}>
      {children}
    </DragDropContext.Provider>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build 2>&1 | head -30`
Expected: No errors (existing callers of `startDrag` are backward-compatible since `type` defaults to `'email'`)

- [ ] **Step 4: Commit**

```bash
git add contexts/drag-drop-context.tsx
git commit -m "feat(drag-drop): extend context with dragType for mailbox drag support (#44)"
```

---

### Task 4: Extend useMailboxDrop for Folder Drops

**Files:**
- Modify: `hooks/use-mailbox-drop.ts` (extend `handleDrop` to handle both email and mailbox drops)

- [ ] **Step 1: Add mailbox drop handling**

Import the store and add mailbox reparent logic. In `use-mailbox-drop.ts`:

In `isValidTarget`, add a check for mailbox drag type. The current logic checks `mailbox.id === sourceMailboxId` which is for email drags. For mailbox drags, we need different validation. Update `isValidTarget`:

```typescript
const { isDragging, sourceMailboxId, draggedEmails, draggedMailboxId, dragType, endDrag } = useDragDropContext();

const isValidTarget = useCallback(() => {
  if (!isDragging) return false;

  if (dragType === 'mailbox') {
    // Cannot drop on itself
    if (mailbox.id === draggedMailboxId) return false;
    // Cannot drop on shared/virtual nodes
    if (mailbox.id.startsWith("shared-") || mailbox.isShared) return false;
    // Must be able to create children
    if (!mailbox.myRights?.mayCreateChild) return false;
    // Cannot drop on a descendant (circular check done in handleDrop)
    return true;
  }

  // Email drag validation (existing logic)
  if (mailbox.id === sourceMailboxId) return false;
  if (!mailbox.myRights?.mayAddItems) return false;
  if (mailbox.id.startsWith("shared-")) return false;
  if (mailbox.isShared && draggedEmails[0]) {
    const mailboxes = useEmailStore.getState().mailboxes;
    const sourceMb = mailboxes.find(mb => mb.id === sourceMailboxId);
    if (sourceMb?.accountId !== mailbox.accountId) return false;
  }
  return true;
}, [isDragging, mailbox, sourceMailboxId, draggedEmails, draggedMailboxId, dragType]);
```

- [ ] **Step 2: Extend `handleDrop` for mailbox reparenting**

In `handleDrop`, after `e.stopPropagation()` and `setIsOver(false)`, add mailbox drop handling before the existing email logic:

```typescript
const handleDrop = useCallback(async (e: DragEvent<HTMLDivElement>) => {
  e.preventDefault();
  e.stopPropagation();
  setIsOver(false);

  if (!client || !isValidTarget()) {
    endDrag();
    return;
  }

  // Handle mailbox drop (reparenting)
  const mailboxIdData = e.dataTransfer.getData("application/x-mailbox-id");
  if (mailboxIdData && dragType === 'mailbox') {
    try {
      const { moveMailbox } = useEmailStore.getState();

      // Circular check: ensure target is not a descendant of the dragged mailbox
      const allMailboxes = useEmailStore.getState().mailboxes;
      const isDescendant = (parentId: string, checkId: string): boolean => {
        const children = allMailboxes.filter(mb => mb.parentId === parentId);
        return children.some(c => c.id === checkId || isDescendant(c.id, checkId));
      };

      if (isDescendant(mailboxIdData, mailbox.id)) {
        endDrag();
        return;
      }

      await moveMailbox(client, mailboxIdData, mailbox.id);

      if (onSuccess) {
        onSuccess(1, mailbox.name);
      }
    } catch (error) {
      if (onError) {
        onError(error instanceof Error ? error.message : 'Unknown error');
      }
    } finally {
      endDrag();
    }
    return;
  }

  // Handle email drop (existing logic below)
  try {
    const emailIdsJson = e.dataTransfer.getData("application/x-email-ids");
    // ... rest of existing email drop logic unchanged
```

- [ ] **Step 3: Verify build**

Run: `npm run build 2>&1 | head -30`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add hooks/use-mailbox-drop.ts
git commit -m "feat(drag-drop): handle mailbox reparenting on drop (#44)"
```

---

### Task 5: i18n - Add Translation Keys

**Files:**
- Modify: `locales/en/common.json`
- Modify: `locales/fr/common.json`
- Modify: `locales/ja/common.json`
- Modify: `locales/es/common.json`
- Modify: `locales/it/common.json`
- Modify: `locales/de/common.json`
- Modify: `locales/nl/common.json`
- Modify: `locales/pt/common.json`

- [ ] **Step 1: Add English translations**

Add inside `sidebar` object, after `empty_folder` block (~line 103):

```json
"folder_management": {
  "new_folder": "New folder",
  "new_subfolder": "New subfolder",
  "rename": "Rename",
  "move_to": "Move to...",
  "delete_folder": "Delete folder",
  "delete_confirm_title": "Delete \"{name}\"?",
  "delete_confirm_with_contents": "This folder contains {emails} emails and {subfolders} subfolders. All emails will be moved to Trash.",
  "delete_confirm_empty": "This folder is empty. It will be permanently deleted.",
  "folder_created": "Folder \"{name}\" created",
  "folder_renamed": "Folder renamed to \"{name}\"",
  "folder_moved": "Folder moved to \"{destination}\"",
  "folder_moved_to_root": "Folder moved to top level",
  "folder_deleted": "Folder \"{name}\" deleted",
  "folder_name_placeholder": "Folder name...",
  "folder_name_empty_error": "Folder name cannot be empty",
  "folder_name_exists_error": "A folder with this name already exists",
  "folder_name_slash_error": "Folder names cannot contain /",
  "folder_name_too_long_error": "Folder name is too long (max 200 characters)",
  "create_error": "Failed to create folder",
  "rename_error": "Failed to rename folder",
  "move_error": "Failed to move folder",
  "delete_error": "Failed to delete folder",
  "permission_error": "You don't have permission for this action",
  "no_permission": "No permission",
  "drop_to_move_inside": "Drop to move inside",
  "enter_to_confirm": "Enter to confirm · Escape to cancel",
  "enter_to_create": "Enter to create · Escape to cancel",
  "no_available_targets": "No available folders",
  "move_to_top_level": "Top level"
}
```

- [ ] **Step 2: Add French translations**

Same structure in `locales/fr/common.json`:

```json
"folder_management": {
  "new_folder": "Nouveau dossier",
  "new_subfolder": "Nouveau sous-dossier",
  "rename": "Renommer",
  "move_to": "Deplacer vers...",
  "delete_folder": "Supprimer le dossier",
  "delete_confirm_title": "Supprimer \"{name}\" ?",
  "delete_confirm_with_contents": "Ce dossier contient {emails} e-mails et {subfolders} sous-dossiers. Tous les e-mails seront deplaces dans la corbeille.",
  "delete_confirm_empty": "Ce dossier est vide. Il sera definitivement supprime.",
  "folder_created": "Dossier \"{name}\" cree",
  "folder_renamed": "Dossier renomme en \"{name}\"",
  "folder_moved": "Dossier deplace vers \"{destination}\"",
  "folder_moved_to_root": "Dossier deplace au niveau racine",
  "folder_deleted": "Dossier \"{name}\" supprime",
  "folder_name_placeholder": "Nom du dossier...",
  "folder_name_empty_error": "Le nom du dossier ne peut pas etre vide",
  "folder_name_exists_error": "Un dossier avec ce nom existe deja",
  "folder_name_slash_error": "Le nom du dossier ne peut pas contenir /",
  "folder_name_too_long_error": "Le nom du dossier est trop long (200 caracteres max.)",
  "create_error": "Impossible de creer le dossier",
  "rename_error": "Impossible de renommer le dossier",
  "move_error": "Impossible de deplacer le dossier",
  "delete_error": "Impossible de supprimer le dossier",
  "permission_error": "Vous n'avez pas la permission d'effectuer cette action",
  "no_permission": "Pas de permission",
  "drop_to_move_inside": "Deposer pour deplacer a l'interieur",
  "enter_to_confirm": "Entree pour confirmer · Echap pour annuler",
  "enter_to_create": "Entree pour creer · Echap pour annuler",
  "no_available_targets": "Aucun dossier disponible",
  "move_to_top_level": "Niveau racine"
}
```

- [ ] **Step 3: Add remaining 6 locale translations**

Include the `no_available_targets` and `move_to_top_level` keys in all locales.

Add equivalent translations for `ja`, `es`, `it`, `de`, `nl`, `pt` following the same structure. Use accurate translations for each language.

- [ ] **Step 4: Validate all JSON files**

Run: `for f in locales/*/common.json; do echo "$f:"; python3 -m json.tool "$f" > /dev/null && echo "OK" || echo "FAIL"; done`
Expected: All 8 files show "OK"

- [ ] **Step 5: Commit**

```bash
git add locales/*/common.json
git commit -m "feat(i18n): add folder management translation keys for all 8 locales (#44)"
```

---

### Task 6: Sidebar Context Menu - Full Folder Operations

**Files:**
- Modify: `components/layout/sidebar.tsx`

This is the largest task. It modifies the sidebar to add: expanded context menu, inline rename, inline create, folder drag, and "+" button.

- [ ] **Step 1: Add new imports and state**

Add to imports at top of sidebar.tsx:

```typescript
import { Plus, FolderPlus, Edit3, FolderInput } from "lucide-react";
import { JMAPSetError } from "@/lib/jmap/client";
```

Note: `Trash2` is already imported in `sidebar.tsx` (line 13) - reuse it for the delete button. Also add `flattenMailboxTree` to the existing `@/lib/utils` import (line 31): `import { cn, buildMailboxTree, flattenMailboxTree, MailboxNode, formatFileSize } from "@/lib/utils";`. Add `useRef` to the React import if not already present.

In the `Sidebar` component function, add new state after existing state declarations (~line 443):

```typescript
const sidebarRef = useRef<HTMLDivElement>(null);
const [renamingMailboxId, setRenamingMailboxId] = useState<string | null>(null);
const [creatingSubfolder, setCreatingSubfolder] = useState<{ parentId: string | null } | null>(null);
const { createMailbox, renameMailbox, moveMailbox, deleteMailbox, fetchMailboxes } = useEmailStore();
const [deleteFolderTarget, setDeleteFolderTarget] = useState<Mailbox | null>(null);
const tFolder = useTranslations('sidebar.folder_management');
```

Also add `ref={sidebarRef}` to the outer sidebar container `<div>` (~line 569).

- [ ] **Step 2: Replace `handleMailboxContextMenu`**

Replace the existing `handleMailboxContextMenu` callback (~line 509-514):

```typescript
const handleMailboxContextMenu = useCallback((e: React.MouseEvent, mailbox: Mailbox) => {
  // Only show for personal mailboxes (not shared/virtual)
  if (mailbox.isShared || mailbox.id.startsWith('shared-')) return;
  e.preventDefault();
  setContextMenu({ x: e.clientX, y: e.clientY, mailbox });
}, []);
```

- [ ] **Step 3: Add folder operation handlers**

Add after `handleMailboxContextMenu`:

```typescript
const handleCreateFolder = useCallback(async (name: string, parentId?: string) => {
  if (!client) return;
  const trimmed = name.trim();
  if (!trimmed) return;
  if (trimmed.includes('/')) {
    toast.error(tFolder('create_error'), tFolder('folder_name_slash_error'));
    return;
  }
  if (trimmed.length > 200) {
    toast.error(tFolder('create_error'), tFolder('folder_name_too_long_error'));
    return;
  }

  try {
    await createMailbox(client, trimmed, parentId);
    toast.success(tFolder('folder_created', { name: trimmed }));
  } catch (error) {
    if (error instanceof JMAPSetError && error.type === 'alreadyExists') {
      toast.error(tFolder('create_error'), tFolder('folder_name_exists_error'));
    } else {
      toast.error(tFolder('create_error'));
    }
  }
  setCreatingSubfolder(null);
}, [client, createMailbox, tFolder]);

const handleRenameFolder = useCallback(async (mailboxId: string, newName: string) => {
  if (!client) return;
  const trimmed = newName.trim();
  if (!trimmed) {
    setRenamingMailboxId(null);
    return;
  }
  if (trimmed.includes('/')) {
    toast.error(tFolder('rename_error'), tFolder('folder_name_slash_error'));
    setRenamingMailboxId(null);
    return;
  }
  if (trimmed.length > 200) {
    toast.error(tFolder('rename_error'), tFolder('folder_name_too_long_error'));
    setRenamingMailboxId(null);
    return;
  }

  try {
    await renameMailbox(client, mailboxId, trimmed);
    toast.success(tFolder('folder_renamed', { name: trimmed }));
  } catch (error) {
    if (error instanceof JMAPSetError && error.type === 'alreadyExists') {
      toast.error(tFolder('rename_error'), tFolder('folder_name_exists_error'));
    } else {
      toast.error(tFolder('rename_error'));
    }
  }
  setRenamingMailboxId(null);
}, [client, renameMailbox, tFolder]);

const handleDeleteFolder = useCallback(async () => {
  if (!deleteFolderTarget || !client) return;
  const folderName = deleteFolderTarget.name;
  const targetId = deleteFolderTarget.id;
  setDeleteFolderTarget(null);

  try {
    await deleteMailbox(client, targetId);
    toast.success(tFolder('folder_deleted', { name: folderName }));
  } catch (error) {
    if (error instanceof JMAPSetError && error.type === 'forbidden') {
      toast.error(tFolder('delete_error'), tFolder('permission_error'));
    } else {
      toast.error(tFolder('delete_error'));
    }
  }
}, [deleteFolderTarget, client, deleteMailbox, tFolder]);
```

- [ ] **Step 4: Add F2 keyboard handler scoped to sidebar**

Add a ref for the sidebar container and F2 handler. At the top of the component:

```typescript
const sidebarRef = useRef<HTMLDivElement>(null);
```

Add an effect after the existing ArrowLeft/Right handler (~line 566):

```typescript
useEffect(() => {
  const sidebar = sidebarRef.current;
  if (!sidebar || !selectedMailbox || isCollapsed) return;

  const handleF2 = (e: KeyboardEvent) => {
    if (e.key !== 'F2') return;
    const active = document.activeElement;
    if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return;
    if (!sidebar.contains(active) && active !== document.body) return;

    const mailbox = mailboxes.find(mb => mb.id === selectedMailbox);
    if (!mailbox || mailbox.isShared || mailbox.id.startsWith('shared-')) return;
    if (!mailbox.myRights?.mayRename) return;

    e.preventDefault();
    setRenamingMailboxId(selectedMailbox);
  };

  sidebar.addEventListener('keydown', handleF2);
  return () => sidebar.removeEventListener('keydown', handleF2);
}, [selectedMailbox, isCollapsed, mailboxes]);
```

- [ ] **Step 5: Replace context menu JSX**

Replace the context menu JSX block (~lines 674-697) with the expanded version:

```tsx
{contextMenu && (
  <>
    <div
      className="fixed inset-0 z-40"
      onClick={() => setContextMenu(null)}
      onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}
    />
    <div
      className="fixed z-50 bg-popover border border-border rounded-md shadow-lg py-1 min-w-[200px]"
      style={{ left: contextMenu.x, top: contextMenu.y }}
    >
      {/* New Subfolder */}
      {contextMenu.mailbox.myRights?.mayCreateChild ? (
        <button
          onClick={() => {
            setCreatingSubfolder({ parentId: contextMenu.mailbox.id });
            // Auto-expand the parent
            if (!expandedFolders.has(contextMenu.mailbox.id)) {
              handleToggleExpand(contextMenu.mailbox.id);
            }
            setContextMenu(null);
          }}
          className="flex items-center w-full px-3 py-2 text-sm hover:bg-muted transition-colors"
        >
          <FolderPlus className="w-4 h-4 mr-2" />
          {tFolder("new_subfolder")}
        </button>
      ) : (
        <div className="flex items-center w-full px-3 py-2 text-sm text-muted-foreground/50 cursor-not-allowed">
          <FolderPlus className="w-4 h-4 mr-2" />
          {tFolder("new_subfolder")}
          <span className="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded">{tFolder("no_permission")}</span>
        </div>
      )}

      <div className="h-px bg-border mx-2 my-1" />

      {/* Rename */}
      {contextMenu.mailbox.myRights?.mayRename ? (
        <button
          onClick={() => {
            setRenamingMailboxId(contextMenu.mailbox.id);
            setContextMenu(null);
          }}
          className="flex items-center w-full px-3 py-2 text-sm hover:bg-muted transition-colors"
        >
          <Edit3 className="w-4 h-4 mr-2" />
          {tFolder("rename")}
        </button>
      ) : (
        <div className="flex items-center w-full px-3 py-2 text-sm text-muted-foreground/50 cursor-not-allowed">
          <Edit3 className="w-4 h-4 mr-2" />
          {tFolder("rename")}
          <span className="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded">{tFolder("no_permission")}</span>
        </div>
      )}

      {/* Move To - submenu */}
      {contextMenu.mailbox.myRights?.mayRename ? (
        <MoveToSubmenu
          mailbox={contextMenu.mailbox}
          allMailboxes={mailboxes}
          onMove={async (targetId) => {
            if (!client) return;
            try {
              const target = mailboxes.find(mb => mb.id === targetId);
              await moveMailbox(client, contextMenu.mailbox.id, targetId);
              toast.success(tFolder('folder_moved', { destination: target?.name || '' }));
            } catch {
              toast.error(tFolder('move_error'));
            }
            setContextMenu(null);
          }}
          onClose={() => setContextMenu(null)}
        />
      ) : (
        <div className="flex items-center w-full px-3 py-2 text-sm text-muted-foreground/50 cursor-not-allowed">
          <FolderInput className="w-4 h-4 mr-2" />
          {tFolder("move_to")}
          <span className="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded">{tFolder("no_permission")}</span>
        </div>
      )}

      <div className="h-px bg-border mx-2 my-1" />

      {/* Empty Folder (trash/junk only, existing feature) */}
      {(contextMenu.mailbox.role === 'trash' || contextMenu.mailbox.role === 'junk') &&
        contextMenu.mailbox.totalEmails > 0 && (
        <button
          onClick={() => {
            setEmptyFolderTarget(contextMenu.mailbox);
            setContextMenu(null);
          }}
          className="flex items-center w-full px-3 py-2 text-sm text-destructive hover:bg-muted transition-colors"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          {t("empty_folder.title")}
        </button>
      )}

      {/* Delete Folder */}
      {contextMenu.mailbox.myRights?.mayDelete ? (
        <button
          onClick={() => {
            setDeleteFolderTarget(contextMenu.mailbox);
            setContextMenu(null);
          }}
          className="flex items-center w-full px-3 py-2 text-sm text-destructive hover:bg-muted transition-colors"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          {tFolder("delete_folder")}
        </button>
      ) : (
        <div className="flex items-center w-full px-3 py-2 text-sm text-muted-foreground/50 cursor-not-allowed">
          <Trash2 className="w-4 h-4 mr-2" />
          {tFolder("delete_folder")}
          <span className="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded">{tFolder("no_permission")}</span>
        </div>
      )}
    </div>
  </>
)}
```

- [ ] **Step 6: Add delete folder confirmation dialog**

After the empty folder confirmation dialog JSX (~line 709), add:

```tsx
{/* Delete Folder Confirmation Dialog */}
{deleteFolderTarget && (() => {
  const collectDescendantIds = (parentId: string): string[] => {
    const children = mailboxes.filter(mb => mb.parentId === parentId);
    const ids: string[] = [];
    for (const child of children) {
      ids.push(child.id);
      ids.push(...collectDescendantIds(child.id));
    }
    return ids;
  };
  const descendantIds = new Set(collectDescendantIds(deleteFolderTarget.id));
  const descendants = mailboxes.filter(mb => descendantIds.has(mb.id));
  const subfolderCount = descendants.length;
  const totalEmailCount = (deleteFolderTarget.totalEmails || 0) +
    descendants.reduce((sum, d) => sum + (d.totalEmails || 0), 0);
  const hasContents = totalEmailCount > 0 || subfolderCount > 0;

  return (
    <ConfirmDialog
      isOpen={true}
      onClose={() => setDeleteFolderTarget(null)}
      onConfirm={handleDeleteFolder}
      title={tFolder('delete_confirm_title', { name: deleteFolderTarget.name })}
      message={hasContents
        ? tFolder('delete_confirm_with_contents', {
            emails: totalEmailCount,
            subfolders: subfolderCount,
          })
        : tFolder('delete_confirm_empty')
      }
      confirmText={tFolder('delete_folder')}
      variant="destructive"
    />
  );
})()}
```

Import `ConfirmDialog` at the top if not already imported:
```typescript
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
```

- [ ] **Step 7: Add "+" button to sidebar header**

In the sidebar header section (~line 600), add the "+" button next to the Compose button:

```tsx
{!isCollapsed && (
  <>
    <Button onClick={onCompose} className="flex-1" title={t("compose_hint")}>
      <PenSquare className="w-4 h-4 mr-2" />
      {t("compose")}
    </Button>
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setCreatingSubfolder({ parentId: null })}
      title={tFolder("new_folder")}
      className="flex-shrink-0"
    >
      <Plus className="w-4 h-4" />
    </Button>
  </>
)}
```

- [ ] **Step 8: Add `InlineInput` component**

Add before the `MailboxTreeItem` component:

```tsx
function InlineInput({
  defaultValue = "",
  placeholder,
  hintText,
  borderColor = "border-green-500",
  onSubmit,
  onCancel,
  depth = 0,
}: {
  defaultValue?: string;
  placeholder?: string;
  hintText: string;
  borderColor?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
  depth?: number;
}) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSubmit(value);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelledRef.current = true;
      onCancel();
    }
  };

  return (
    <div style={{ paddingLeft: `${depth * 16 + 24}px` }} className="px-2 py-1">
      <div className="flex items-center gap-1">
        <Folder className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => { if (!cancelledRef.current) onCancel(); }}
          placeholder={placeholder}
          maxLength={200}
          className={cn(
            "flex-1 bg-background text-foreground text-sm px-1.5 py-0.5 rounded border-2 outline-none",
            borderColor
          )}
        />
        <button
          onMouseDown={(e) => { e.preventDefault(); onSubmit(value); }}
          className="text-green-500 hover:text-green-400 p-0.5"
          aria-label="Confirm"
        >
          <span className="text-sm">✓</span>
        </button>
        <button
          onMouseDown={(e) => { e.preventDefault(); onCancel(); }}
          className="text-red-500 hover:text-red-400 p-0.5"
          aria-label="Cancel"
        >
          <span className="text-sm">✕</span>
        </button>
      </div>
      <div className="text-xs text-muted-foreground mt-0.5 ml-6">{hintText}</div>
    </div>
  );
}
```

- [ ] **Step 9: Add `MoveToSubmenu` component**

Add before the `Sidebar` component. Note: `flattenMailboxTree` was already added to the `@/lib/utils` import in Step 1.

```tsx
function MoveToSubmenu({
  mailbox,
  allMailboxes,
  onMove,
  onClose,
}: {
  mailbox: Mailbox;
  allMailboxes: Mailbox[];
  onMove: (targetId: string | null) => void;
  onClose: () => void;
}) {
  const tFolder = useTranslations('sidebar.folder_management');
  const [showSubmenu, setShowSubmenu] = useState(false);

  const isDescendant = (parentId: string, checkId: string): boolean => {
    const children = allMailboxes.filter(mb => mb.parentId === parentId);
    return children.some(c => c.id === checkId || isDescendant(c.id, checkId));
  };

  const tree = buildMailboxTree(allMailboxes);
  const flatTree = flattenMailboxTree(tree);
  const validTargets = flatTree.filter(mb => {
    if (mb.id === mailbox.id) return false;
    if (mb.isShared || mb.id.startsWith('shared-')) return false;
    if (!mb.myRights?.mayCreateChild) return false;
    if (isDescendant(mailbox.id, mb.id)) return false;
    return true;
  });

  // Show "Top level" option if folder has a parent (is nested)
  const canMoveToRoot = !!mailbox.parentId;

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowSubmenu(true)}
      onMouseLeave={() => setShowSubmenu(false)}
    >
      <div className="flex items-center w-full px-3 py-2 text-sm hover:bg-muted transition-colors cursor-pointer">
        <FolderInput className="w-4 h-4 mr-2" />
        {tFolder("move_to")}
        <ChevronRight className="w-3 h-3 ml-auto" />
      </div>

      {showSubmenu && (
        <div className="absolute left-full top-0 bg-popover border border-border rounded-md shadow-lg py-1 min-w-[180px] max-h-[300px] overflow-y-auto z-50">
          {canMoveToRoot && (
            <>
              <button
                onClick={() => onMove(null)}
                className="flex items-center w-full px-3 py-1.5 text-sm hover:bg-muted transition-colors font-medium"
              >
                <Folder className="w-3.5 h-3.5 mr-2 flex-shrink-0 text-muted-foreground" />
                {tFolder("move_to_top_level")}
              </button>
              <div className="h-px bg-border mx-2 my-1" />
            </>
          )}
          {validTargets.length === 0 && !canMoveToRoot ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              {tFolder("no_available_targets")}
            </div>
          ) : (
            validTargets.map((target) => (
              <button
                key={target.id}
                onClick={() => onMove(target.id)}
                className="flex items-center w-full px-3 py-1.5 text-sm hover:bg-muted transition-colors"
                style={{ paddingLeft: `${12 + target.depth * 12}px` }}
              >
                <Folder className="w-3.5 h-3.5 mr-2 flex-shrink-0 text-muted-foreground" />
                <span className="truncate">{target.name}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 10: Update `MailboxTreeItem` props for inline rename and create**

Add new props to `MailboxTreeItem`:

```typescript
function MailboxTreeItem({
  node, selectedMailbox, expandedFolders, onMailboxSelect, onToggleExpand,
  onMailboxContextMenu, isCollapsed,
  renamingMailboxId, onRenameSubmit, onRenameCancel, onStartRename,
  creatingSubfolder, onCreateSubmit, onCreateCancel,
}: {
  // ... existing props ...
  renamingMailboxId?: string | null;
  onRenameSubmit?: (id: string, name: string) => void;
  onRenameCancel?: () => void;
  onStartRename?: (id: string) => void;
  creatingSubfolder?: { parentId: string | null } | null;
  onCreateSubmit?: (name: string, parentId?: string) => void;
  onCreateCancel?: () => void;
}) {
```

Replace the folder name `<span>` with conditional inline rename. Where the current code shows `<span className="flex-1 truncate">{node.name}</span>`:

```tsx
{renamingMailboxId === node.id ? (
  <RenameInput
    defaultValue={node.name}
    onSubmit={(name) => onRenameSubmit?.(node.id, name)}
    onCancel={() => onRenameCancel?.()}
  />
) : (
  <span
    className="flex-1 truncate"
    onDoubleClick={(e) => {
      if (node.isShared || node.id.startsWith('shared-') || node.id.startsWith('temp-')) return;
      if (!node.myRights?.mayRename) return;
      e.stopPropagation();
      onStartRename?.(node.id);
    }}
  >
    {node.name}
  </span>
)}
```

Add `RenameInput` as a small inline component (handles the `onBlur` race condition with Escape by using a `cancelledRef`):

```tsx
function RenameInput({ defaultValue, onSubmit, onCancel }: {
  defaultValue: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}) {
  const cancelledRef = useRef(false);
  return (
    <input
      autoFocus
      type="text"
      defaultValue={defaultValue}
      maxLength={200}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onSubmit((e.target as HTMLInputElement).value);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          cancelledRef.current = true;
          onCancel();
        }
      }}
      onBlur={(e) => {
        if (!cancelledRef.current) onSubmit(e.target.value);
      }}
      onClick={(e) => e.stopPropagation()}
      className="flex-1 bg-background text-foreground text-sm px-1.5 py-0.5 rounded border-2 border-primary outline-none min-w-0"
    />
  );
}
```

- [ ] **Step 11: Add inline create input after children in MailboxTreeItem**

After the children rendering block, add inline create input:

```tsx
{hasChildren && isExpanded && !isCollapsed && (
  <div className="relative">
    {node.children.map((child) => (
      <MailboxTreeItem
        key={child.id}
        node={child}
        /* ... all existing props plus new ones: */
        renamingMailboxId={renamingMailboxId}
        onRenameSubmit={onRenameSubmit}
        onRenameCancel={onRenameCancel}
        onStartRename={onStartRename}
        creatingSubfolder={creatingSubfolder}
        onCreateSubmit={onCreateSubmit}
        onCreateCancel={onCreateCancel}
      />
    ))}
    {creatingSubfolder?.parentId === node.id && (
      <InlineInput
        placeholder={tFolder("folder_name_placeholder")}
        hintText={tFolder("enter_to_create")}
        borderColor="border-green-500"
        onSubmit={(name) => onCreateSubmit?.(name, node.id)}
        onCancel={() => onCreateCancel?.()}
        depth={node.depth + 1}
      />
    )}
  </div>
)}

{/* Show inline create even when folder has no children but is the target */}
{!hasChildren && creatingSubfolder?.parentId === node.id && !isCollapsed && (
  <InlineInput
    placeholder={tFolder("folder_name_placeholder")}
    hintText={tFolder("enter_to_create")}
    borderColor="border-green-500"
    onSubmit={(name) => onCreateSubmit?.(name, node.id)}
    onCancel={() => onCreateCancel?.()}
    depth={node.depth + 1}
  />
)}
```

- [ ] **Step 12: Disable click on temp folders**

In `MailboxTreeItem`, update the click handler:

```tsx
onClick={() => !isVirtualNode && !node.id.startsWith('temp-') && onMailboxSelect?.(node.id)}
disabled={isVirtualNode || node.id.startsWith('temp-')}
```

- [ ] **Step 13: Pass new props from Sidebar to MailboxTreeItem**

Update the `MailboxTreeItem` usage in the Sidebar render (~line 654):

```tsx
<MailboxTreeItem
  key={node.id}
  node={node}
  selectedMailbox={selectedMailbox}
  expandedFolders={expandedFolders}
  onMailboxSelect={onMailboxSelect}
  onToggleExpand={handleToggleExpand}
  onMailboxContextMenu={handleMailboxContextMenu}
  isCollapsed={isCollapsed}
  renamingMailboxId={renamingMailboxId}
  onRenameSubmit={(id, name) => handleRenameFolder(id, name)}
  onRenameCancel={() => setRenamingMailboxId(null)}
  onStartRename={(id) => setRenamingMailboxId(id)}
  creatingSubfolder={creatingSubfolder}
  onCreateSubmit={(name, parentId) => handleCreateFolder(name, parentId)}
  onCreateCancel={() => setCreatingSubfolder(null)}
/>
```

- [ ] **Step 14: Add top-level create input at bottom of folder list**

After the mailbox tree map and before the Tags section (~line 664):

```tsx
{creatingSubfolder?.parentId === null && !isCollapsed && (
  <InlineInput
    placeholder={tFolder("folder_name_placeholder")}
    hintText={tFolder("enter_to_create")}
    borderColor="border-green-500"
    onSubmit={(name) => handleCreateFolder(name)}
    onCancel={() => setCreatingSubfolder(null)}
    depth={0}
  />
)}
```

- [ ] **Step 15: Update Move To handler in context menu to handle null (root)**

In the context menu JSX where `MoveToSubmenu` is rendered (Step 5), update the `onMove` callback to handle `null` for top-level:

```tsx
<MoveToSubmenu
  mailbox={contextMenu.mailbox}
  allMailboxes={mailboxes}
  onMove={async (targetId) => {
    if (!client) return;
    try {
      if (targetId === null) {
        await moveMailbox(client, contextMenu.mailbox.id, null);
        toast.success(tFolder('folder_moved_to_root'));
      } else {
        const target = mailboxes.find(mb => mb.id === targetId);
        await moveMailbox(client, contextMenu.mailbox.id, targetId);
        toast.success(tFolder('folder_moved', { destination: target?.name || '' }));
      }
    } catch {
      toast.error(tFolder('move_error'));
    }
    setContextMenu(null);
  }}
  onClose={() => setContextMenu(null)}
/>
```

- [ ] **Step 16: Verify build**

Run: `npm run build 2>&1 | head -40`
Expected: No errors

- [ ] **Step 17: Commit**

```bash
git add components/layout/sidebar.tsx
git commit -m "feat(sidebar): add folder management UI with context menu, inline editing, and move-to (#44)"
```

---

### Task 7: Folder Drag-and-Drop in Sidebar

> **Note:** This was previously Task 8. Renumbered after merging MoveToSubmenu/InlineInput into Task 6.

**Files:**
- Modify: `components/layout/sidebar.tsx` (add draggable behavior to `MailboxTreeItem`)

- [ ] **Step 1: Add folder drag handlers to MailboxTreeItem**

Import `startMailboxDrag` from drag context:

```tsx
const { isDragging: globalDragging, startMailboxDrag, endDrag: globalEndDrag, dragType } = useDragDropContext();
```

Add drag handlers inside `MailboxTreeItem`:

```typescript
const canDrag = !isVirtualNode && !node.isShared && !node.id.startsWith('shared-') &&
  !node.id.startsWith('temp-') && node.myRights?.mayRename;

const handleFolderDragStart = useCallback((e: React.DragEvent) => {
  if (!canDrag) {
    e.preventDefault();
    return;
  }
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("application/x-mailbox-id", node.id);
  e.dataTransfer.setData("text/plain", node.name);

  const preview = document.createElement("div");
  preview.style.cssText = `
    position: fixed; top: -9999px; left: 0; padding: 6px 12px;
    background-color: var(--color-primary, #3b82f6); color: white;
    border-radius: 6px; font-size: 13px; font-weight: 500; white-space: nowrap;
  `;
  preview.textContent = node.name;
  document.body.appendChild(preview);
  e.dataTransfer.setDragImage(preview, 0, 0);
  requestAnimationFrame(() => preview.remove());

  startMailboxDrag(node.id);
}, [canDrag, node.id, node.name, startMailboxDrag]);

const handleFolderDragEnd = useCallback(() => {
  globalEndDrag();
}, [globalEndDrag]);
```

- [ ] **Step 2: Apply drag attributes to the folder row**

On the outer `<div>` of the mailbox tree item (the one with the `onContextMenu`), add:

```tsx
<div
  {...(globalDragging ? dropHandlers : {})}
  onContextMenu={(e) => onMailboxContextMenu?.(e, node)}
  draggable={canDrag}
  onDragStart={handleFolderDragStart}
  onDragEnd={handleFolderDragEnd}
  className={cn(
    // ... existing classes
    globalDragging && dragType === 'mailbox' && node.id === draggedMailboxId && "opacity-40",
  )}
>
```

Get `draggedMailboxId` from context:
```typescript
const { isDragging: globalDragging, startMailboxDrag, endDrag: globalEndDrag, dragType, draggedMailboxId } = useDragDropContext();
```

- [ ] **Step 3: Add drop-on-empty-space for root reparenting**

In the Sidebar component, add a drop handler on the mailbox list container for moving folders to top-level:

```tsx
<div
  className="flex-1 overflow-y-auto"
  onDragOver={(e) => {
    if (dragType === 'mailbox') {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    }
  }}
  onDrop={async (e) => {
    if (dragType !== 'mailbox') return;
    e.preventDefault();
    const mailboxId = e.dataTransfer.getData("application/x-mailbox-id");
    if (!mailboxId || !client) return;

    const mb = mailboxes.find(m => m.id === mailboxId);
    if (mb && mb.parentId) {
      try {
        await moveMailbox(client, mailboxId, null);
        toast.success(tFolder('folder_moved_to_root'));
      } catch {
        toast.error(tFolder('move_error'));
      }
    }
    globalEndDrag();
  }}
>
```

Get `globalEndDrag` and `dragType` from context in the Sidebar component:
```typescript
const { dragType, endDrag: globalEndDrag } = useDragDropContext();
```

- [ ] **Step 4: Verify build**

Run: `npm run build 2>&1 | head -40`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add components/layout/sidebar.tsx
git commit -m "feat(sidebar): add folder drag-and-drop reparenting (#44)"
```

---

### Task 8: Lint, Manual Test, Final Cleanup

**Files:**
- All modified files

- [ ] **Step 1: Run lint**

Run: `npm run lint`
Expected: No errors (fix any that appear)

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: Successful build

- [ ] **Step 4: Manual test checklist**

Test in the browser:
1. Right-click a custom folder - see full context menu with New subfolder, Rename, Move to, Delete
2. Right-click a system folder (Inbox) - actions disabled with "No permission" badge
3. Right-click a shared folder - no context menu
4. Click "+" button in header - inline input appears, create folder with Enter
5. Context menu "New subfolder" - inline input appears as child, parent expands
6. Double-click folder name - inline rename input appears
7. F2 on selected folder - inline rename input appears
8. Context menu "Delete" on empty folder - simple confirm dialog
9. Context menu "Delete" on folder with emails - confirm shows counts, emails moved to Trash
10. Drag folder onto another folder - reparents correctly
11. Drag folder onto sidebar empty space - moves to top level
12. Try dragging folder onto itself or its child - rejected
13. Enter empty name - stays in input
14. Enter name with "/" - error toast

- [ ] **Step 5: Fix any issues found**

- [ ] **Step 6: Final commit if needed**

```bash
git add -A
git commit -m "fix: address lint and test issues in folder management (#44)"
```
