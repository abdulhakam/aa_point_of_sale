DROP TABLE IF EXISTS "transactions";
CREATE TABLE "transactions" (
	"discount_1"	REAL NOT NULL DEFAULT 0,
	"discount_2"	REAL NOT NULL DEFAULT 0,
	"id"	TEXT NOT NULL DEFAULT ('r' || lower(hex(randomblob(7)))),
	"invoice"	TEXT NOT NULL DEFAULT '',
	"item"	TEXT NOT NULL DEFAULT '',
	"price"	REAL NOT NULL DEFAULT 0,
	"qty"	REAL NOT NULL DEFAULT 0,
	"scheme"	REAL NOT NULL DEFAULT 0,
	"updated"	TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
	"deleted"	INTEGER NOT NULL DEFAULT 0,
	"created"	TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
	"cost_price"	REAL NOT NULL DEFAULT 0,
	"discount_rs"	REAL NOT NULL DEFAULT 0,
	PRIMARY KEY("id")
) STRICT;