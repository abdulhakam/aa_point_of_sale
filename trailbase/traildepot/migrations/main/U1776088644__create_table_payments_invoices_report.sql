CREATE TABLE payments_invoices_report (
    id TEXT PRIMARY KEY,
    dated TEXT,
    invoice TEXT,
    original_invoice TEXT,
    invoiceNo REAL,
    invoice_maker TEXT,
    booker TEXT,
    company TEXT,
    party TEXT,
    area TEXT,
    section TEXT,
    party_type TEXT,
    type TEXT,
    amount TEXT,
    paid INTEGER,
    description TEXT
);