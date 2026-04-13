CREATE TABLE invoice_view (
    id TEXT PRIMARY KEY,
    dated TEXT,
    type TEXT,
    invoiceNo REAL,
    party TEXT,
    booker TEXT,
    invoice_maker TEXT,
    discount_1 REAL,
    discount_2 REAL,
    total TEXT,
    unrounded_total TEXT,
    discount_rs REAL,
    final_total TEXT,
    duedate TEXT,
    description TEXT,
    deleted INTEGER,
    completed INTEGER
);