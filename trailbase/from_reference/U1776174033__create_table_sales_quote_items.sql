CREATE TABLE "sales_quote_items" (
    'id' BLOB PRIMARY KEY CHECK (is_uuid_v7(id)) NOT NULL,
    'parent' BLOB NOT NULL REFERENCES 'sales_quotes'('id'),
    'item' BLOB REFERENCES 'items'('id'),
    'itemCode' TEXT NOT NULL DEFAULT '',
    'description' TEXT NOT NULL DEFAULT '',
    'rate' REAL NOT NULL DEFAULT 0,
    'transferUnit' BLOB REFERENCES 'uoms'('id'),
    'transferQuantity' REAL NOT NULL DEFAULT 0,
    'qty' REAL NOT NULL DEFAULT 0,
    'unit' BLOB REFERENCES 'uoms'('id'),
    'quantity' REAL NOT NULL DEFAULT 0,
    'unitConversionFactor' REAL NOT NULL DEFAULT 0,
    'account' BLOB REFERENCES 'accounts'('id'),
    'tax' BLOB REFERENCES 'taxes'('id'),
    'amount' REAL NOT NULL DEFAULT 0,
    'created' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(created) IS NOT NULL),
    'updated' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(updated) IS NOT NULL)
) STRICT;