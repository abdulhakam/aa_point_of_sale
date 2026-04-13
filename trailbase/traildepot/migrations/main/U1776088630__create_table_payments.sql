CREATE TABLE payments STRICT (
  id TEXT PRIMARY KEY,
  invoice TEXT REFERENCES invoices(id),
  type TEXT CHECK(type IN ('sending','recieving','return')),
  party TEXT REFERENCES parties(id),
  amount REAL CHECK(amount >= 0),
  description TEXT,
  paid INTEGER DEFAULT 0 CHECK(paid IN (0,1)),
  payment_date TEXT CHECK(payment_date GLOB '????-??-??'),
  paid_to TEXT REFERENCES order_bookers(id),
  created_at TEXT DEFAULT strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
  updated_at TEXT DEFAULT strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
);