CREATE TABLE "areas" (
    'id' INTEGER PRIMARY KEY NOT NULL,
    'name' TEXT NOT NULL,
    'section' INTEGER NOT NULL REFERENCES 'sections'('id'),
    'created' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(created) IS NOT NULL)
) STRICT;