CREATE TABLE "parties" (
    'id' BLOB PRIMARY KEY CHECK (is_uuid(id)) NOT NULL,
    'address' TEXT NOT NULL DEFAULT '',
    'area' BLOB NOT NULL REFERENCES 'areas'('id'),
    'name' TEXT NOT NULL DEFAULT '',
    'phone' TEXT NOT NULL DEFAULT '',
    'type' TEXT NOT NULL DEFAULT '',
    'company' TEXT NOT NULL DEFAULT '{}',
    'created' INTEGER NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
    'updated' INTEGER NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ'))
) STRICT;
CREATE TRIGGER update_parties_updated
AFTER
UPDATE ON parties BEGIN
UPDATE parties
SET updated = strftime('%Y-%m-%d %H:%M:%fZ')
WHERE id = NEW.id;
END;