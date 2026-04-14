CREATE TABLE "invoices_return_reference" (
    'id' BLOB PRIMARY KEY CHECK (is_uuid_v7(id)) NOT NULL,
    'original_invoices' BLOB REFERENCES 'invoices'('id'),
    'created' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(created) IS NOT NULL),
    'updated' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(updated) IS NOT NULL),
    'created_by' BLOB REFERENCES 'users'('id'),
    'updated_by' BLOB REFERENCES 'users'('id')
) STRICT;
