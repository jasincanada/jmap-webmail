import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { DEDUPE_AUDIT_DB_PATH, DEDUPE_SCHEMA_VERSION } from './constants';

let dbInstance: Database.Database | null = null;
let dbPathOverride: string | null = null;

/** Split schema SQL into executable statements (skips comments and blanks). */
export function splitSchemaStatements(schemaSql: string): string[] {
  return schemaSql
    .split(';')
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0 && !statement.startsWith('--'));
}

function ensureSchemaMetaTable(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS dedupe_schema_meta (
      version INTEGER NOT NULL
    );
  `);
}

function getAppliedSchemaVersion(db: Database.Database): number | null {
  ensureSchemaMetaTable(db);
  const row = db.prepare('SELECT version FROM dedupe_schema_meta LIMIT 1').get() as
    | { version: number }
    | undefined;
  return row?.version ?? null;
}

/** Apply schema.sql migrations when the database is behind DEDUPE_SCHEMA_VERSION. */
export function runMigrations(db: Database.Database, schemaSql: string): void {
  const currentVersion = getAppliedSchemaVersion(db);
  if (currentVersion !== null && currentVersion >= DEDUPE_SCHEMA_VERSION) {
    return;
  }

  const statements = splitSchemaStatements(schemaSql);
  const migrate = db.transaction(() => {
    for (const statement of statements) {
      db.exec(`${statement};`);
    }
    db.prepare('DELETE FROM dedupe_schema_meta').run();
    db.prepare('INSERT INTO dedupe_schema_meta (version) VALUES (?)').run(DEDUPE_SCHEMA_VERSION);
  });
  migrate();
}

function loadSchemaSql(): string {
  const schemaPath = join(import.meta.dirname, 'schema.sql');
  return readFileSync(schemaPath, 'utf8');
}

function openDatabase(dbPath: string): Database.Database {
  const dir = dirname(dbPath);
  if (dir && dir !== '.') {
    mkdirSync(dir, { recursive: true });
  }

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  runMigrations(db, loadSchemaSql());
  return db;
}

/** Override DB path (tests). Must be called before the first getDb(). */
export function setDbPathForTests(dbPath: string | null): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
  dbPathOverride = dbPath;
}

/** Singleton SQLite handle for dedupe audit API routes. */
export function getDb(): Database.Database {
  if (!dbInstance) {
    const path = dbPathOverride ?? DEDUPE_AUDIT_DB_PATH;
    dbInstance = openDatabase(path);
  }
  return dbInstance;
}