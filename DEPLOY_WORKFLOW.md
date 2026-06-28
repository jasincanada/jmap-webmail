# Dev / Deploy notes — JasMail

**Develop here, deploy by pulling.**
- Develop in **`~/dev/JasMail`** (this clone). Commit + `git push origin main`.
- Deploy copy on epyc: **`/dockersites/email/jmap-webmail`** (serves the webmail).
  Deploy by `git pull` there — never edit it directly.
- Remotes: `origin` = `jasincanada/JasMail` (canonical fork), `upstream` = `root-fr/jmap-webmail`.

## ⚠️ Commit policy (enforced by husky hooks — commits fail otherwise)
1. **No AI / assistant attribution in commit messages.** A `commit-msg` hook rejects any message
   containing assistant-tool credit trailers (per this repo's policy). Write plain messages and do
   **not** add `Co-Authored-By:` assistant lines.
2. **Pre-commit ship-gate** (`npm run check:ship`): runs `eslint --max-warnings 0`, `tsc --noEmit`
   typecheck, the full `vitest` suite (~774 tests), and a locale parity check (all locales must match
   `en`). Commits are blocked unless every check passes — so keep changes lint/type/test-clean.

## Note — commit `1e58864` (2026-06-28)
A set of uncommitted dedupe + email-header edits (plus 10 locale files) had been made directly on
the deploy box and were never committed. They were rescued into `1e58864` (the ship-gate passed) so
the work is safely on GitHub. Backup: `/tmp/jasmail-wip-tracked-20260628.patch`.

Going forward, do this work in `~/dev/JasMail`, not on the deploy box.
