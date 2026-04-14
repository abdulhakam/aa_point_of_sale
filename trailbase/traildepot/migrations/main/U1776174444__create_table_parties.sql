CREATE TABLE "parties" (
    'id' BLOB PRIMARY KEY CHECK (is_uuid_v7(id)) NOT NULL,
    'address' TEXT NOT NULL DEFAULT '',
    'area' BLOB NOT NULL REFERENCES 'areas'('id'),
    'name' TEXT NOT NULL DEFAULT '',
    'phone' TEXT NOT NULL DEFAULT '',
    'type' TEXT NOT NULL DEFAULT '',
    'company' TEXT NOT NULL DEFAULT '{}',
    'created' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(created) IS NOT NULL),
    'updated' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(updated) IS NOT NULL),
    'created_by' BLOB REFERENCES 'users'('id'),
    'updated_by' BLOB REFERENCES 'users'('id')
) STRICT;
