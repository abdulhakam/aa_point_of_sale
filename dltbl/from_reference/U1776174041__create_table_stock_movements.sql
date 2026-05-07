CREATE TABLE "stock_movements" (
    'id' BLOB PRIMARY KEY CHECK (is_uuid_v7(id)) NOT NULL,
    'name' TEXT NOT NULL DEFAULT '',
    'numberSeries' BLOB REFERENCES 'number_series'('id'),
    'movementType' TEXT NOT NULL DEFAULT '',
    'date' TEXT NOT NULL DEFAULT '',
    'amount' REAL NOT NULL DEFAULT 0,
    'created' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(created) IS NOT NULL),
    'updated' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(updated) IS NOT NULL)
) STRICT;