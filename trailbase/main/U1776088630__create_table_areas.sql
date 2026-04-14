DROP TABLE IF EXISTS "areas";
CREATE TABLE "areas" (
	"id" TEXT NOT NULL DEFAULT ('r' || lower(hex(randomblob(7)))),
	"name" TEXT NOT NULL DEFAULT '',
	"section" TEXT NOT NULL DEFAULT '',
	"created" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
	"updated" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
	"deleted" INTEGER NOT NULL DEFAULT 0,
	PRIMARY KEY("id")
) STRICT;