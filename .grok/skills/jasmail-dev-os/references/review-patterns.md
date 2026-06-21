# JasMail review patterns (living memory)

Reviewers and the bugfixer read this file every cycle. Append new patterns after each release retrospective.

## Recurring defects (learned from v1.6–v1.7)

| Pattern | Symptom | Prevention |
|---------|---------|------------|
| **UI option not wired** | Picker/store exposes a preference executors ignore | Plan-reviewer: trace UI → store → lib executor |
| **Phase enum drift** | Store uses `applying` but components check `removing` | Grep all phase literals after store changes |
| **i18n key skew** | `en` updated; other locales missing keys | Run `npm run check:locales` before review |
| **Lint ships first** | Unused imports vars in initial commit | ESLint `--max-warnings 0` in ship gate |
| **Review bypass** | Tag pushed without persisted `SHIP CLEAR` | Orchestrator blocks tag without `docs/reviews/*.md` |
| **Stack orphan** | Compose volume/env changed outside git repo | Stack-maintainer reviews parent compose diff |
| **Destructive default** | JMAP writes on scan or page load | Security-reviewer: no writes without Apply + confirm |
| **Abort not honoured** | JMAP calls ignore `AbortSignal` | Test-reviewer: grep `signal` through call chain |
| **Audit gap** | Apply path skips `recordChange` | Security-reviewer: every touched message logged |

## Specialist focus areas

- **Security:** session cookies, `/api/*` auth, JMAP destroy/move, SQL injection in audit API
- **Tests:** regression test per behavioral fix; API routes need in-memory SQLite tests
- **A11y:** keyboard operability, `aria-label`, focus management in dialogs
- **i18n:** 10 locales (`de`, `en`, `es`, `fr`, `it`, `ja`, `nl`, `pt`, `ru`, `uk`)
- **Plan:** every unchecked todo in active plan has evidence or explicit deferral issue

## Deferred (open issues to watch)

- Daily purge scheduler (v1.7 ships manual `POST /api/dedupe/purge` only)
- E2E dedupe flow with real Stalwart (Playwright)