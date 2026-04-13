CREATE TABLE items STRICT (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT REFERENCES categories(id),
  cost_price REAL CHECK(cost_price >= 0),
  sale_price REAL CHECK(sale_price >= 0),
  box_size_qty INTEGER CHECK(box_size_qty >= 0),
  created_at TEXT DEFAULT strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
  updated_at TEXT DEFAULT strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
);