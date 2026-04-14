DROP TABLE IF EXISTS "categories";
CREATE TABLE "categories" (
	"created"	TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
	"id"	TEXT NOT NULL DEFAULT ('r' || lower(hex(randomblob(7)))),
	"name"	TEXT NOT NULL DEFAULT '',
	"updated"	TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
	"deleted"	INTEGER NOT NULL DEFAULT 0,
	PRIMARY KEY("id")
) STRICT;