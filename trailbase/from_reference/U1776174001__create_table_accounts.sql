CREATE TABLE "accounts" (
    'id' BLOB PRIMARY KEY CHECK (is_uuid_v7(id)) NOT NULL,
    'name' TEXT NOT NULL DEFAULT '',
    'rootType' TEXT NOT NULL DEFAULT '',
    'parentAccount' BLOB REFERENCES 'accounts'('id'),
    'accountType' TEXT NOT NULL DEFAULT '',
    'isGroup' INTEGER NOT NULL DEFAULT 0,
    'created' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(created) IS NOT NULL),
    'updated' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(updated) IS NOT NULL)
) STRICT;