CREATE TABLE "get_started" (
    'id' BLOB PRIMARY KEY CHECK (is_uuid_v7(id)) NOT NULL,
    'onboardingComplete' INTEGER NOT NULL DEFAULT 0,
    'companySetup' INTEGER NOT NULL DEFAULT 0,
    'systemSetup' INTEGER NOT NULL DEFAULT 0,
    'printSetup' INTEGER NOT NULL DEFAULT 0,
    'salesItemCreated' INTEGER NOT NULL DEFAULT 0,
    'purchaseItemCreated' INTEGER NOT NULL DEFAULT 0,
    'customerCreated' INTEGER NOT NULL DEFAULT 0,
    'supplierCreated' INTEGER NOT NULL DEFAULT 0,
    'invoiceCreated' INTEGER NOT NULL DEFAULT 0,
    'billCreated' INTEGER NOT NULL DEFAULT 0,
    'chartOfAccountsReviewed' INTEGER NOT NULL DEFAULT 0,
    'openingBalanceChecked' INTEGER NOT NULL DEFAULT 0,
    'taxesAdded' INTEGER NOT NULL DEFAULT 0,
    'created' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(created) IS NOT NULL),
    'updated' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(updated) IS NOT NULL)
) STRICT;