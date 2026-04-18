CREATE TABLE "invoices_return_reference" (
    'id' TEXT PRIMARY KEY NOT NULL,
    'original_invoices' TEXT REFERENCES 'invoices'('id'),
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