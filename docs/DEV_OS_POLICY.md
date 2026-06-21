# Development OS policy — Option C (Maximum Quality)

**Mode:** `maximum` · **Owner:** solo developer · **Goal:** never ship broken fork features; never absorb upstream blindly.

> Feel the pain. Never get hacked.

This policy is binding for JasMail. Agents and hooks enforce it mechanically where possible.

## Principles

1. **You review; agents execute.** No auto-merge from upstream. No tag without `SHIP CLEAR: 0`.
2. **Fork features are sacred.** Dedupe, dev OS, JasMail docs — protected by `fork-only-paths.json` and regression tests.
3. **CVE ≠ fast lane.** Security fixes get the **same** full pipeline as feature merges. Speed comes from starting immediately, not from skipping gates.
4. **Deferrals are written.** Deferring upstream work requires a `MERGE_LOG.md` entry with rationale. Silent drift is forbidden.
5. **Cherry-picks are merges.** A single-commit cherry-pick still runs the full upstream merge checklist and review artifact.

## Upstream intake (mandatory)

### Weekly triage (non-negotiable)

```bash
npm run upstream:triage
```

Runs fetch + human report. File a GitHub issue when `upstreamCommitsAhead > 0`.

### When upstream is ahead

| Your decision | Required actions |
|---------------|------------------|
| **Merge** | `/jasmail-upstream-maintainer` → full checklist → all 8 specialists → `check:ship:maximum` → tag if releasing |
| **Cherry-pick** | Same as merge (one commit still gets full review + gates) |
| **Defer** | Append `MERGE_LOG.md` row: date, upstream version, `deferred`, reason, next review date |

**CVE commits:** merge or cherry-pick within 7 days. Defer requires explicit risk note in `MERGE_LOG.md`.

### Blockers

- **Feature milestones pause** while unmerged CVEs exist upstream (`upstream:status --strict` fails).
- **No `git tag`** until `check:ship:maximum -- --version X.Y.Z` passes and review artifact exists.

## Review scope (no skips)

Under Option C, **every release and upstream merge** runs all specialists:

| Specialist | Always |
|------------|--------|
| jasmail-upstream-maintainer | Upstream merges only |
| jasmail-code-reviewer | Yes |
| jasmail-security-reviewer | Yes |
| jasmail-vulnerability-reviewer | Yes |
| jasmail-test-reviewer | Yes |
| jasmail-plan-reviewer | Yes |
| jasmail-a11y-reviewer | Yes |
| jasmail-i18n-reviewer | Yes |
| jasmail-stack-maintainer | Yes |

Set `DEV_OS_MODE=maximum` (default in this repo) or use `npm run diff:scope` which reads `.grok/skills/jasmail-dev-os/DEV_OS_MODE`.

## Gates (escalating pain)

| Command | When | Includes |
|---------|------|----------|
| `npm run check:ship` | Every commit (pre-commit) | lint, typecheck, test, locales |
| `npm run check:ship:full` | PR / main push | + production build |
| `npm run check:ship:maximum` | Before **every tag** and **every upstream merge** | + dedupe suite + E2E + `check:vulnerabilities` + upstream strict check + review artifact |

Upstream merges also require:

```bash
cd /home/jas/dockersites/email && docker compose build jasmail
```

## Artifacts (non-negotiable)

| Event | Artifact |
|-------|----------|
| Feature release | `docs/reviews/YYYY-MM-DD-vX.Y.Z-review.md` |
| Upstream merge | `docs/reviews/YYYY-MM-DD-upstream-vX.Y.Z-merge.md` |
| Upstream defer | `docs/upstream/MERGE_LOG.md` row only |

Pre-push hook blocks tags without SHIP CLEAR artifact + maximum gate (when configured).

## Solo developer cadence

| Cadence | Action |
|---------|--------|
| Daily | `npm run check:ship` via pre-commit |
| Weekly | `npm run upstream:triage` |
| Per todo | implementer → test-writer → plan-reviewer micro |
| Per release | Full dev-os or upstream-maintainer through Phase 7 |
| Post-release | metrics + retrospective + `review-patterns.md` |

## What Option C explicitly forbids

- Blind `git merge origin/main`
- Tagging without review artifact
- Skipping specialists because "small change"
- Cherry-picking CVE without security reviewer sign-off
- Deferring CVE without `MERGE_LOG` risk note
- Pushing to upstream `root-fr/jmap-webmail`

## References

- [DEV_OS.md](DEV_OS.md) — hub
- [UPSTREAM_MERGE.md](UPSTREAM_MERGE.md) — merge procedure
- [UPSTREAM_MERGE_CHECKLIST.md](UPSTREAM_MERGE_CHECKLIST.md) — sign-off
- [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) — feature releases