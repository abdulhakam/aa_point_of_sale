CREATE TABLE "products" (
    'id' BLOB PRIMARY KEY CHECK (is_uuid(id)) NOT NULL,
    'category' BLOB NOT NULL REFERENCES 'categories'('id'),
    'company' BLOB NOT NULL REFERENCES 'companies'('id'),
    'cost_price' REAL NOT NULL DEFAULT 0,
    'name' TEXT NOT NULL DEFAULT '',
    'sale_price' REAL NOT NULL DEFAULT 0,
    'box_size_qty' REAL NOT NULL DEFAULT 0,
    'created' INTEGER NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
    'updated' INTEGER NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ'))
) STRICT;
CREATE TRIGGER update_products_updated
AFTER
UPDATE ON products BEGIN
UPDATE products
SET updated = strftime('%Y-%m-%d %H:%M:%fZ')
WHERE id = NEW.id;
END;