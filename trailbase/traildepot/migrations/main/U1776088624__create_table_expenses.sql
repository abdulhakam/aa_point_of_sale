CREATE TABLE expenses STRICT (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  amount REAL CHECK(amount >= 0),
  date TEXT NOT NULL CHECK(date GLOB '????-??-??'),
  created_at TEXT DEFAULT strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
  updated_at TEXT DEFAULT strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
);