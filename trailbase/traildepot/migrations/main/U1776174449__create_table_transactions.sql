CREATE TABLE "transactions" (
    'id' BLOB PRIMARY KEY CHECK (is_uuid_v7(id)) NOT NULL,
    'discount_1' REAL NOT NULL DEFAULT 0,
    'discount_2' REAL NOT NULL DEFAULT 0,
    'invoice' TEXT REFERENCES 'invoices'('id'),
    'item' BLOB REFERENCES 'products'('id'),
    'price' REAL NOT NULL DEFAULT 0,
    'qty' REAL NOT NULL DEFAULT 0,
    'scheme' REAL NOT NULL DEFAULT 0,
    'cost_price' REAL NOT NULL DEFAULT 0,
    'discount_rs' REAL NOT NULL DEFAULT 0,
    'created' INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    'updated' INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
) STRICT;
CREATE TRIGGER update_transactions_updated
AFTER
UPDATE ON transactions BEGIN
UPDATE transactions
SET updated = strftime('%s', 'now')
WHERE id = NEW.id;
END;