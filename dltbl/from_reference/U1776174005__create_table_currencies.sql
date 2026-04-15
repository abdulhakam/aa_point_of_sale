CREATE TABLE "currencies" (
    'id' BLOB PRIMARY KEY CHECK (is_uuid_v7(id)) NOT NULL,
    'name' TEXT NOT NULL DEFAULT '',
    'fraction' TEXT NOT NULL DEFAULT '',
    'fractionUnits' INTEGER NOT NULL DEFAULT 0,
    'smallestValue' REAL NOT NULL DEFAULT 0,
    'symbol' TEXT NOT NULL DEFAULT '',
    'created' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(created) IS NOT NULL),
    'updated' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(updated) IS NOT NULL)
) STRICT;