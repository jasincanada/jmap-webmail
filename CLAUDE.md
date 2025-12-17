- I want you to focus on offer the best UI/UX experience to the user who's using the webmail
- We care about security and privacy.
- Take care to update @TODO.md to keep track on tasks.
- Don't forget to commit when its needed.

## Internationalization (i18n)

This project uses **next-intl** for internationalization with support for English and French.

### Key Guidelines:

1. **Always use translations** - Never hardcode user-facing text. Use the `useTranslations` hook:
   ```tsx
   const t = useTranslations('namespace');
   return <div>{t('key')}</div>;
   ```

2. **Translation files location**: `/locales/{locale}/common.json`
   - English: `/locales/en/common.json`
   - French: `/locales/fr/common.json`

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
   - Add to both `/locales/en/common.json` and `/locales/fr/common.json`
   - Use descriptive, hierarchical keys
   - Keep translations consistent in tone and terminology

7. **Browser language detection**: Automatically detects and uses browser language on first visit

8. **User preference**: Language selection is persisted and overrides browser detection
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

After the script runs, manually commit and push:
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