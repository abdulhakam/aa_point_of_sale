CREATE TABLE "stock_movement_items" (
    'id' BLOB PRIMARY KEY CHECK (is_uuid_v7(id)) NOT NULL,
    'parent' BLOB NOT NULL REFERENCES 'stock_movements'('id'),
    'item' BLOB REFERENCES 'items'('id'),
    'fromLocation' BLOB REFERENCES 'locations'('id'),
    'toLocation' BLOB REFERENCES 'locations'('id'),
    'transferUnit' BLOB REFERENCES 'uoms'('id'),
    'transferQuantity' REAL NOT NULL DEFAULT 0,
    'unit' BLOB REFERENCES 'uoms'('id'),
    'batch' BLOB REFERENCES 'batches'('id'),
    'serialNumber' TEXT NOT NULL DEFAULT '',
    'quantity' REAL NOT NULL DEFAULT 0,
    'unitConversionFactor' REAL NOT NULL DEFAULT 0,
    'rate' REAL NOT NULL DEFAULT 0,
    'amount' REAL NOT NULL DEFAULT 0,
    'created' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(created) IS NOT NULL),
    'updated' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(updated) IS NOT NULL)
) STRICT;