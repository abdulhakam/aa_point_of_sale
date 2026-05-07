CREATE TABLE "payments_enum_type" (
    'id' INTEGER PRIMARY KEY NOT NULL,
    'name' TEXT NOT NULL
) STRICT;

INSERT INTO "payments_enum_type" ('id', 'name') VALUES
    (1, 'return'),
    (2, 'receiving'),
    (3, 'sending');