DROP TABLE IF EXISTS "invoices";
CREATE TABLE "invoices" (
	"booker" TEXT NOT NULL DEFAULT '',
	"completed" INTEGER NOT NULL DEFAULT 0,
	"created" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
	"description" TEXT NOT NULL DEFAULT '',
	"discount_1" REAL NOT NULL DEFAULT 0,
	"discount_2" REAL NOT NULL DEFAULT 0,
	"duedate" TEXT NOT NULL DEFAULT '',
	"id" TEXT NOT NULL DEFAULT ('r' || lower(hex(randomblob(7)))),
	"invoiceNo" REAL NOT NULL DEFAULT 0,
	"invoice_maker" TEXT NOT NULL DEFAULT '',
	"party" TEXT NOT NULL DEFAULT '',
	"type" TEXT NOT NULL DEFAULT '',
	"updated" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
	"deleted" INTEGER NOT NULL DEFAULT 0,
	"dated" TEXT NOT NULL DEFAULT '',
	"discount_rs" REAL NOT NULL DEFAULT 0,
	PRIMARY KEY("id")
) STRICT;