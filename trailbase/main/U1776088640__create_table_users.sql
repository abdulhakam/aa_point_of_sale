DROP TABLE IF EXISTS "users";
CREATE TABLE "users" (
	"avatar"	TEXT NOT NULL DEFAULT '',
	"created"	TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
	"email"	TEXT NOT NULL DEFAULT '',
	"emailVisibility"	INTEGER NOT NULL DEFAULT 0,
	"id"	TEXT NOT NULL DEFAULT ('r' || lower(hex(randomblob(7)))),
	"lastResetSentAt"	TEXT NOT NULL DEFAULT '',
	"lastVerificationSentAt"	TEXT NOT NULL DEFAULT '',
	"name"	TEXT NOT NULL DEFAULT '',
	"passwordHash"	TEXT NOT NULL,
	"tokenKey"	TEXT NOT NULL,
	"updated"	TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
	"username"	TEXT NOT NULL,
	"verified"	INTEGER NOT NULL DEFAULT 0,
	PRIMARY KEY("id")
) STRICT;