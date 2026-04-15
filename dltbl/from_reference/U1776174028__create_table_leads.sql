CREATE TABLE "leads" (
    'id' BLOB PRIMARY KEY CHECK (is_uuid_v7(id)) NOT NULL,
    'name' TEXT NOT NULL DEFAULT '',
    'status' TEXT NOT NULL DEFAULT '',
    'email' TEXT NOT NULL DEFAULT '',
    'mobile' TEXT NOT NULL DEFAULT '',
    'address' BLOB REFERENCES 'addresses'('id'),
    'created' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(created) IS NOT NULL),
    'updated' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(updated) IS NOT NULL)
) STRICT;