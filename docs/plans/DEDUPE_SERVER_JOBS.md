# Server-side dedupe architecture (v1.9+)

## Decision: yes — dedupe must run on the server

Browser dedupe is a stopgap. It pulls every message (or preview) over the public internet, scans in JavaScript, then writes moves back. That is slow, fragile, and capped by `maxObjectsInGet`. The durable model:

| Layer | Role |
|-------|------|
| **JasMail UI** | Configure criteria, start jobs, review groups, confirm apply |
| **JasMail API** (`/api/dedupe/*`) | Auth, audit SQLite, proxy to worker |
| **Dedupe worker** (on `mailnet`) | JMAP scan/apply against `stalwart:8080` — no browser in the loop |
| **Stalwart** | Mailbox storage + JMAP |

Traffic stays on the Docker network (`jasmail` → `dedupe-worker` → `stalwart`). The user's browser only sees job status and group review.

---

## What already exists

| Piece | Location | Status |
|-------|----------|--------|
| Match logic (TS) | `jmap-webmail/lib/dedupe-config.ts` | Browser + shared rules |
| Match logic (Python) | `dedupe/dedupe_config.py` | CLI parity |
| JMAP scan/apply (Python) | `dedupe/dedupe.py` | **Production-ready CLI**, local JMAP |
| JMAP scan/apply (TS) | `jmap-webmail/lib/mail-dedupe.ts` | Browser — **retire for scan/apply** |
| Audit API + SQLite | `jmap-webmail/app/api/dedupe/` | Runs/progress/changes — **keep** |
| CLI container | `mail-dedupe` (compose `tools` profile) | One-shot, manual |

**Gap:** no long-running worker, no job queue, UI still executes scan in the browser.

---

## Kawka — what it is today vs dedupe

`/home/jas/dockersites/email/kawka/` is a **stub FastAPI service** (`/analyze`) for phishing/spam scoring (keyword heuristics, fingerprint hash). It is:

- **Not** in `docker-compose.yml`
- **Not** mailbox dedupe
- **Not** connected to Stalwart JMAP

### Should dedupe live in Kawka?

| Approach | Verdict |
|----------|---------|
| Repurpose Kawka as dedupe worker | **Not recommended** — different domain (ingress scoring vs mailbox hygiene); would confuse operators |
| Kawka as spam layer + separate dedupe worker | **Good** — Kawka scores *incoming* mail; dedupe worker cleans *existing* mailboxes |
| Rename Kawka → dedupe | **No** — you already have `mail-dedupe` with 90% of the JMAP code |

**Recommendation:** Keep Kawka for future ingress analysis. Grow **`mail-dedupe` into `dedupe-worker`** (long-running daemon + HTTP API). Optionally add a compose service alias `kawka-dedupe` only if you want the branding — implementation still lives in the dedupe Python package.

---

## Alternatives we considered

### 1. Stalwart built-in dedupe

Stalwart **blob store** deduplicates identical *raw bytes* (BLAKE3 content addressing). That saves disk when two users store the same attachment bytes. It does **not**:

- Find duplicate *messages* in a folder (different IDs, same Message-ID)
- Run match criteria (subject + from + date, etc.)
- Move extras to `dupes/` or `deleted/`

There is no JMAP “dedupe this mailbox” API. **Not a substitute.**

### 2. Sieve / JMAP filters

Sieve runs on **delivery**. It cannot scan 50k existing messages for duplicates. **Not applicable** for bulk cleanup.

### 3. Elasticsearch (you already run ES)

Could index fingerprints (`messageId`, subject hash, etc.) for fast duplicate *queries*. Still need a **worker** to move messages via JMAP. Reasonable **v2.1 enhancement** for fuzzy/search-heavy dedupe, not a replacement for the worker.

### 4. Apache Kafka

Useful when many services consume “mailbox changed” events at high volume. For a single Stalwart + JasMail node:

- **SQLite job queue** + in-process read/write pools is enough
- Kafka adds ops burden (brokers, topics, consumer groups) with no gain at current scale

If you later run multiple JasMail replicas, revisit Redis/Postgres queue or Kafka for job distribution.

### 5. Thunderbird RemoveDupes / other clients

Same class as browser dedupe — client pulls all mail. **Reject** as primary path.

### 6. `mail-dedupe` CLI only

Already correct for large folders but manual, no UI integration, no shared run state with review step. **Becomes the engine inside the worker**, not the UX.

---

## Target architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│  User browser                                                            │
│  Settings (criteria) · /dedupe (start job · review groups · apply)       │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │ HTTPS (job control + poll only)
                                ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  jasmail container                                                       │
│  POST /api/dedupe/jobs  →  enqueue + forward to worker                   │
│  GET  /api/dedupe/runs/:id  ←  SQLite audit (shared volume)              │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │ HTTP on mailnet (internal)
                                ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  dedupe-worker container (evolved from mail-dedupe)                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐  │
│  │ Read worker │  │ Read worker │  │ Read worker │  │ Write worker │  │
│  │  (scan)     │  │  (scan)     │  │  (scan)     │  │  (apply)     │  │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬───────┘  │
│         └────────────────┴────────────────┘                │         │
│                    Email/query + Email/get                   │         │
│                                                              Email/set │
└───────────────────────────────┬──────────────────────────────┴─────────┘
                                │ JMAP (localhost/mailnet)
                                ▼
                         ┌─────────────┐
                         │  Stalwart   │
                         └─────────────┘

Shared volume: jasmail-dedupe-data:/data
  - dedupe-audit.db (runs, progress, changes)
  - dedupe-groups.db or tables (scan results for UI review) [new]
```

### Worker rules (your requirement)

| Pool | Count | JMAP | Constraint |
|------|-------|------|------------|
| **Read** | 3 (configurable) | `Email/query`, `Email/get` | Parallel per-folder shards; **never** `Email/set` |
| **Write** | **1** | `Email/set`, `Mailbox/set` | Single writer; batches ≤ `maxObjectsInGet` |

Read workers persist groups to SQLite. Apply phase is queued only after user confirms in UI (or explicit auto-apply policy).

### Job lifecycle

1. UI `POST /api/dedupe/jobs` with `{ type: 'scan', scope, mailboxId, config }`.
2. JasMail creates `dedupe_runs` row (`status=queued`), calls worker `POST /internal/jobs`.
3. Worker assigns folder shards to read pool → `status=scanning`, appends `dedupe_progress`.
4. Groups written to `dedupe_scan_groups` (new table) keyed by `run_id`.
5. UI loads groups from API; user picks action + keeper policy.
6. UI `POST /api/dedupe/jobs` `{ type: 'apply', runId, actionId, ... }` → write worker only.
7. `status=complete`; `dedupe_message_changes` populated per batch.

### Auth

Worker trusts JasMail on `mailnet` only (no public port). JasMail forwards:

- `accountId` from session
- Service credential: `JMAP_USER` / `JMAP_PASSWORD` (app password) **or** per-user token exchange (v2)

Start with single service account (same as CLI); add per-user later if multi-tenant.

### Config sync

- UI stores criteria in `localStorage` today → **POST config JSON on job create** (and optional `DEDUPE_CONFIG` file on worker for CLI).
- Python `dedupe_config.py` already mirrors TS rules.

---

## Implementation phases (“do everything”)

### Phase 1 — Worker daemon (dedupe repo)

- [ ] `dedupe/worker.py` — FastAPI: `POST /jobs`, `GET /jobs/:id`, `POST /jobs/:id/cancel`
- [ ] Thread pool: 3 readers, 1 writer queue
- [ ] Refactor `dedupe.py` scan/apply into importable functions
- [ ] SQLite progress writes (same schema as JasMail audit, or HTTP callback to jasmail)
- [ ] `docker-compose.yml`: `dedupe-worker` service on `mailnet`, share `jasmail-dedupe-data`

### Phase 2 — JasMail BFF

- [ ] `POST /api/dedupe/jobs` — create run + dispatch to worker
- [ ] `GET /api/dedupe/runs/:id/groups` — serve stored scan groups
- [ ] Env: `DEDUPE_WORKER_URL=http://dedupe-worker:8090`

### Phase 3 — UI cutover

- [ ] Operations page: “Scan” → server job only (remove browser `scanFolderDuplicates` for production)
- [ ] Poll run status + show groups from API
- [ ] Apply → server job; browser highlights optional cache
- [ ] Keep browser scan behind `?dev=1` or remove

### Phase 4 — Hardening

- [ ] Cancel / resume interrupted scans
- [ ] Cron: `POST /api/dedupe/purge` for `deleted/` retention
- [ ] Metrics: folder size, duration, JMAP error rate

### Phase 5 — Optional enhancements

- [ ] ES fingerprint index for fuzzy dedupe
- [ ] Kawka hook: flag likely-duplicates on **ingress** (prevent future dupes)
- [ ] Export run report (CSV of groups)

---

## What to build first

**Do not** bolt dedupe onto Kawka’s `/analyze` endpoint.

**Do** promote `mail-dedupe` → **`dedupe-worker`**:

1. Same Python + JMAP code path as the CLI you already trust.
2. Same SQLite audit volume as JasMail.
3. Read/write worker split you asked for.
4. UI changes are mostly “call job API instead of `lib/mail-dedupe.ts`”.

Estimated order of work: Phase 1 (worker) → Phase 2 (BFF) → Phase 3 (UI). Phases 4–5 follow.

---

## Open questions

- Per-user JMAP credentials vs single app password on worker.
- Store full group payload in SQLite vs separate `dedupe-groups.db`.
- Max read concurrency vs Stalwart rate limits (start with 3, tune from telemetry).