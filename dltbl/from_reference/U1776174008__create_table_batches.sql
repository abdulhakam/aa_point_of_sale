CREATE TABLE "batches" (
    'id' BLOB PRIMARY KEY CHECK (is_uuid_v7(id)) NOT NULL,
    'name' TEXT NOT NULL DEFAULT '',
    'item' BLOB REFERENCES 'items'('id'),
    'expiryDate' TEXT NOT NULL DEFAULT '',
    'manufactureDate' TEXT NOT NULL DEFAULT '',
    'created' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(created) IS NOT NULL),
    'updated' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(updated) IS NOT NULL)
) STRICT;