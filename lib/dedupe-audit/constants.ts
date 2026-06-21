const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const DEDUPE_AUDIT_DB_PATH =
  process.env.DEDUPE_AUDIT_DB_PATH ?? '/data/dedupe-audit.db';

export const DEDUPE_DELETED_RETENTION_DAYS = parseRetentionDays(
  process.env.DEDUPE_DELETED_RETENTION_DAYS,
);

export const DEDUPE_SCHEMA_VERSION = 1;

function parseRetentionDays(raw: string | undefined): number {
  if (raw === undefined || raw === '') return 90;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 90;
  return parsed;
}

/** Retention days from env (or override); safe for tests. */
export function getRetentionDays(override?: number): number {
  if (override !== undefined) return override;
  return DEDUPE_DELETED_RETENTION_DAYS;
}

/** Unix ms when a soft-deleted message becomes eligible for permanent purge. */
export function computePurgeAfter(changedAtMs: number, retentionDays?: number): number {
  return changedAtMs + getRetentionDays(retentionDays) * MS_PER_DAY;
}

/** True when purge_after is set and on or before `nowMs` (default: Date.now()). */
export function isDueForPurge(purgeAfter: number | null | undefined, nowMs = Date.now()): boolean {
  return purgeAfter != null && purgeAfter <= nowMs;
}