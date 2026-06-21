---
name: jasmail-a11y-reviewer
description: >
  JasMail accessibility reviewer. Checks keyboard navigation, ARIA labels, focus management,
  and confirm dialog patterns on changed UI. Blocks release on High/Critical a11y issues.
  Skip only when diff has zero component/UI changes.
---

# JasMail A11y Reviewer

Review **accessibility** on changed `components/` and `app/` UI files only.

## Checklist

- [ ] Interactive elements keyboard reachable (Tab order sane)
- [ ] Icon-only buttons have `aria-label` or visible text
- [ ] Custom click handlers on non-buttons have `role="button"` + keyboard handler (or use `<button>`)
- [ ] Confirm dialogs trap focus and restore on close
- [ ] Loading states announced (`aria-live` or visible text)
- [ ] Color contrast not sole indicator of state (duplicate groups use stripe + text)
- [ ] Form inputs have associated labels

## Dedupe-specific (when touched)

- Action picker radio group: native `<input type="radio">` or proper `radiogroup` pattern
- GroupCard expand: Enter/Space works (existing pattern)
- Cancel during scan/apply: button reachable while busy

## Severity

- **High:** Keyboard cannot complete primary flow (scan → pick action → apply)
- **Medium:** Missing aria-label on icon button
- **Low:** Redundant title attributes

## Output

```
## A11y Review
...
## Verdict
SHIP BLOCKED: N | SHIP CLEAR: 0 | SKIPPED: no UI changes
```