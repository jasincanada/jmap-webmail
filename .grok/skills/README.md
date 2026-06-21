# JasMail agent skills index

**Dev OS version:** see [jasmail-dev-os/DEV_OS_VERSION](jasmail-dev-os/DEV_OS_VERSION) · **Mode:** [DEV_OS_MODE](jasmail-dev-os/DEV_OS_MODE) (`maximum` = Option C)

## Orchestration

| Skill | Slash | Purpose |
|-------|-------|---------|
| [jasmail-dev-os](jasmail-dev-os/SKILL.md) | `/jasmail-dev-os` | Full release pipeline |
| [jasmail-upstream-maintainer](jasmail-upstream-maintainer/SKILL.md) | `/jasmail-upstream-maintainer` | Merge upstream changes |

## Implementation

| Skill | Slash | Purpose |
|-------|-------|---------|
| [jasmail-implementer](jasmail-implementer/SKILL.md) | `/jasmail-implementer` | Code per plan todo |
| [jasmail-test-writer](jasmail-test-writer/SKILL.md) | — | Tests after each todo |
| [jasmail-bugfixer](jasmail-bugfixer/SKILL.md) | — | Fix review findings |

## Review specialists

| Skill | Always run? |
|-------|-------------|
| [jasmail-code-reviewer](jasmail-code-reviewer/SKILL.md) | Yes |
| [jasmail-security-reviewer](jasmail-security-reviewer/SKILL.md) | Yes |
| [jasmail-test-reviewer](jasmail-test-reviewer/SKILL.md) | Yes |
| [jasmail-plan-reviewer](jasmail-plan-reviewer/SKILL.md) | Yes |
| [jasmail-a11y-reviewer](jasmail-a11y-reviewer/SKILL.md) | Always (maximum mode) |
| [jasmail-i18n-reviewer](jasmail-i18n-reviewer/SKILL.md) | Always (maximum mode) |
| [jasmail-stack-maintainer](jasmail-stack-maintainer/SKILL.md) | Always (maximum mode) |
| [jasmail-upstream-maintainer](jasmail-upstream-maintainer/SKILL.md) | Upstream merges (+8th) |

Policy: [docs/DEV_OS_POLICY.md](../../docs/DEV_OS_POLICY.md)

## Documentation bots (post SHIP CLEAR)

| Skill | Output |
|-------|--------|
| [jasmail-release-notes](jasmail-release-notes/SKILL.md) | VERSION, CHANGELOG |
| [jasmail-tester-docs](jasmail-tester-docs/SKILL.md) | TESTER_TASKS.md |
| [jasmail-product-features](jasmail-product-features/SKILL.md) | PRODUCT_FEATURES.md |
| [jasmail-github-issues](jasmail-github-issues/SKILL.md) | GitHub issues |

## References

| Path | Content |
|------|---------|
| [jasmail-dev-os/references/ACTIVE_MILESTONE.md](jasmail-dev-os/references/ACTIVE_MILESTONE.md) | Current version/plan |
| [jasmail-dev-os/references/review-patterns.md](jasmail-dev-os/references/review-patterns.md) | Living defect memory |
| [jasmail-dev-os/references/METRICS.md](jasmail-dev-os/references/METRICS.md) | Metrics schema |
| [jasmail-dev-os/DEV_OS_CHANGELOG.md](jasmail-dev-os/DEV_OS_CHANGELOG.md) | OS change log |

Human docs: [docs/DEV_OS.md](../../docs/DEV_OS.md)