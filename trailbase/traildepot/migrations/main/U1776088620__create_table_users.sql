CREATE TABLE users STRICT (
  id TEXT PRIMARY KEY,
  name TEXT,
  avatar TEXT,
  email TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  email_verified INTEGER DEFAULT 0 CHECK(email_verified IN (0,1)),
  created_at TEXT DEFAULT strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
  updated_at TEXT DEFAULT strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
);