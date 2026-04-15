CREATE TABLE "tax_details" (
    'id' BLOB PRIMARY KEY CHECK (is_uuid_v7(id)) NOT NULL,
    'parent' BLOB NOT NULL REFERENCES 'taxes'('id'),
    'account' BLOB REFERENCES 'accounts'('id'),
    'payment_account' BLOB REFERENCES 'accounts'('id'),
    'rate' REAL NOT NULL DEFAULT 0,
    'created' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(created) IS NOT NULL),
    'updated' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(updated) IS NOT NULL)
) STRICT;