CREATE TABLE "invoices_enum_type" (
    'id' INTEGER PRIMARY KEY NOT NULL,
    'name' TEXT NOT NULL
) STRICT;

INSERT INTO "invoices_enum_type" ('id', 'name') VALUES
    (1, 'purchase'),
    (2, 'sale'),
    (3, 'return'),
    (4, 'difference');