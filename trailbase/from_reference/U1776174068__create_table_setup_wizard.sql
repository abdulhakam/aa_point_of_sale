CREATE TABLE "setup_wizard" (
    'id' BLOB PRIMARY KEY CHECK (is_uuid_v7(id)) NOT NULL,
    'logo' TEXT NOT NULL DEFAULT '',
    'companyName' TEXT NOT NULL DEFAULT '',
    'fullname' TEXT NOT NULL DEFAULT '',
    'email' TEXT NOT NULL DEFAULT '',
    'country' TEXT NOT NULL DEFAULT '',
    'currency' TEXT NOT NULL DEFAULT '',
    'bankName' TEXT NOT NULL DEFAULT '',
    'chartOfAccounts' TEXT NOT NULL DEFAULT '',
    'fiscalYearStart' TEXT NOT NULL DEFAULT '',
    'fiscalYearEnd' TEXT NOT NULL DEFAULT '',
    'completed' INTEGER NOT NULL DEFAULT 0,
    'created' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(created) IS NOT NULL),
    'updated' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(updated) IS NOT NULL)
) STRICT;