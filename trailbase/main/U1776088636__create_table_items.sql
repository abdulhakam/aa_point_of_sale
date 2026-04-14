DROP TABLE IF EXISTS "items";
CREATE TABLE "items" (
	"category"	TEXT NOT NULL DEFAULT '',
	"cost_price"	REAL NOT NULL DEFAULT 0,
	"created"	TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
	"id"	TEXT NOT NULL DEFAULT ('r' || lower(hex(randomblob(7)))),
	"name"	TEXT NOT NULL DEFAULT '',
	"sale_price"	REAL NOT NULL DEFAULT 0,
	"updated"	TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
	"box_size_qty"	REAL NOT NULL DEFAULT 0,
	PRIMARY KEY("id")
) STRICT;