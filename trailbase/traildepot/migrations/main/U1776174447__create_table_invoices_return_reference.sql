CREATE TABLE "invoices_return_reference" (
    'id' BLOB PRIMARY KEY CHECK (is_uuid(id)) NOT NULL,
    'original_invoices' BLOB REFERENCES 'invoices'('id'),
    'created' INTEGER NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
    'updated' INTEGER NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ'))
) STRICT;
CREATE TRIGGER update_invoices_return_reference_updated
AFTER
UPDATE ON invoices_return_reference BEGIN
UPDATE invoices_return_reference
SET updated = strftime('%Y-%m-%d %H:%M:%fZ')
WHERE id = NEW.id;
END;