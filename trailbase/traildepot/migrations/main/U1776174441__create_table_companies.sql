CREATE TABLE "companies" (
  'id' BLOB PRIMARY KEY CHECK (is_uuid(id)) NOT NULL,
  'name' TEXT NOT NULL,
  'created' INTEGER NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
  'updated' INTEGER NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ'))
) STRICT;
CREATE TRIGGER update_companies_updated
AFTER
UPDATE ON companies BEGIN
UPDATE companies
SET updated = strftime('%Y-%m-%d %H:%M:%fZ')
WHERE id = NEW.id;
END;