CREATE TABLE invoices_return_reference STRICT (
  id TEXT PRIMARY KEY,
  original_invoices TEXT REFERENCES invoices(id),
  created_at TEXT DEFAULT strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
  updated_at TEXT DEFAULT strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
);