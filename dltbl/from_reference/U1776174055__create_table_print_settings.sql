CREATE TABLE "print_settings" (
    'id' BLOB PRIMARY KEY CHECK (is_uuid_v7(id)) NOT NULL,
    'logo' TEXT NOT NULL DEFAULT '',
    'companyName' TEXT NOT NULL DEFAULT '',
    'email' TEXT NOT NULL DEFAULT '',
    'phone' TEXT NOT NULL DEFAULT '',
    'address' BLOB REFERENCES 'addresses'('id'),
    'color' TEXT NOT NULL DEFAULT '',
    'font' TEXT NOT NULL DEFAULT '',
    'displayLogo' INTEGER NOT NULL DEFAULT 0,
    'amountInWords' INTEGER NOT NULL DEFAULT 0,
    'displayTime' INTEGER NOT NULL DEFAULT 0,
    'displayDescription' INTEGER NOT NULL DEFAULT 0,
    'displaytermsandconditions' INTEGER NOT NULL DEFAULT 0,
    'posPrintWidth' REAL NOT NULL DEFAULT 0,
    'termsAndConditions' TEXT NOT NULL DEFAULT '',
    'created' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(created) IS NOT NULL),
    'updated' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(updated) IS NOT NULL)
) STRICT;