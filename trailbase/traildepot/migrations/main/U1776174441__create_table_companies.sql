CREATE TABLE "companies" (
  'id' BLOB PRIMARY KEY CHECK (is_uuid_v7(id)) NOT NULL,
  'name' TEXT NOT NULL,
  'created' INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  'updated' INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
) STRICT;
CREATE TRIGGER update_companies_updated
AFTER
UPDATE ON companies BEGIN
UPDATE companies
SET updated = strftime('%s', 'now')
WHERE id = NEW.id;
END;