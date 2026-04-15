CREATE TABLE "item_groups" (
    'id' BLOB PRIMARY KEY CHECK (is_uuid_v7(id)) NOT NULL,
    'image' TEXT NOT NULL DEFAULT '',
    'name' TEXT NOT NULL DEFAULT '',
    'tax' BLOB REFERENCES 'taxes'('id'),
    'hsnCode' TEXT NOT NULL DEFAULT '',
    'created' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(created) IS NOT NULL),
    'updated' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(updated) IS NOT NULL)
) STRICT;