-- One row per account. `id` is a hash of the recovery code (the code itself is never stored).
-- `body` is the merged document (JSON); `rev` counts writes so two devices can't overwrite each other.
CREATE TABLE IF NOT EXISTS docs (
  id TEXT PRIMARY KEY,
  body TEXT,
  rev INTEGER NOT NULL DEFAULT 0,
  created INTEGER NOT NULL,
  updated INTEGER NOT NULL
);
