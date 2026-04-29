CREATE TABLE "products" (
    'id' BLOB PRIMARY KEY CHECK (is_uuid(id)) NOT NULL,
    'category' BLOB NOT NULL REFERENCES 'categories'('id'),
    'company' BLOB NOT NULL REFERENCES 'companies'('id'),
    'cost_price' REAL NOT NULL DEFAULT 0,
    'name' TEXT NOT NULL DEFAULT '',
    'sale_price' REAL NOT NULL DEFAULT 0,
    'box_size_qty' REAL NOT NULL DEFAULT 0,
    'created' INTEGER NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    'updated' INTEGER NOT NULL DEFAULT (CURRENT_TIMESTAMP)
) STRICT;
