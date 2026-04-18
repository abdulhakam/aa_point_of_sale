CREATE TABLE "order_bookers" (
    'id' BLOB PRIMARY KEY CHECK (is_uuid_v7(id)) NOT NULL,
    'company' TEXT NOT NULL DEFAULT '{}',
    'name' TEXT NOT NULL DEFAULT '',
    'phone' TEXT NOT NULL DEFAULT '',
    'created' INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    'updated' INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
) STRICT;

CREATE TRIGGER update_order_bookers_updated AFTER UPDATE ON order_bookers
BEGIN
    UPDATE order_bookers SET updated = strftime('%s', 'now') WHERE id = NEW.id;
END;