CREATE TABLE "transactions" (
    'id' BLOB PRIMARY KEY CHECK (is_uuid_v7(id)) NOT NULL,
    'discount_1' REAL NOT NULL DEFAULT 0,
    'discount_2' REAL NOT NULL DEFAULT 0,
    'invoice' BLOB REFERENCES 'invoices'('id'),
    'item' BLOB REFERENCES 'products'('id'),
    'price' REAL NOT NULL DEFAULT 0,
    'qty' REAL NOT NULL DEFAULT 0,
    'scheme' REAL NOT NULL DEFAULT 0,
    'cost_price' REAL NOT NULL DEFAULT 0,
    'discount_rs' REAL NOT NULL DEFAULT 0,
    'created' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(created) IS NOT NULL),
    'updated' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(updated) IS NOT NULL),
    'created_by' BLOB REFERENCES 'users'('id'),
    'updated_by' BLOB REFERENCES 'users'('id')
) STRICT;
