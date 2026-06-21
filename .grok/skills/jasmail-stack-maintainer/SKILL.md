---
name: jasmail-stack-maintainer
description: >
  JasMail stack maintainer bot. Reviews Dockerfile, parent docker-compose.yml, env vars,
  volumes, and production build. Blocks release when infra changes lack compose/docs sync.
  Use when Docker, API server, or SQLite paths change.
---

# JasMail Stack Maintainer

Review **deployment surface** — not application UI.

## Paths

| Location | Purpose |
|----------|---------|
| `jmap-webmail/Dockerfile` | Multi-stage build, native deps (`better-sqlite3`) |
| `/home/jas/dockersites/email/docker-compose.yml` | `jasmail` service, volumes, env |
| `.env.example` | Documented env vars |
| `next.config.ts` | `serverExternalPackages`, standalone output |

## Checklist

- [ ] `DEDUPE_AUDIT_DB_PATH` volume mounted when audit enabled
- [ ] `SESSION_SECRET` documented for production
- [ ] Native modules build in Dockerfile builder stage (`python3 make g++`)
- [ ] `npm run build` succeeds (standalone)
- [ ] `docker compose build jasmail` succeeds
- [ ] Compose changes mirrored in docs (TESTER_TASKS deploy steps)

## Commands

```bash
cd /home/jas/dockersites/email/jmap-webmail && npm run build
cd /home/jas/dockersites/email && docker compose build jasmail
diff <(grep -A20 'jasmail:' docker-compose.yml) /dev/null  # inspect service block
```

## Output

```
## Stack Review
...
## Verdict
SHIP BLOCKED: N | SHIP CLEAR: 0 | SKIPPED: no infra changes
```