CREATE TABLE "parties_enum_type" (
    'id' INTEGER PRIMARY KEY NOT NULL,
    'name' TEXT NOT NULL
) STRICT;

INSERT INTO "parties_enum_type" ('id', 'name') VALUES
    (1, 'customer'),
    (2, 'supplier');