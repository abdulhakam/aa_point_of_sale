CREATE TABLE parties STRICT (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT CHECK(type IN ('supplier','customer')),
  phone TEXT,
  address TEXT,
  area TEXT REFERENCES areas(id),
  deleted INTEGER DEFAULT 0 CHECK(deleted IN (0,1)),
  company TEXT REFERENCES categories(id),
  created_at TEXT DEFAULT strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
  updated_at TEXT DEFAULT strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
);