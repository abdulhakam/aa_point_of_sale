CREATE TABLE "invoices_return_reference" (
    'id' BLOB PRIMARY KEY CHECK (is_uuid_v7(id)) NOT NULL,
    'original_invoices' BLOB REFERENCES 'invoices'('id'),
    'created' INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    'updated' INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
) STRICT;
CREATE TRIGGER update_invoices_return_reference_updated
AFTER
UPDATE ON invoices_return_reference BEGIN
UPDATE invoices_return_reference
SET updated = strftime('%s', 'now')
WHERE id = NEW.id;
END;