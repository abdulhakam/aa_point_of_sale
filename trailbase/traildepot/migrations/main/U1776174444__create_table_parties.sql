CREATE TABLE "parties" (
    'id' BLOB PRIMARY KEY CHECK (is_uuid(id)) NOT NULL,
    'address' TEXT NOT NULL DEFAULT '',
    'area' BLOB NOT NULL REFERENCES 'areas'('id'),
    'name' TEXT NOT NULL DEFAULT '',
    'phone' TEXT NOT NULL DEFAULT '',
    'type' TEXT NOT NULL DEFAULT '',
    'company' TEXT NOT NULL DEFAULT '{}',
    'created' INTEGER NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    'updated' INTEGER NOT NULL DEFAULT (CURRENT_TIMESTAMP)
) STRICT;
CREATE TRIGGER update_parties_updated
AFTER
UPDATE ON parties BEGIN
UPDATE parties
SET updated = CURRENT_TIMESTAMP
WHERE id = NEW.id;
END;