CREATE TABLE "loyalty_point_entries" (
    'id' BLOB PRIMARY KEY CHECK (is_uuid_v7(id)) NOT NULL,
    'name' TEXT NOT NULL DEFAULT '',
    'loyaltyProgram' TEXT NOT NULL DEFAULT '',
    'loyaltyProgramTier' TEXT NOT NULL DEFAULT '',
    'customer' BLOB REFERENCES 'parties'('id'),
    'invoice' BLOB REFERENCES 'sales_invoices'('id'),
    'loyaltyPoints' INTEGER NOT NULL DEFAULT 0,
    'purchaseAmount' REAL NOT NULL DEFAULT 0,
    'expiryDate' TEXT NOT NULL DEFAULT '',
    'postingDate' TEXT NOT NULL DEFAULT '',
    'created' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(created) IS NOT NULL),
    'updated' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(updated) IS NOT NULL)
) STRICT;