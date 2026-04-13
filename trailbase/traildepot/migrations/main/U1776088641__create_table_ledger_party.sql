CREATE TABLE ledger_party (
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