CREATE TABLE ledger_area (
    id TEXT PRIMARY KEY,
    description TEXT,
    dated TEXT,
    invoice TEXT,
    party TEXT,
    type TEXT,
    paid INTEGER,
    credit TEXT,
    debit TEXT,
    balance TEXT
);