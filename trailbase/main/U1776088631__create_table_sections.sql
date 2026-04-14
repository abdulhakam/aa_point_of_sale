DROP TABLE IF EXISTS "sections";
CREATE TABLE "sections" (
	"created" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')) CHECK (
		"created" IS strftime('%Y-%m-%d %H:%M:%fZ', "created")
	),
	"id" TEXT NOT NULL DEFAULT ('r' || lower(hex(randomblob(7)))),
	"name" TEXT NOT NULL DEFAULT '',
	"updated" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')) CHECK (
		"updated" IS strftime('%Y-%m-%d %H:%M:%fZ', "updated")
	),
	PRIMARY KEY("id")
) STRICT;