DROP TABLE IF EXISTS "parties";
CREATE TABLE "parties" (
	"address"	TEXT NOT NULL DEFAULT '',
	"area"	TEXT NOT NULL DEFAULT '',
	"created"	TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
	"id"	TEXT NOT NULL DEFAULT ('r' || lower(hex(randomblob(7)))),
	"name"	TEXT NOT NULL DEFAULT '',
	"phone"	TEXT NOT NULL DEFAULT '',
	"type"	TEXT NOT NULL DEFAULT '',
	"updated"	TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
	"deleted"	INTEGER NOT NULL DEFAULT 0,
	"company"	JSON NOT NULL DEFAULT '[]',
	PRIMARY KEY("id")
) STRICT;