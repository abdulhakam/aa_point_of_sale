CREATE TABLE "journal_entries" (
    'id' BLOB PRIMARY KEY CHECK (is_uuid_v7(id)) NOT NULL,
    'name' TEXT NOT NULL DEFAULT '',
    'numberSeries' BLOB REFERENCES 'number_series'('id'),
    'entryType' TEXT NOT NULL DEFAULT '',
    'date' TEXT NOT NULL DEFAULT '',
    'referenceNumber' TEXT NOT NULL DEFAULT '',
    'referenceDate' TEXT NOT NULL DEFAULT '',
    'userRemark' TEXT NOT NULL DEFAULT '',
    'attachment' TEXT NOT NULL DEFAULT '',
    'created' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(created) IS NOT NULL),
    'updated' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(updated) IS NOT NULL)
) STRICT;