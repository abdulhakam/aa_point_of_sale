CREATE TABLE "expenses" (
    'id' BLOB PRIMARY KEY CHECK (is_uuid_v7(id)) NOT NULL,
    'amount' REAL NOT NULL DEFAULT 0,
    'description' TEXT NOT NULL DEFAULT '',
    'name' TEXT NOT NULL DEFAULT '',
    'date' TEXT NOT NULL DEFAULT '',
    'created' INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    'updated' INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
) STRICT;
CREATE TRIGGER update_expenses_updated
AFTER
UPDATE ON expenses BEGIN
UPDATE expenses
SET updated = strftime('%s', 'now')
WHERE id = NEW.id;
END;