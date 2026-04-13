CREATE TABLE transactions STRICT (
  id TEXT PRIMARY KEY,
  invoice TEXT NOT NULL REFERENCES invoices(id),
  item TEXT NOT NULL REFERENCES items(id),
  cost_price REAL CHECK(cost_price >= 0),
  price REAL CHECK(price >= 0),
  qty INTEGER CHECK(qty >= 0),
  scheme REAL,
  discount_1 REAL CHECK(discount_1 >= 0),
  discount_2 REAL CHECK(discount_2 >= 0),
  deleted INTEGER DEFAULT 0 CHECK(deleted IN (0,1)),
  discount_rs REAL CHECK(discount_rs >= 0),
  created_at TEXT DEFAULT strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
  updated_at TEXT DEFAULT strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
);