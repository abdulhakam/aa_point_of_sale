DROP TABLE IF EXISTS "payments";
CREATE TABLE "payments" (
	"amount"	REAL NOT NULL DEFAULT 0,
	"created"	TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
	"description"	TEXT NOT NULL DEFAULT '',
	"id"	TEXT NOT NULL DEFAULT ('r' || lower(hex(randomblob(7)))),
	"invoice"	TEXT NOT NULL DEFAULT '',
	"paid"	INTEGER NOT NULL DEFAULT 0,
	"party"	TEXT NOT NULL DEFAULT '',
	"type"	TEXT NOT NULL DEFAULT '',
	"updated"	TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
	"payment_date"	TEXT NOT NULL DEFAULT '',
	"paid_to"	TEXT NOT NULL DEFAULT '',
	PRIMARY KEY("id")
) STRICT;