CREATE TABLE "closing_amounts" (
    'id' BLOB PRIMARY KEY CHECK (is_uuid_v7(id)) NOT NULL,
    'parent' BLOB NOT NULL REFERENCES 'pos_closing_shift'('id'),
    'paymentMethod' TEXT NOT NULL DEFAULT '',
    'openingAmount' REAL NOT NULL DEFAULT 0,
    'closingAmount' REAL NOT NULL DEFAULT 0,
    'expectedAmount' REAL NOT NULL DEFAULT 0,
    'differenceAmount' REAL NOT NULL DEFAULT 0,
    'created' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(created) IS NOT NULL),
    'updated' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(updated) IS NOT NULL)
) STRICT;