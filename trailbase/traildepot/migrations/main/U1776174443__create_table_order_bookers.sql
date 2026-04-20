CREATE TABLE "order_bookers" (
    'id' BLOB PRIMARY KEY CHECK (is_uuid(id)) NOT NULL,
    'company' TEXT NOT NULL DEFAULT '{}',
    'name' TEXT NOT NULL DEFAULT '',
    'phone' TEXT NOT NULL DEFAULT '',
    'created' INTEGER NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
    'updated' INTEGER NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ'))
) STRICT;

CREATE TRIGGER update_order_bookers_updated AFTER UPDATE ON order_bookers
BEGIN
    UPDATE order_bookers SET updated = strftime('%Y-%m-%d %H:%M:%fZ') WHERE id = NEW.id;
END;