DROP TABLE IF EXISTS "expenses";
CREATE TABLE "expenses" (
	"amount"	REAL NOT NULL DEFAULT 0,
	"created"	TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
	"description"	TEXT NOT NULL DEFAULT '',
	"id"	TEXT NOT NULL DEFAULT ('r' || lower(hex(randomblob(7)))),
	"name"	TEXT NOT NULL DEFAULT '',
	"updated"	TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
	"date"	TEXT NOT NULL DEFAULT '',
	PRIMARY KEY("id")
) STRICT;