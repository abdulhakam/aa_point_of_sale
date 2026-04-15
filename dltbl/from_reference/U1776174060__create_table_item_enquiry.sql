CREATE TABLE "item_enquiry" (
    'id' BLOB PRIMARY KEY CHECK (is_uuid_v7(id)) NOT NULL,
    'name' TEXT NOT NULL DEFAULT '',
    'item' TEXT NOT NULL DEFAULT '',
    'customer' TEXT NOT NULL DEFAULT '',
    'contact' TEXT NOT NULL DEFAULT '',
    'description' TEXT NOT NULL DEFAULT '',
    'similarProduct' TEXT NOT NULL DEFAULT '',
    'created' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(created) IS NOT NULL),
    'updated' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(updated) IS NOT NULL)
) STRICT;