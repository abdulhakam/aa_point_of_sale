CREATE TABLE "areas" (
    'id' BLOB PRIMARY KEY CHECK (is_uuid_v7(id)) NOT NULL,
    'name' TEXT NOT NULL,
    'section' BLOB NOT NULL REFERENCES 'sections'('id'),
    'created' INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    'updated' INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
) STRICT;
CREATE TRIGGER update_areas_updated
AFTER
UPDATE ON areas BEGIN
UPDATE areas
SET updated = strftime('%s', 'now')
WHERE id = NEW.id;
END;