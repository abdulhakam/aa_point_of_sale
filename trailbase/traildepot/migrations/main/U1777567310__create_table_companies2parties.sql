CREATE TABLE "companies2parties" (
    'id' BLOB PRIMARY KEY CHECK (is_uuid_v7(id)) DEFAULT (uuid_v7()) NOT NULL,
    'company' BLOB NOT NULL REFERENCES 'companies'('id'),
    'party' BLOB NOT NULL REFERENCES 'parties'('id'),
    'deleted' INTEGER NOT NULL
) STRICT;