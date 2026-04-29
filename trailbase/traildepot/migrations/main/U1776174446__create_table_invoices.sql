CREATE TABLE "invoices" (
    'id' BLOB PRIMARY KEY CHECK (is_uuid(id)) NOT NULL,
    'booker' BLOB REFERENCES 'order_bookers'('id'),
    'completed' INTEGER NOT NULL DEFAULT 0,
    'description' TEXT NOT NULL DEFAULT '',
    'discount_1' REAL NOT NULL DEFAULT 0,
    'discount_2' REAL NOT NULL DEFAULT 0,
    'duedate' TEXT NOT NULL DEFAULT '',
    'invoiceNo' REAL NOT NULL DEFAULT 0,
    'invoice_maker' BLOB REFERENCES 'users'('id'),
    'party' BLOB REFERENCES 'parties'('id'),
    'type' TEXT NOT NULL DEFAULT '',
    'dated' TEXT NOT NULL DEFAULT '',
    'discount_rs' REAL NOT NULL DEFAULT 0,
    'created' INTEGER NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    'updated' INTEGER NOT NULL DEFAULT (CURRENT_TIMESTAMP)
) STRICT;
