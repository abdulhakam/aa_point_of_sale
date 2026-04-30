CREATE TABLE "companies2parties" (
    'id' INTEGER PRIMARY KEY NOT NULL,
    'company' BLOB NOT NULL REFERENCES 'companies'('id'),
    'party' BLOB NOT NULL REFERENCES 'parties'('id')
) STRICT;