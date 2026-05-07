CREATE TABLE "invoices_return_reference" (
    'id' BLOB PRIMARY KEY CHECK (is_uuid_v7(id)) DEFAULT (uuid_v7()) NOT NULL,
    'original_invoices' BLOB REFERENCES 'invoices'('id'),
    'created' INTEGER NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    'updated' INTEGER NOT NULL DEFAULT (CURRENT_TIMESTAMP)
) STRICT;
