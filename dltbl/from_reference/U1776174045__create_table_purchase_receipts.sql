CREATE TABLE "purchase_receipts" (
    'id' BLOB PRIMARY KEY CHECK (is_uuid_v7(id)) NOT NULL,
    'name' TEXT NOT NULL DEFAULT '',
    'numberSeries' BLOB REFERENCES 'number_series'('id'),
    'party' BLOB REFERENCES 'parties'('id'),
    'date' TEXT NOT NULL DEFAULT '',
    'grandTotal' REAL NOT NULL DEFAULT 0,
    'terms' TEXT NOT NULL DEFAULT '',
    'attachment' TEXT NOT NULL DEFAULT '',
    'isReturned' INTEGER NOT NULL DEFAULT 0,
    'backReference' BLOB REFERENCES 'purchase_invoices'('id'),
    'returnAgainst' BLOB REFERENCES 'purchase_receipts'('id'),
    'created' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(created) IS NOT NULL),
    'updated' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(updated) IS NOT NULL)
) STRICT;