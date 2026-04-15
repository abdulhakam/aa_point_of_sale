CREATE TABLE "pricing_rule_details" (
    'id' BLOB PRIMARY KEY CHECK (is_uuid_v7(id)) NOT NULL,
    'parent' BLOB NOT NULL REFERENCES 'sales_invoices'('id'),
    'referenceName' BLOB REFERENCES 'pricing_rules'('id'),
    'referenceItem' BLOB REFERENCES 'items'('id'),
    'created' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(created) IS NOT NULL),
    'updated' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(updated) IS NOT NULL)
) STRICT;