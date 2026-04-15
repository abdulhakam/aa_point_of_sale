CREATE TABLE "item_packaging" (
    'id' BLOB PRIMARY KEY CHECK (is_uuid_v7(id)) NOT NULL,
    'item' BLOB NOT NULL REFERENCES 'items'('id'),
    'level' BLOB REFERENCES 'packaging_levels'('id'),
    'contains' INTEGER NOT NULL DEFAULT 1,
    'nextLevel' BLOB REFERENCES 'packaging_levels'('id'),
    'created' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(created) IS NOT NULL),
    'updated' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(updated) IS NOT NULL)
) STRICT;