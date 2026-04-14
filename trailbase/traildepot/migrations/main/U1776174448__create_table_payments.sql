CREATE TABLE "payments" (
    'id' BLOB PRIMARY KEY CHECK (is_uuid_v7(id)) NOT NULL,
    'amount' REAL NOT NULL DEFAULT 0,
    'description' TEXT NOT NULL DEFAULT '',
    'invoice' BLOB REFERENCES 'invoices'('id'),
    'paid' INTEGER NOT NULL DEFAULT 0,
    'party' BLOB REFERENCES 'parties'('id'),
    'type' TEXT NOT NULL DEFAULT '',
    'payment_date' TEXT NOT NULL DEFAULT '',
    'paid_to' TEXT NOT NULL DEFAULT '',
    'created' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(created) IS NOT NULL),
    'updated' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(updated) IS NOT NULL),
    'created_by' BLOB REFERENCES 'users'('id'),
    'updated_by' BLOB REFERENCES 'users'('id')
) STRICT;
