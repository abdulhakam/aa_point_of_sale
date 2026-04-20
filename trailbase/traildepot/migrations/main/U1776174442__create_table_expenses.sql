CREATE TABLE "expenses" (
    'id' BLOB PRIMARY KEY CHECK (is_uuid(id)) NOT NULL,
    'amount' REAL NOT NULL DEFAULT 0,
    'description' TEXT NOT NULL DEFAULT '',
    'name' TEXT NOT NULL DEFAULT '',
    'date' TEXT NOT NULL DEFAULT '',
    'created' INTEGER NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
    'updated' INTEGER NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ'))
) STRICT;
CREATE TRIGGER update_expenses_updated
AFTER
UPDATE ON expenses BEGIN
UPDATE expenses
SET updated = strftime('%Y-%m-%d %H:%M:%fZ')
WHERE id = NEW.id;
END;