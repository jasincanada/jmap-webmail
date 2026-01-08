- I want you to focus on offer the best UI/UX experience to the user who's using the webmail
- We care about security and privacy.
- Take care to update @TODO.md to keep track on tasks.
- Don't forget to commit when its needed.

## Internationalization (i18n)

This project uses **next-intl** for internationalization with support for English, French, Japanese, Spanish, Italian, German, Dutch, and Portuguese.

### Key Guidelines:

1. **Always use translations** - Never hardcode user-facing text. Use the `useTranslations` hook:
   ```tsx
   const t = useTranslations('namespace');
   return <div>{t('key')}</div>;
   ```

2. **Translation files location**: `/locales/{locale}/common.json`
   - English: `/locales/en/common.json`
   - French: `/locales/fr/common.json`
   - Japanese: `/locales/ja/common.json`
   - Spanish: `/locales/es/common.json`
   - Italian: `/locales/it/common.json`
   - German: `/locales/de/common.json`
   - Dutch: `/locales/nl/common.json`
   - Portuguese: `/locales/pt/common.json`

3. **Namespace organization**: Group related translations:
   - `login.*` - Login page strings
   - `sidebar.*` - Sidebar navigation
   - `email_list.*` - Email list component
   - `email_viewer.*` - Email viewer component
   - `email_composer.*` - Email composer
   - `common.*` - Shared strings
   - `notifications.*` - Toast/alert messages
   - `date.*` - Date-related strings

4. **Dynamic routing**: All pages must be under `/app/[locale]/` directory

5. **Locale-aware navigation**: Always include locale in routes:
   ```tsx
   router.push(`/${params.locale}/login`);
   ```

6. **Adding new strings**:
   - Add to all translation files: `/locales/en/common.json`, `/locales/fr/common.json`, `/locales/ja/common.json`, `/locales/es/common.json`, `/locales/it/common.json`, `/locales/de/common.json`, `/locales/nl/common.json`, and `/locales/pt/common.json`
   - Use descriptive, hierarchical keys
   - Keep translations consistent in tone and terminology

7. **Browser language detection**: Automatically detects and uses browser language on first visit

8. **User preference**: Language selection is persisted and overrides browser detection

## Accessibility & Color Standards

This project follows **WCAG 2.0 Level AA** guidelines for color contrast and readability.

### Color Contrast Rules

1. **Minimum Contrast Ratios**:
   - Normal text (< 18pt): 4.5:1 minimum (AA standard)
   - Large text (≥ 18pt or 14pt bold): 3:1 minimum
   - Target: 7:1 for normal text when practical (AAA standard)

2. **Never Use Hardcoded Hex Colors**:
   - ❌ BAD: `style="color: #666"`
   - ✅ GOOD: `style="color: var(--color-muted-foreground)"`
   - ✅ GOOD: `className="text-muted-foreground"`
   - Rationale: Hardcoded colors break dark mode and theme switching

3. **CSS Variable Usage**:
   - Use `var(--color-*)` for all inline styles
   - Prefer Tailwind classes over inline styles when possible
   - All color variables defined in `app/globals.css`

4. **Tested Color Combinations** (Light Mode):
   - `--color-foreground: #0f172a` on white background (15.8:1) ✅
   - `--color-muted-foreground: #64748b` on white background (5.7:1) ✅
   - Blockquote/quoted text: `#4b5563` on white background (7.8:1) ✅
   - Primary text: `#3b82f6` on white background (4.8:1) ✅

5. **Opacity Limits on Text**:
   - Never use opacity < 0.7 on `text-muted-foreground` in light mode
   - Acceptable: `/70`, `/80`, `/90`, `/95`
   - Avoid: `/50`, `/60` (too faint for accessibility)
   - Exception: Disabled states may use lower opacity

6. **Semantic Color Usage**:
   - Success: `text-green-600 dark:text-green-400`
   - Error: `text-red-600 dark:text-red-400`
   - Warning: `text-amber-700 dark:text-amber-400`
   - Info: `text-blue-600 dark:text-blue-400`
   - Always provide both light and dark mode variants

7. **Testing Requirements**:
   - Test all UI changes in both light and dark modes
   - Use browser DevTools "Inspect Accessibility Properties" to check contrast
   - Verify text remains readable with browser zoom at 200%
   - Color must not be the only visual means of conveying information (add icons, labels, etc.)

### Color Decision Tree

When adding new text elements, follow this decision tree:

1. **Is this primary content?** → Use `text-foreground`
2. **Is this secondary/supporting content?** → Use `text-muted-foreground`
3. **Does it convey status?** → Use semantic colors (green/red/amber/blue)
4. **Is it interactive (links, buttons)?** → Use `text-primary` with hover states
5. **Is it disabled/inactive?** → Use `text-muted-foreground` with opacity or `disabled:opacity-50`

### Common Mistakes to Avoid

- ❌ Hardcoding hex colors in component inline styles
- ❌ Using `text-gray-400` or similar Tailwind grays without dark mode variant
- ❌ Forgetting `dark:` variants when using color classes
- ❌ Using opacity < 0.7 on already-muted colors
- ❌ Relying solely on color to convey meaning (add icons/text labels)

### Where Colors Are Defined

- **CSS Variables**: `app/globals.css` lines 5-40 (light and dark themes)
- **Tailwind Config**: `tailwind.config.ts` (extends default palette)
- **Color Transform Utility**: `lib/color-transform.ts` (dark mode email content fixes)

- When you are not sure, check the official documentation online.
- Always use last versions. Reduce external dependencies as well (less is better).
- Only commit/push when I confirm the issue/task you are working on is ok.

## Git Workflow & Release Process

This project has two branches with different purposes:

### Branches
- **`master`** - Development branch (private GitLab at `origin`)
- **`public-release`** - Clean public branch (GitHub at `github`)

### Development (on master)
Work normally on `master`, commit as usual. Push to origin (GitLab) for backup/CI.

### Releasing to Production (GitHub)
When user says "release to prod" or similar, use the release script:

```bash
./scripts/release.sh
```

This script will:
1. Verify you're on master branch
2. Run lint and type check
3. Check for Claude/AI references in code
4. Switch to `public-release` branch
5. Copy ONLY code files from master (not README, .gitignore, CLAUDE.md, TODO.md, scripts/)
6. Validate no forbidden files are staged
7. Show changes for review

After the script runs:

1. **Update public documentation** (MANDATORY):
   - `README.md` - Update features list, screenshots, version info for new functionality
   - **`ROADMAP.md`** - ⚠️ **CRITICAL: ALWAYS update this file!** Move completed items, add new planned features
   - Review what changed in master and reflect user-facing changes in public docs

   **NOTE**: ROADMAP.md update is NON-NEGOTIABLE - it must be updated every release to keep the public repository in sync with development progress.

2. **Commit and push**:
```bash
git add -A
git commit -S --author="Matthieu MALVACHE <matthieu@root.cloud>" -m "feat: Your message"
git push github public-release:main
git checkout master
```

### Files to NEVER release to GitHub
- `CLAUDE.md` - AI instructions
- `TODO.md` - Internal task tracking
- `scripts/seed-demo.ts` - Demo data seeder
- `.claude/` directory
- Any file containing "claude" or AI references

### Files to keep separate between branches
- `README.md` - Public version is different, don't overwrite
- `.gitignore` - Public version doesn't have .claude entries
- `package.json` - May differ, only update if dependencies changed

### Important Notes
- All public commits must be signed with GPG
- Author must be `Matthieu MALVACHE <matthieu@root.cloud>`
- Public repo: https://github.com/root-fr/jmap-webmail
- The `public-release` branch has clean history (no dev iterations)
- Never push `master` to GitHub, only `public-release`
- Always run `npm run lint` before releasing