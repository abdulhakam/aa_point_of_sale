CREATE TABLE "loyalty_programs" (
    'id' BLOB PRIMARY KEY CHECK (is_uuid_v7(id)) NOT NULL,
    'name' TEXT NOT NULL DEFAULT '',
    'fromDate' TEXT NOT NULL DEFAULT '',
    'toDate' TEXT NOT NULL DEFAULT '',
    'isEnabled' INTEGER NOT NULL DEFAULT 0,
    'conversionFactor' REAL NOT NULL DEFAULT 0,
    'expiryDuration' INTEGER NOT NULL DEFAULT 0,
    'expenseAccount' BLOB REFERENCES 'accounts'('id'),
    'maximumUse' INTEGER NOT NULL DEFAULT 0,
    'used' INTEGER NOT NULL DEFAULT 0,
    'created' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(created) IS NOT NULL),
    'updated' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(updated) IS NOT NULL)
) STRICT;