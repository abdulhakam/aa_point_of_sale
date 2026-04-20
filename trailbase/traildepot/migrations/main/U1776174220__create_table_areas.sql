CREATE TABLE "areas" (
    'id' BLOB PRIMARY KEY CHECK (is_uuid(id)) NOT NULL,
    'name' TEXT NOT NULL,
    'section' BLOB NOT NULL REFERENCES 'sections'('id'),
    'created' INTEGER NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
    'updated' INTEGER NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ'))
) STRICT;
CREATE TRIGGER update_areas_updated
AFTER
UPDATE ON areas BEGIN
UPDATE areas
SET updated = strftime('%Y-%m-%d %H:%M:%fZ')
WHERE id = NEW.id;
END;