CREATE TABLE "categories" (
    'id' BLOB PRIMARY KEY CHECK (is_uuid_v7(id)) NOT NULL,
    'name' TEXT NOT NULL,
    'created' INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    'updated' INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
) STRICT;
CREATE TRIGGER update_categories_updated
AFTER
UPDATE ON categories BEGIN
UPDATE categories
SET updated = strftime('%s', 'now')
WHERE id = NEW.id;
END;