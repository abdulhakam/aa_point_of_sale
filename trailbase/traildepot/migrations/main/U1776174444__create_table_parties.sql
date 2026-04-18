CREATE TABLE "parties" (
    'id' BLOB PRIMARY KEY CHECK (is_uuid_v7(id)) NOT NULL,
    'address' TEXT NOT NULL DEFAULT '',
    'area' BLOB NOT NULL REFERENCES 'areas'('id'),
    'name' TEXT NOT NULL DEFAULT '',
    'phone' TEXT NOT NULL DEFAULT '',
    'type' TEXT NOT NULL DEFAULT '',
    'company' TEXT NOT NULL DEFAULT '{}',
    'created' INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    'updated' INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
) STRICT;
CREATE TRIGGER update_parties_updated
AFTER
UPDATE ON parties BEGIN
UPDATE parties
SET updated = strftime('%s', 'now')
WHERE id = NEW.id;
END;