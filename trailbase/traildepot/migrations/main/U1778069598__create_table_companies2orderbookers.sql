CREATE TABLE "companies2orderbookers" (
    'id' BLOB PRIMARY KEY CHECK (is_uuid_v7(id)) DEFAULT (uuid_v7()) NOT NULL,
    'order_booker' BLOB NOT NULL REFERENCES 'order_bookers'('id'),
    'company' BLOB NOT NULL REFERENCES 'companies'('id')
) STRICT;