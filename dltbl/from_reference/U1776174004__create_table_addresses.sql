CREATE TABLE "addresses" (
    'id' BLOB PRIMARY KEY CHECK (is_uuid_v7(id)) NOT NULL,
    'name' TEXT NOT NULL DEFAULT '',
    'addressLine1' TEXT NOT NULL DEFAULT '',
    'addressLine2' TEXT NOT NULL DEFAULT '',
    'city' TEXT NOT NULL DEFAULT '',
    'country' TEXT NOT NULL DEFAULT '',
    'state' TEXT NOT NULL DEFAULT '',
    'postalCode' TEXT NOT NULL DEFAULT '',
    'emailAddress' TEXT NOT NULL DEFAULT '',
    'phone' TEXT NOT NULL DEFAULT '',
    'fax' TEXT NOT NULL DEFAULT '',
    'addressDisplay' TEXT NOT NULL DEFAULT '',
    'created' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(created) IS NOT NULL),
    'updated' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(updated) IS NOT NULL)
) STRICT;