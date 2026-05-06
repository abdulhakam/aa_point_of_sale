CREATE TABLE "payments" (
    'id' BLOB PRIMARY KEY CHECK (is_uuid_v7(id)) DEFAULT (uuid_v7()) NOT NULL,
    'amount' REAL NOT NULL DEFAULT 0,
    'description' TEXT NOT NULL DEFAULT '',
    'invoice' BLOB REFERENCES 'invoices'('id'),
    'paid' INTEGER NOT NULL DEFAULT 0,
    'party' BLOB REFERENCES 'parties'('id'),
    'type' INTEGER NOT NULL REFERENCES 'payments_enum_type'('id'),
    'payment_date' TEXT NOT NULL DEFAULT '',
    'paid_to' TEXT NOT NULL DEFAULT '',
    'created' INTEGER NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    'updated' INTEGER NOT NULL DEFAULT (CURRENT_TIMESTAMP)
) STRICT;
