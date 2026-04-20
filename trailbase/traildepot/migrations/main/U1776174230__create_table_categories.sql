CREATE TABLE "categories" (
    'id' BLOB PRIMARY KEY CHECK (is_uuid(id)) NOT NULL,
    'name' TEXT NOT NULL,
    'created' INTEGER NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
    'updated' INTEGER NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ'))
) STRICT;
CREATE TRIGGER update_categories_updated
AFTER
UPDATE ON categories BEGIN
UPDATE categories
SET updated = strftime('%Y-%m-%d %H:%M:%fZ')
WHERE id = NEW.id;
END;