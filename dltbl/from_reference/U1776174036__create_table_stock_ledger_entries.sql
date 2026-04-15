CREATE TABLE "stock_ledger_entries" (
    'id' BLOB PRIMARY KEY CHECK (is_uuid_v7(id)) NOT NULL,
    'name' TEXT NOT NULL DEFAULT '',
    'date' TEXT NOT NULL DEFAULT '',
    'location' BLOB REFERENCES 'locations'('id'),
    'batch' BLOB REFERENCES 'batches'('id'),
    'serialNumber' BLOB REFERENCES 'serial_numbers'('id'),
    'item' BLOB REFERENCES 'items'('id'),
    'rate' REAL NOT NULL DEFAULT 0,
    'quantity' REAL NOT NULL DEFAULT 0,
    'referenceType' TEXT NOT NULL DEFAULT '',
    'referenceName' TEXT NOT NULL DEFAULT '',
    'created' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(created) IS NOT NULL),
    'updated' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(updated) IS NOT NULL)
) STRICT;