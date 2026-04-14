CREATE TABLE "users" (
  'id' BLOB PRIMARY KEY REFERENCES '_user'('id') CHECK (is_uuid_v7(id)) NOT NULL,
  'username' TEXT NOT NULL
) STRICT;