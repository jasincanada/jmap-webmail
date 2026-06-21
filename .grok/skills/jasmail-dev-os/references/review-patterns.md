# JasMail review patterns (living memory)

Reviewers and the bugfixer read this file every cycle. Append new patterns after each release retrospective.

## Recurring defects (learned from v1.6–v1.7)

| Pattern | Symptom | Prevention | First seen |
|---------|---------|------------|------------|
| **UI option not wired** | Picker/store exposes a preference executors ignore | Plan-reviewer: trace UI → store → lib executor | v1.7 |
| **Phase enum drift** | Store uses `applying` but components check `removing` | Grep all phase literals after store changes | v1.7 |
| **i18n key skew** | `en` updated; other locales missing keys | `npm run locales:sync` then `check:locales` | v1.7 |
| **Lint ships first** | Unused imports vars in initial commit | `npm run check:ship` pre-commit | v1.7 |
| **Review bypass** | Tag pushed without persisted `SHIP CLEAR` | `.husky/pre-push` + `validate-review-artifact.mjs` | v1.7 |
| **Gate script untested** | `ship-gate` / `upstream-status` regress silently | `lib/__tests__/dev-os-gate.test.ts` + `gate-logic.mjs` | v1.7.1 |
| **Policy without enforcement** | `docker compose build` required but not in gate | `ship-gate.mjs --maximum` docker-build step | v1.7.1 |
| **Stack orphan** | Compose volume/env changed outside git repo | Stack-maintainer reviews parent compose diff | v1.7 |
| **Destructive default** | JMAP writes on scan or page load | Security-reviewer: no writes without Apply + confirm | v1.6 |
| **Abort not honoured** | JMAP calls ignore `AbortSignal` | Test-reviewer: grep `signal` through call chain | v1.6 |
| **Audit gap** | Apply path skips `recordChange` | Security-reviewer: every touched message logged | v1.7 |

## Vulnerability deferrals

| Package | Severity | Mitigation | Review by |
|---------|----------|------------|-----------|
| (none yet) | — | — | — |

Record moderate+ production CVEs the vulnerability-reviewer accepts with explicit mitigation.

## Specialist focus areas

- **Security (app):** session cookies, `/api/*` auth, JMAP destroy/move, SQL injection in audit API
- **Vulnerability (CVE):** `npm run check:vulnerabilities`, prod high/critical = block; dev critical = fix before tag; secrets in repo
- **Tests:** regression test per behavioral fix; API routes need in-memory SQLite tests
- **A11y:** keyboard operability, `aria-label`, focus management in dialogs
- **i18n:** 10 locales (`de`, `en`, `es`, `fr`, `it`, `ja`, `nl`, `pt`, `ru`, `uk`)
- **Plan:** every unchecked todo in active plan has evidence or explicit deferral issue

## Deferred (open issues to watch)

- Daily purge scheduler (v1.7 ships manual `POST /api/dedupe/purge` only)
- E2E dedupe flow with real Stalwart (Playwright)