CREATE TABLE "parties" (
    'id' BLOB PRIMARY KEY CHECK (is_uuid(id)) NOT NULL,
    'address' TEXT NOT NULL DEFAULT '',
    'area' BLOB NOT NULL REFERENCES 'areas'('id'),
    'name' TEXT NOT NULL DEFAULT '',
    'phone' TEXT NOT NULL DEFAULT '',
    'type' INTEGER NOT NULL REFERENCES 'parties_enum_type'('id'),
    'company' TEXT NOT NULL DEFAULT '{}',
    'created' INTEGER NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    'updated' INTEGER NOT NULL DEFAULT (CURRENT_TIMESTAMP)
) STRICT;
