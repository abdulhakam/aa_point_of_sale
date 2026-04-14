DROP TABLE IF EXISTS "invoices_return_reference";
CREATE TABLE "invoices_return_reference" (
	"created"	TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
	"id"	TEXT NOT NULL DEFAULT ('r' || lower(hex(randomblob(7)))),
	"updated"	TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
	"original_invoices"	TEXT NOT NULL DEFAULT '',
	PRIMARY KEY("id")
) STRICT;