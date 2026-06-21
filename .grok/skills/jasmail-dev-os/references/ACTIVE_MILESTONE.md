# Active milestone

Update this file at the **start** of each development cycle. All reviewer bots read it dynamically.

| Field | Value |
|-------|-------|
| Version | 1.8.0 (planned) |
| Plan | `docs/plans/` — add next plan when approved |
| Previous shipped | v1.7.0 @ `854998b` |
| Repo | `/home/jas/dockersites/email/jmap-webmail/` |
| Compose stack | `/home/jas/dockersites/email/docker-compose.yml` |
| Remote | `fork` → `https://github.com/jasincanada/JasMail.git` |

## Success criteria (inherit from active plan)

When no new plan exists, regression-only releases must:

- `npm run typecheck` — pass
- `npm run test` — pass (748+ tests)
- `npx eslint . --max-warnings 0` — pass
- `npm run check:locales` — pass
- `npm run build` — pass
- No open Critical/High/Medium findings from any specialist reviewer

## Stack touchpoints

Changes to these paths require `jasmail-stack-maintainer` sign-off:

- `Dockerfile`, `docker-compose.yml` (parent dir), env vars, volumes
- `app/api/**`, `instrumentation*.ts`
- `lib/dedupe-audit/**`, `better-sqlite3`