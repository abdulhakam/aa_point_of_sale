CREATE TABLE ledger_journal (
    id TEXT PRIMARY KEY,
    invoiceNo TEXT,
    description TEXT,
    transaction_type TEXT,
    account_type TEXT,
    party_type TEXT,
    accounts_recievable TEXT,
    accounts_payable TEXT,
    cash TEXT,
    stock TEXT
);