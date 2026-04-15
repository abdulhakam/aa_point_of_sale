CREATE TABLE "uom_conversion_items" (
    'id' BLOB PRIMARY KEY CHECK (is_uuid_v7(id)) NOT NULL,
    'parent' BLOB NOT NULL REFERENCES 'items'('id'),
    'uom' BLOB REFERENCES 'uoms'('id'),
    'conversionFactor' REAL NOT NULL DEFAULT 0,
    'created' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(created) IS NOT NULL),
    'updated' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(updated) IS NOT NULL)
) STRICT;