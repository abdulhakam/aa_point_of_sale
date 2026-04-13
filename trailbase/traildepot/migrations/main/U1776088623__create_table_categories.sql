CREATE TABLE categories STRICT (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  deleted INTEGER DEFAULT 0 CHECK(deleted IN (0,1)),
  created_at TEXT DEFAULT strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
  updated_at TEXT DEFAULT strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
);