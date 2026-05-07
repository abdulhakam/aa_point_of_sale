CREATE TABLE "parties" (
    'id' BLOB PRIMARY KEY CHECK (is_uuid_v7(id)) NOT NULL,
    'image' TEXT NOT NULL DEFAULT '',
    'name' TEXT NOT NULL DEFAULT '',
    'role' TEXT NOT NULL DEFAULT '',
    'email' TEXT NOT NULL DEFAULT '',
    'phone' TEXT NOT NULL DEFAULT '',
    'address' BLOB REFERENCES 'addresses'('id'),
    'defaultAccount' BLOB REFERENCES 'accounts'('id'),
    'currency' BLOB REFERENCES 'currencies'('id'),
    'fromLead' BLOB REFERENCES 'leads'('id'),
    'loyaltyProgram' BLOB REFERENCES 'loyalty_programs'('id'),
    'loyaltyPoints' INTEGER NOT NULL DEFAULT 0,
    'taxId' TEXT NOT NULL DEFAULT '',
    'outstandingAmount' REAL NOT NULL DEFAULT 0,
    'created' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(created) IS NOT NULL),
    'updated' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(updated) IS NOT NULL)
) STRICT;