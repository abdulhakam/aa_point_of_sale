CREATE TABLE "users" (
    'id' BLOB PRIMARY KEY REFERENCES '_user'('id') CHECK (is_uuid_v7(id)) NOT NULL,
    'email' TEXT REFERENCES '_user'('email'),
    'name' TEXT NOT NULL DEFAULT '',
    'username' TEXT NOT NULL DEFAULT '',
    'created' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(created) IS NOT NULL),
    'updated' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(updated) IS NOT NULL)
) STRICT;