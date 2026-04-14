CREATE TABLE "areas" (
    'id' BLOB PRIMARY KEY CHECK (is_uuid_v7(id)) NOT NULL,
    'name' TEXT NOT NULL,
    'section' BLOB NOT NULL REFERENCES 'sections'('id'),
    'created' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(created) IS NOT NULL)
) STRICT;