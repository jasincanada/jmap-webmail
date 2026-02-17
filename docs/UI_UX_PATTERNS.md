# UI/UX Patterns Reference

This document catalogs the UI/UX patterns implemented in this codebase. Every pattern references actual files and code so that new components remain consistent with established conventions.

---

## Table of Contents

1. [Component Patterns](#1-component-patterns)
2. [Interaction Patterns](#2-interaction-patterns)
3. [Visual Patterns](#3-visual-patterns)
4. [Mobile Patterns](#4-mobile-patterns)
5. [Accessibility Patterns](#5-accessibility-patterns)
6. [i18n Patterns](#6-i18n-patterns)
7. [Navigation Patterns](#7-navigation-patterns)

---

## 1. Component Patterns

### ConfirmDialog (Promise-based)

The confirm dialog is driven by a hook that returns a Promise, allowing callers to `await` a user decision before proceeding.

**Files:**
- `components/ui/confirm-dialog.tsx` -- the visual component
- `hooks/use-confirm-dialog.ts` -- the hook that manages state and returns a promise

**How it works:**

```tsx
// In any component
const { dialogProps, confirm } = useConfirmDialog();

const handleDelete = async () => {
  const confirmed = await confirm({
    title: t("discard_draft_title"),
    message: t("discard_draft_confirm"),
    confirmText: t("discard"),
    variant: "destructive",
  });
  if (confirmed) {
    // proceed with destructive action
  }
};

// Render once at the bottom of the component tree
<ConfirmDialog {...dialogProps} />
```

The `confirm()` call opens the dialog and suspends via a Promise. The dialog resolves `true` when confirmed, `false` when cancelled or dismissed (backdrop click, Escape key).

**Variants:**
- `"default"` -- neutral confirmation (save, proceed)
- `"destructive"` -- red styling with AlertTriangle icon (delete, discard)

**DO:**
- Use `useConfirmDialog` for any destructive or irreversible action.
- Spread `dialogProps` directly onto `<ConfirmDialog>`.
- Provide translated `title` and `message` via `useTranslations`.

**DON'T:**
- Manage dialog open/close state manually; the hook handles it.
- Use `window.confirm()` -- it blocks the thread and is not styleable.

---

### Toast Notifications (with undo actions)

Toasts are managed by a global Zustand store and rendered via a container component positioned at the bottom-right corner.

**Files:**
- `components/ui/toast.tsx` -- `ToastItem` and `ToastContainer`
- `stores/toast-store.ts` -- Zustand store with convenience methods

**Usage:**

```tsx
import { toast } from "@/stores/toast-store";

// Simple
toast.success(t("email_moved"));
toast.error(t("move_failed"), t("move_error"));

// With undo action
toast.success(t("email_deleted"), {
  action: {
    label: t("undo"),
    onClick: () => restoreEmail(emailId),
  },
  duration: 5000,
});
```

**Type durations:**
- `success`, `info`, `warning`: 5000ms (default)
- `error`: 10000ms (longer visibility for errors)
- Custom: pass `duration` in options

**Rendering:**

The `ToastContainer` is positioned `fixed bottom-4 right-4 z-50` with `role="status"` and `aria-live="polite"` so screen readers announce new toasts.

**DO:**
- Use `toast.error()` for failures, `toast.success()` for confirmations.
- Provide an undo action for reversible destructive operations.
- Keep toast titles short (under 60 characters).

**DON'T:**
- Stack more than 3-4 toasts at once; the container has `max-w-sm` and no scroll.
- Use toasts for information that requires user acknowledgement -- use a banner or dialog instead.

---

### WelcomeBanner (One-time Onboarding)

A dismissible banner shown to first-time users, persisted via `localStorage`.

**File:** `components/ui/welcome-banner.tsx`

**Behavior:**
1. On mount, checks `localStorage` for key `"onboarding_completed"`.
2. If absent, renders the banner with tips.
3. On dismiss: sets `localStorage` flag, animates out with `opacity-0 scale-95`, then removes from DOM via `onTransitionEnd`.
4. Escape key also dismisses.

**Key implementation details:**
- Uses `role="complementary"` and `aria-label` for accessibility.
- Transition uses CSS classes, not JS animation, respecting `prefers-reduced-motion`.
- Wrapped in a `try/catch` around `localStorage` for SSR safety and private browsing.

**DO:**
- Use this pattern (localStorage guard + fade-out transition) for any one-time banner.
- Place onboarding banners after the main search/filter UI but before the content list.

**DON'T:**
- Show onboarding banners on every page load; check persistence first.
- Animate removal with JS timers; use `onTransitionEnd` for clean DOM removal.

---

### Empty States

Empty states use a centered column layout with a large faded icon, a primary heading, a secondary hint, and an action button.

**File:** `components/contacts/contact-list.tsx` (lines 162-197)

**Structure:**

```tsx
<div className="flex flex-col items-center justify-center h-full px-6 text-center">
  <BookUser className="w-12 h-12 mb-3 text-muted-foreground/30" />
  <p className="text-sm font-medium text-foreground">{t("empty_state_title")}</p>
  <p className="text-xs text-muted-foreground mt-1">{t("empty_state_subtitle")}</p>
  <Button size="sm" className="mt-4" onClick={onCreateNew}>
    <Plus className="w-4 h-4 mr-1.5" />
    {t("create_new")}
  </Button>
</div>
```

There are two variants used in the contacts list:
- **No contacts at all:** shows icon + title + subtitle + "Create" and "Import" buttons.
- **No search results:** shows Search icon + different copy + "Clear search" button.

**DO:**
- Always provide an action button that resolves the empty state.
- Differentiate "no data" from "no results" with distinct copy and icons.
- Use `/30` opacity on the icon to keep it subtle.

**DON'T:**
- Leave an empty white area with no guidance.
- Show the same empty state for "loading" -- use a spinner instead.

---

### NavigationRail (Module Switcher)

A vertical (desktop) or horizontal (mobile bottom tab bar) navigation component for switching between app modules.

**File:** `components/layout/navigation-rail.tsx`

**Props:**
- `orientation`: `"vertical"` (default, desktop sidebar) or `"horizontal"` (mobile bottom bar)
- `collapsed`: When true, shows icon-only mode in vertical orientation

**Features:**
- Items are capability-gated (e.g., Calendar only renders if `supportsCalendar` is true).
- Active item shows `aria-current="page"`, `bg-primary/10`, and `text-primary`.
- Horizontal mode: active indicator is a small bar under the icon, 10px label text.
- Badge support: unread inbox count as a red pill (`bg-red-500 text-white`), capped at "99+".
- Touch targets: `min-w-[64px] min-h-[44px]` in horizontal, `max-lg:min-h-[44px]` in vertical.

**DO:**
- Add `hidden: true` to NavItem for capability-gated features.
- Use `aria-current="page"` on active links (not `aria-selected`).

**DON'T:**
- Add more than 5 items to the bottom bar; it becomes cramped on small screens.
- Hardcode routes; use the `labelKey` pattern with translations.

---

## 2. Interaction Patterns

### Touch Targets (44px minimum)

All interactive elements on mobile meet the Apple HIG 44x44px minimum.

**File:** `app/globals.css`

```css
.touch-target {
  min-height: 44px;
  min-width: 44px;
}
```

In components, this is implemented via Tailwind classes:

```tsx
// Mobile header buttons
<Button className="h-11 w-11" />

// Sidebar mailbox items on mobile
className="max-lg:py-3 max-lg:min-h-[44px]"

// Mobile bottom nav items
className="min-w-[64px] min-h-[44px]"
```

**DO:**
- Use `h-11 w-11` (44px) for icon buttons on mobile.
- Use `max-lg:min-h-[44px]` for list items that are compact on desktop.

**DON'T:**
- Make touch targets smaller than 44px on any device.
- Rely on padding alone; set explicit `min-height`/`min-width`.

---

### Focus Management

Focus traps are implemented via a reusable hook.

**File:** `hooks/use-focus-trap.ts`

```tsx
const modalRef = useFocusTrap({
  isActive: isOpen,
  onEscape: onClose,
  restoreFocus: true,
});

// Attach to modal container
<div ref={modalRef} role="dialog" aria-modal="true">
```

**Behavior:**
1. When active, stores `document.activeElement` and focuses first focusable child.
2. Tab/Shift+Tab cycle stays within the container.
3. Escape fires `onEscape` callback.
4. On deactivation, restores focus to the previously focused element.

**Used in:**
- `ConfirmDialog` (alertdialog)
- `KeyboardShortcutsModal` (dialog)
- `EmailComposer` save-as-template modal
- `EventModal` (manual focus trap implementation)

**DO:**
- Use `useFocusTrap` for every modal/dialog/overlay.
- Set `restoreFocus: true` so keyboard users return to their previous context.

**DON'T:**
- Implement focus trap logic inline; use the shared hook.
- Forget `aria-modal="true"` on the container.

---

### Keyboard Shortcuts

Global keyboard shortcuts are managed by a single hook that registers on `window`.

**Files:**
- `hooks/use-keyboard-shortcuts.ts` -- hook + `KEYBOARD_SHORTCUTS` definition
- `components/keyboard-shortcuts-modal.tsx` -- help modal

**Design decisions:**
- Shortcuts are disabled when typing in inputs (`isInputFocused()` check).
- Shortcuts are disabled when the composer is open.
- Modifier keys are only used for `Ctrl+A` (select all); all other shortcuts are single keys.
- The `handlersRef` pattern avoids re-registering the listener on every render.

**Shortcut categories:**

| Category    | Keys                | Actions                                    |
|-------------|---------------------|--------------------------------------------|
| Navigation  | j/k, arrows, Enter  | Next/prev email, open, close               |
| Actions     | r, R/a, f, s, e, #  | Reply, reply all, forward, star, archive, delete |
| Global      | c, /, ?, Shift+G     | Compose, search, help, refresh             |
| Threads     | x                   | Expand/collapse thread                     |
| Composer    | t                   | Open template picker                       |

**DO:**
- Register shortcuts in the `KEYBOARD_SHORTCUTS` const so they appear in the help modal.
- Use the `enabled` flag to disable shortcuts during modal states.

**DON'T:**
- Add shortcuts that conflict with browser defaults (Ctrl+W, Ctrl+T, etc.).
- Use multi-key chords beyond simple modifier+key combos.

---

### Form Validation

Two validation styles are used depending on context.

**Inline validation (on blur)** -- used in `contact-form.tsx`:

```tsx
const handleEmailBlur = (index: number, address: string) => {
  if (address.trim() && !validateEmail(address)) {
    setEmailErrors(prev => ({ ...prev, [index]: t("email_error_inline") }));
  } else {
    setEmailErrors(prev => { const next = { ...prev }; delete next[index]; return next; });
  }
};

// Render
<Input className={emailErrors[i] ? "border-red-500 focus:ring-red-500" : ""} />
{emailErrors[i] && (
  <p className="text-xs text-red-600 dark:text-red-400 mt-1">{emailErrors[i]}</p>
)}
```

**Submit-time validation with shake** -- used in `email-composer.tsx`:

```tsx
if (!canSend) {
  const errors = {};
  if (toAddresses.length === 0) { errors.to = true; first_error_field = "to"; }
  if (!subject) errors.subject = true;
  if (!hasContent) errors.body = true;
  setValidationErrors(errors);
  setShakeField(first_error_field);
  setTimeout(() => setShakeField(null), 400);
  toInputRef.current?.focus();
  return;
}

// Render
<div className={cn("flex items-center gap-2", shakeField === "to" && "animate-shake")}>
  <Input className={cn(validationErrors.to && "ring-2 ring-red-500")} aria-invalid={validationErrors.to} />
  {validationErrors.to && (
    <p className="text-xs text-red-600 dark:text-red-400">{t("validation.recipient_required")}</p>
  )}
</div>
```

**Login form** also uses a shake animation on the entire form on auth error:

```tsx
<form className={shakeError ? "animate-shake" : ""}>
```

**DO:**
- Use inline validation (on blur) for fields where immediate feedback helps (email format).
- Use submit-time validation with shake + focus for required fields.
- Always set `aria-invalid` on invalid inputs.
- Always show error text below the field, not just a color change.

**DON'T:**
- Validate on every keystroke; it is distracting.
- Use `alert()` for validation errors.

---

### Confirmation Flows

Three patterns for destructive action confirmation exist in the codebase:

1. **Promise-based dialog** (`useConfirmDialog`) -- for draft discard in composer.
2. **Inline confirmation** -- for calendar event deletion in `event-modal.tsx` (lines 633-668): clicking Delete shows inline "Are you sure?" text with confirm/cancel buttons in the same footer area.
3. **Two-step toast with undo** -- for spam marking: the action executes immediately, and a toast with "Undo" appears for 5 seconds.

**When to use which:**
- **Dialog:** when the action is irreversible AND requires user to read context (e.g., "This draft will be permanently deleted").
- **Inline confirmation:** when the action is within a form/modal and switching to another modal would be jarring.
- **Toast with undo:** when the action is reversible and speed matters (e.g., move to trash, mark as spam).

---

## 3. Visual Patterns

### CSS Variables (never hardcoded hex)

All colors in components MUST use CSS variables or Tailwind semantic classes.

**File:** `app/globals.css` (lines 5-40)

**Light mode tokens:**

| Token                         | Value     | Usage                          |
|-------------------------------|-----------|--------------------------------|
| `--color-background`          | `#ffffff` | Page and card backgrounds      |
| `--color-foreground`          | `#0f172a` | Primary text                   |
| `--color-primary`             | `#3b82f6` | Interactive elements, links    |
| `--color-muted-foreground`    | `#64748b` | Secondary text                 |
| `--color-accent`              | `#dbeafe` | Selected item backgrounds      |
| `--color-accent-foreground`   | `#1e40af` | Selected item text             |
| `--color-border`              | `#e2e8f0` | Borders, dividers              |
| `--color-muted`               | `#f1f5f9` | Hover backgrounds              |

**Settings variables:**

| Variable                | Default | Purpose                         |
|-------------------------|---------|---------------------------------|
| `--font-size-base`      | `16px`  | Root font size                  |
| `--list-item-height`    | `48px`  | Email list item height          |
| `--transition-duration` | `0.2s`  | Animation duration (0 when animations disabled) |

**DO:**
```tsx
// Tailwind classes (preferred)
className="text-foreground bg-background border-border"
className="text-muted-foreground hover:text-foreground"

// Inline styles when dynamic
style={{ color: "var(--color-muted-foreground)" }}
```

**DON'T:**
```tsx
// Never hardcode hex in components
style={{ color: "#666" }}
className="text-gray-400"  // without dark: variant
```

---

### WCAG AA Contrast

Minimum contrast ratios enforced:
- Normal text: 4.5:1 (target 7:1 for AAA)
- Large text (18pt+): 3:1

**Tested combinations (light mode):**

| Element                  | Color     | Background | Ratio  |
|--------------------------|-----------|------------|--------|
| Primary text             | `#0f172a` | `#ffffff`  | 15.8:1 |
| Muted text               | `#64748b` | `#ffffff`  | 5.7:1  |
| Blockquote/quoted text   | `#4b5563` | `#ffffff`  | 7.8:1  |
| Primary interactive      | `#3b82f6` | `#ffffff`  | 4.8:1  |

**Semantic color pairs (always provide both modes):**

```tsx
// Success
className="text-green-600 dark:text-green-400"
// Error
className="text-red-600 dark:text-red-400"
// Warning
className="text-amber-700 dark:text-amber-400"
// Info
className="text-blue-600 dark:text-blue-400"
```

**Opacity limits on muted text:**
- Acceptable: `/70`, `/80`, `/90`, `/95`
- Avoid: `/50`, `/60` (too faint for AA compliance)
- Exception: disabled states may use `disabled:opacity-50`

---

### Dark Mode

Dark mode is toggled by adding the `dark` class to the document root.

**File:** `tailwind.config.ts` -- `darkMode: 'class'`
**File:** `app/globals.css` -- `.dark { ... }` block with inverted tokens

**Email content dark mode:** HTML emails with hardcoded dark text colors are transformed using `lib/color-transform.ts`:
- Luminance < 0.4: inverted and brightened
- Luminance 0.4-0.6: lightened by 40-50%
- Luminance > 0.6: preserved

This is applied during DOMPurify sanitization in `email-viewer.tsx`.

---

### Loading States

**Full-page spinner** (auth check, initial load):
```tsx
<div className="flex h-screen items-center justify-center bg-background">
  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground" />
  <p className="mt-4 text-sm text-muted-foreground">{t("common.loading")}</p>
</div>
```

**Inline spinner** (login button, saving):
```tsx
<Loader2 className="w-4 h-4 animate-spin" />
```

**Draft save status** (email composer):
```tsx
// Saving
<Save className="w-3 h-3 animate-pulse" /> "Saving..."
// Saved
<Check className="w-3 h-3" /> "Draft saved" (green text, auto-clears after 2s)
// Error
<X className="w-3 h-3" /> "Save failed" (red text, auto-clears after 3s)
```

**Config/server error** (login page):
```tsx
<div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-red-500/10 mb-6">
  <AlertCircle className="w-10 h-10 text-red-500" />
</div>
<h1 className="text-xl font-medium">{t("config_error.title")}</h1>
<p className="text-muted-foreground text-sm">{t("config_error.fetch_failed")}</p>
```

---

### Notification Banner Hierarchy

The email viewer renders up to three contextual banners in a unified container. They appear in a fixed visual order.

**File:** `components/email/email-viewer.tsx` (lines 1321-1382)

**Order (top to bottom):**
1. **External Content** -- gray/muted background (`bg-muted/50`), offers "Load images" and "Trust sender" buttons.
2. **Unsubscribe** -- blue tint (`bg-blue-50/50 dark:bg-blue-950/20`), from RFC 2369 List-Unsubscribe header.
3. **Calendar Invitation** -- amber tint (`bg-amber-50/50 dark:bg-amber-950/20`), RSVP Accept/Maybe/Decline.

**Container:**
```tsx
<div className="border-b border-border bg-muted/30 isolate">
  <div className="max-w-4xl mx-auto px-6 py-1.5">
    <div className="flex flex-col gap-3 isolate">
      {/* banners render here in order */}
    </div>
  </div>
</div>
```

The outer container only renders if at least one banner is visible. Each banner has a distinct background tint for visual hierarchy.

**DO:**
- Add new notification banners inside this unified container, not as separate full-width bars.
- Follow the color convention: neutral = gray, informational = blue, action-required = amber/yellow, danger = red.
- Include 44px touch targets for action buttons on mobile.

**DON'T:**
- Render banners above the email header area.
- Use identical background colors for different banner types.

---

## 4. Mobile Patterns

### Responsive Breakpoints

The codebase uses Tailwind's default breakpoints with a mobile-first approach.

| Breakpoint | Width    | Layout                              |
|------------|----------|-------------------------------------|
| Default    | < 768px  | Mobile: single pane, bottom nav     |
| `md`       | >= 768px | Tablet: two panes, collapsible list |
| `lg`       | >= 1024px| Desktop: three panes, rail + sidebar + content |

**Detection hook:** `hooks/use-media-query.ts` provides `useDeviceDetection()`:

```tsx
const { isMobile, isTablet } = useDeviceDetection();
```

**View state** is managed by `stores/ui-store.ts`:
- `activeView`: `"list"` | `"viewer"` (mobile only)
- `sidebarOpen`: overlay sidebar on mobile/tablet
- `tabletListVisible`: collapse/expand list pane on tablet

---

### Input Modes

Use `inputMode` for mobile keyboard optimization.

```tsx
// TOTP code entry
<Input inputMode="numeric" maxLength={6} />

// Email field
<Input type="email" inputMode="email" />

// Phone field
<Input type="tel" inputMode="tel" />
```

**File references:**
- `app/[locale]/login/page.tsx` -- TOTP input with `inputMode="numeric"`
- `components/contacts/contact-form.tsx` -- email with `inputMode="email"`, phone with `inputMode="tel"`

---

### Bottom Tab Bar

On mobile, the `NavigationRail` renders horizontally at the bottom of the viewport.

**File:** `app/[locale]/page.tsx` (line 948-950):
```tsx
{isMobile && activeView !== "viewer" && (
  <NavigationRail orientation="horizontal" />
)}
```

The bar hides when viewing an email to maximize reading space.

**Safe area insets** are defined in `app/globals.css` for notched devices:
```css
.safe-area-inset-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}
```

---

### Full-Screen Modals on Mobile

The email composer goes full-screen on mobile, windowed on desktop.

**File:** `app/[locale]/page.tsx` (lines 954-989):
```tsx
<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 lg:p-0">
  <div className={cn(
    "w-full h-full lg:h-[600px] lg:max-w-3xl",
    "max-lg:flex max-lg:flex-col"
  )}>
    <EmailComposer />
  </div>
</div>
```

- Mobile (`max-lg`): `w-full h-full` (full viewport).
- Desktop (`lg`): `max-w-3xl h-[600px]` (centered card).

---

### Mobile Header

The `MobileHeader` component provides a consistent top bar with left action (menu/back), title, and right actions.

**File:** `components/layout/mobile-header.tsx`

- Only visible below `lg` breakpoint (`lg:hidden`).
- Back button: `ArrowLeft` icon.
- Menu button: `Menu` icon, toggles to `X` when sidebar is open.
- Touch targets: `h-11 w-11` (44px) for all icon buttons.
- `aria-expanded` on menu button for screen readers.

**MobileViewerHeader** is a variant for the email reader view with a centered truncated subject line.

---

## 5. Accessibility Patterns

### ARIA Live Regions

A screen-reader-only live region is placed at the root layout for dynamic status announcements.

**File:** `app/[locale]/page.tsx` (line 998):
```tsx
<div className="sr-only" aria-live="polite" aria-atomic="true" id="sr-status" />
```

The toast container also uses `role="status"` and `aria-live="polite"`:
```tsx
<div role="status" aria-live="polite">
  {toasts.map(...)}
</div>
```

---

### ARIA Roles

**Dialogs:**
```tsx
// Confirm dialog (requires acknowledgement)
role="alertdialog" aria-modal="true"
aria-labelledby="confirm-dialog-title"
aria-describedby="confirm-dialog-message"

// Regular dialog
role="dialog" aria-modal="true"
aria-labelledby="shortcuts-dialog-title"
```

**Navigation:**
```tsx
<nav role="navigation" aria-label={t("nav_label")}>
  <Link aria-current={is_active ? "page" : undefined}>
```

**Autocomplete (combobox):**
```tsx
<Input
  role="combobox"
  aria-expanded={results.length > 0}
  aria-autocomplete="list"
  aria-controls="autocomplete-to"
  aria-activedescendant={`autocomplete-option-${index}`}
/>
<div id="autocomplete-to" role="listbox">
  <button role="option" aria-selected={isSelected}>
```

**Banners:**
```tsx
// Welcome/onboarding
role="complementary" aria-label={t("title")}

// Session expired
role="status" aria-live="polite"
```

---

### Reduced Motion

**File:** `app/globals.css` (lines 402-411):

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

This is a global reset. Additionally, the `--transition-duration` CSS variable can be set to `0` via the user's "Animations" setting toggle, which components read from.

---

### sr-only Announcements

Screen-reader-only text uses Tailwind's `sr-only` class:

```tsx
// Loading state spinner
<span className="sr-only">{t("loading")}</span>

// Live region for dynamic updates
<div className="sr-only" aria-live="polite" aria-atomic="true" id="sr-status" />

// Accessible checkbox (visually custom)
<input type="checkbox" className="peer sr-only" />
```

---

### Focus Traps

Every modal and overlay implements a focus trap. See the [Focus Management](#focus-management) section for the reusable `useFocusTrap` hook.

All implementations share these properties:
- Escape key closes the modal.
- Focus is restored to the previous element on close.
- Tab cycles within the modal boundary.

---

## 6. i18n Patterns

### Namespace Conventions

Translations are grouped by feature area in `locales/{locale}/common.json`.

| Namespace          | Scope                           |
|--------------------|---------------------------------|
| `login.*`          | Login page                      |
| `sidebar.*`        | Sidebar navigation, search      |
| `email_list.*`     | Email list component            |
| `email_viewer.*`   | Email viewer, banners           |
| `email_composer.*` | Composer, validation            |
| `calendar.*`       | Calendar views, events, form    |
| `contacts.*`       | Contact list, form, groups      |
| `settings.*`       | All settings tabs               |
| `templates.*`      | Email templates                 |
| `identity.*`       | Identity management             |
| `sub_address.*`    | Sub-addressing                  |
| `shortcuts.*`      | Keyboard shortcuts modal        |
| `notifications.*`  | Toast messages                  |
| `common.*`         | Shared strings (loading, close) |
| `confirm_dialog.*` | Confirm/cancel button labels    |
| `welcome.*`        | Onboarding banner               |
| `advanced_search.*`| Search filter panel             |

### Adding New Keys

1. Add the key to **all 8 locale files**: `en`, `fr`, `ja`, `es`, `it`, `de`, `nl`, `pt`.
2. Use hierarchical, descriptive keys: `email_viewer.unsubscribe_banner.title`.
3. Use `useTranslations("namespace")` scoped to the component's domain.
4. For dynamic content, use ICU message syntax:

```json
// In locale file
"alerts.minutes_before": "{count, plural, one {# minute before} other {# minutes before}}"

// In component
t("alerts.minutes_before", { count: 5 })
```

### ICU Pluralization

Used for calendar alerts and bulk operations. All 8 locales must include the pluralization rules.

**Example (English):**
```json
"bulk.selected": "{count, plural, one {# contact selected} other {# contacts selected}}"
```

**Example (French):**
```json
"bulk.selected": "{count, plural, one {# contact selectionne} other {# contacts selectionnes}}"
```

### Locale-Aware Formatting

Dates and times use `next-intl`'s `useFormatter` hook, not hardcoded format strings:

```tsx
const format = useFormatter();
format.dateTime(date, { month: "short", day: "numeric" });
```

The calendar views use this extensively for month/day names, respecting the user's locale.

---

## 7. Navigation Patterns

### NavigationRail

The NavigationRail is the primary module-level navigation, rendering as:
- **Desktop:** Vertical icon rail (14px wide, `w-14`) to the left of the sidebar.
- **Mobile:** Horizontal bottom tab bar.

**File:** `components/layout/navigation-rail.tsx`

Items are defined as an array of `NavItem` objects with:
- `id`, `icon`, `labelKey`, `href`
- `hidden` (optional): for capability-gated features
- `badge` (optional): unread count for inbox

**Active state detection:**
```tsx
const getIsActive = (href: string) => {
  if (href === "/") return pathname === "/" || pathname === "";
  return pathname.startsWith(href);
};
```

This handles both exact match for root (`/`) and prefix match for sub-routes (`/calendar`, `/contacts`, etc.).

---

### Module Switching

Each module (Mail, Calendar, Contacts, Settings) is a separate page route under `app/[locale]/`.

Navigation uses `Link` from `@/i18n/navigation` which automatically prepends the current locale:

```tsx
import { Link } from "@/i18n/navigation";

<Link href="/calendar">Calendar</Link>
// Renders as: /en/calendar, /fr/calendar, etc.
```

---

### Back Navigation

**Mobile:** The `MobileHeader` and `MobileViewerHeader` components handle back navigation:
- Back arrow returns to the previous view (list from viewer, or uses `goBack()` from UI store).
- On tablet, back re-shows the list pane via `setTabletListVisible(true)`.

**Desktop:** The email viewer has an optional back chevron for tablet mode:
```tsx
onBack={() => {
  setTabletListVisible(true);
  selectEmail(null);
}}
```

**Sidebar:** On mobile/tablet, sidebar is an overlay (`fixed inset-y-0 left-0`) with backdrop (`bg-black/50`). Closing happens via:
- Backdrop click
- Close button (X icon)
- Mailbox selection (auto-closes sidebar, switches to list view)

---

### RSVP Button Hierarchy (Calendar)

The event modal renders differently for organizers vs. attendees.

**File:** `components/calendar/event-modal.tsx`

**Attendee mode** (not the organizer): shows read-only event details with an RSVP bar at the bottom:

```
[Accept (green)]  [Maybe (amber)]  [Decline (red/ghost)]
```

Active status is indicated by filled background + check icon. Inactive options use outline/ghost variant.

**Color mapping:**
- Accepted: `bg-green-600 text-white` (active) / `text-green-600 border-green-300` (inactive)
- Tentative: `bg-amber-600 text-white` (active) / `text-amber-600 border-amber-500` (inactive)
- Declined: `bg-red-600 text-white` (active) / `text-red-600` ghost (inactive)

**Organizer mode:** shows full edit form with a status summary of attendee responses:
```
"3 accepted, 2 pending"
```
