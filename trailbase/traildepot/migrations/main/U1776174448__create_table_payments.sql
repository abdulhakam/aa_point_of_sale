CREATE TABLE "payments" (
    'id' BLOB PRIMARY KEY CHECK (is_uuid(id)) NOT NULL,
    'amount' REAL NOT NULL DEFAULT 0,
    'description' TEXT NOT NULL DEFAULT '',
    'invoice' BLOB REFERENCES 'invoices'('id'),
    'paid' INTEGER NOT NULL DEFAULT 0,
    'party' BLOB REFERENCES 'parties'('id'),
    'type' TEXT NOT NULL DEFAULT '',
    'payment_date' TEXT NOT NULL DEFAULT '',
    'paid_to' TEXT NOT NULL DEFAULT '',
    'created' INTEGER NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
    'updated' INTEGER NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ'))
) STRICT;
CREATE TRIGGER update_payments_updated
AFTER
UPDATE ON payments BEGIN
UPDATE payments
SET updated = strftime('%Y-%m-%d %H:%M:%fZ')
WHERE id = NEW.id;
END;