CREATE TABLE "transactions" (
    'id' BLOB PRIMARY KEY CHECK (is_uuid(id)) NOT NULL,
    'discount_1' REAL NOT NULL DEFAULT 0,
    'discount_2' REAL NOT NULL DEFAULT 0,
    'invoice' BLOB REFERENCES 'invoices'('id'),
    'item' BLOB REFERENCES 'products'('id'),
    'price' REAL NOT NULL DEFAULT 0,
    'qty' REAL NOT NULL DEFAULT 0,
    'scheme' REAL NOT NULL DEFAULT 0,
    'cost_price' REAL NOT NULL DEFAULT 0,
    'discount_rs' REAL NOT NULL DEFAULT 0,
    'created' INTEGER NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
    'updated' INTEGER NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ'))
) STRICT;
CREATE TRIGGER update_transactions_updated
AFTER
UPDATE ON transactions BEGIN
UPDATE transactions
SET updated = strftime('%Y-%m-%d %H:%M:%fZ')
WHERE id = NEW.id;
END;