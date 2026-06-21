CREATE TABLE dedupe_runs (
  id            TEXT PRIMARY KEY,
  account_id    TEXT NOT NULL,
  type          TEXT NOT NULL,
  status        TEXT NOT NULL,
  scope         TEXT NOT NULL,
  mailbox_id    TEXT,
  action_id     TEXT,
  started_at    INTEGER NOT NULL,
  completed_at  INTEGER,
  stats_json    TEXT
);

CREATE TABLE dedupe_progress (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id     TEXT NOT NULL REFERENCES dedupe_runs(id),
  ts         INTEGER NOT NULL,
  folder     TEXT,
  position   INTEGER,
  total      INTEGER,
  message    TEXT
);

CREATE TABLE dedupe_message_changes (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id          TEXT NOT NULL REFERENCES dedupe_runs(id),
  email_id        TEXT NOT NULL,
  group_key       TEXT,
  from_mailbox_id TEXT NOT NULL,
  to_mailbox_id   TEXT,
  action_id       TEXT NOT NULL,
  keeper          INTEGER NOT NULL DEFAULT 0,
  changed_at      INTEGER NOT NULL,
  purge_after     INTEGER
);

CREATE INDEX idx_changes_run ON dedupe_message_changes(run_id);
CREATE INDEX idx_changes_purge ON dedupe_message_changes(purge_after) WHERE purge_after IS NOT NULL;