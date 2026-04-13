CREATE TABLE invoices STRICT (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('purchase','sale','return','difference')),
  invoiceNo REAL,
  booker TEXT REFERENCES order_bookers(id),
  party TEXT REFERENCES parties(id),
  invoice_maker TEXT REFERENCES users(id),
  discount_1 REAL CHECK(discount_1 >= 0),
  discount_2 REAL CHECK(discount_2 >= 0),
  description TEXT,
  duedate TEXT CHECK(duedate GLOB '????-??-??'),
  completed INTEGER DEFAULT 0 CHECK(completed IN (0,1)),
  deleted INTEGER DEFAULT 0 CHECK(deleted IN (0,1)),
  dated TEXT CHECK(dated GLOB '????-??-??'),
  discount_rs REAL CHECK(discount_rs >= 0),
  created_at TEXT DEFAULT strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
  updated_at TEXT DEFAULT strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
);