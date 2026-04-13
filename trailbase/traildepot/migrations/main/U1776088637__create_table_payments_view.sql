CREATE TABLE payments_view (
    id TEXT PRIMARY KEY,
    payment_date TEXT,
    invoice TEXT,
    original_invoices TEXT,
    invoiceNo REAL,
    invoice_maker TEXT,
    booker TEXT,
    company TEXT,
    paid_to TEXT,
    party TEXT,
    party_type TEXT,
    type TEXT,
    amount TEXT,
    paid INTEGER,
    area TEXT,
    section TEXT,
    description TEXT
);