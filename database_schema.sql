BEGIN TRANSACTION;
DROP TABLE IF EXISTS "users";
CREATE TABLE "users" (
	"avatar"	TEXT NOT NULL DEFAULT '',
	"created"	TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
	"email"	TEXT NOT NULL DEFAULT '',
	"emailVisibility"	BOOLEAN NOT NULL DEFAULT FALSE,
	"id"	TEXT NOT NULL DEFAULT ('r' || lower(hex(randomblob(7)))),
	"lastResetSentAt"	TEXT NOT NULL DEFAULT '',
	"lastVerificationSentAt"	TEXT NOT NULL DEFAULT '',
	"name"	TEXT NOT NULL DEFAULT '',
	"passwordHash"	TEXT NOT NULL,
	"tokenKey"	TEXT NOT NULL,
	"updated"	TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
	"username"	TEXT NOT NULL,
	"verified"	BOOLEAN NOT NULL DEFAULT FALSE,
	PRIMARY KEY("id")
);
DROP TABLE IF EXISTS "sections";
CREATE TABLE "sections" (
	"created"	TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
	"id"	TEXT NOT NULL DEFAULT ('r' || lower(hex(randomblob(7)))),
	"name"	TEXT NOT NULL DEFAULT '',
	"updated"	TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
	PRIMARY KEY("id")
);
DROP TABLE IF EXISTS "areas";
CREATE TABLE "areas" (
	"created"	TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
	"id"	TEXT NOT NULL DEFAULT ('r' || lower(hex(randomblob(7)))),
	"name"	TEXT NOT NULL DEFAULT '',
	"section"	TEXT NOT NULL DEFAULT '',
	"updated"	TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
	"deleted"	BOOLEAN NOT NULL DEFAULT FALSE,
	PRIMARY KEY("id")
);
DROP TABLE IF EXISTS "categories";
CREATE TABLE "categories" (
	"created"	TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
	"id"	TEXT NOT NULL DEFAULT ('r' || lower(hex(randomblob(7)))),
	"name"	TEXT NOT NULL DEFAULT '',
	"updated"	TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
	"deleted"	BOOLEAN NOT NULL DEFAULT FALSE,
	PRIMARY KEY("id")
);
DROP TABLE IF EXISTS "expenses";
CREATE TABLE "expenses" (
	"amount"	NUMERIC NOT NULL DEFAULT 0,
	"created"	TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
	"description"	TEXT NOT NULL DEFAULT '',
	"id"	TEXT NOT NULL DEFAULT ('r' || lower(hex(randomblob(7)))),
	"name"	TEXT NOT NULL DEFAULT '',
	"updated"	TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
	"date"	TEXT NOT NULL DEFAULT '',
	PRIMARY KEY("id")
);
DROP TABLE IF EXISTS "order_bookers";
CREATE TABLE "order_bookers" (
	"company"	JSON NOT NULL DEFAULT '[]',
	"created"	TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
	"id"	TEXT NOT NULL DEFAULT ('r' || lower(hex(randomblob(7)))),
	"name"	TEXT NOT NULL DEFAULT '',
	"phone"	TEXT NOT NULL DEFAULT '',
	"updated"	TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
	"deleted"	BOOLEAN NOT NULL DEFAULT FALSE,
	PRIMARY KEY("id")
);
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
	"deleted"	BOOLEAN NOT NULL DEFAULT FALSE,
	"company"	JSON NOT NULL DEFAULT '[]',
	PRIMARY KEY("id")
);
DROP TABLE IF EXISTS "items";
CREATE TABLE "items" (
	"category"	TEXT NOT NULL DEFAULT '',
	"cost_price"	NUMERIC NOT NULL DEFAULT 0,
	"created"	TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
	"id"	TEXT NOT NULL DEFAULT ('r' || lower(hex(randomblob(7)))),
	"name"	TEXT NOT NULL DEFAULT '',
	"sale_price"	NUMERIC NOT NULL DEFAULT 0,
	"updated"	TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
	"box_size_qty"	NUMERIC NOT NULL DEFAULT 0,
	PRIMARY KEY("id")
);
DROP TABLE IF EXISTS "invoices";
CREATE TABLE "invoices" (
	"booker"	TEXT NOT NULL DEFAULT '',
	"completed"	BOOLEAN NOT NULL DEFAULT FALSE,
	"created"	TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
	"description"	TEXT NOT NULL DEFAULT '',
	"discount_1"	NUMERIC NOT NULL DEFAULT 0,
	"discount_2"	NUMERIC NOT NULL DEFAULT 0,
	"duedate"	TEXT NOT NULL DEFAULT '',
	"id"	TEXT NOT NULL DEFAULT ('r' || lower(hex(randomblob(7)))),
	"invoiceNo"	NUMERIC NOT NULL DEFAULT 0,
	"invoice_maker"	TEXT NOT NULL DEFAULT '',
	"party"	TEXT NOT NULL DEFAULT '',
	"type"	TEXT NOT NULL DEFAULT '',
	"updated"	TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
	"deleted"	BOOLEAN NOT NULL DEFAULT FALSE,
	"dated"	TEXT NOT NULL DEFAULT '',
	"discount_rs"	NUMERIC NOT NULL DEFAULT 0,
	PRIMARY KEY("id")
);
DROP TABLE IF EXISTS "invoices_return_reference";
CREATE TABLE "invoices_return_reference" (
	"created"	TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
	"id"	TEXT NOT NULL DEFAULT ('r' || lower(hex(randomblob(7)))),
	"updated"	TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
	"original_invoices"	TEXT NOT NULL DEFAULT '',
	PRIMARY KEY("id")
);

DROP TABLE IF EXISTS "payments";
CREATE TABLE "payments" (
	"amount"	NUMERIC NOT NULL DEFAULT 0,
	"created"	TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
	"description"	TEXT NOT NULL DEFAULT '',
	"id"	TEXT NOT NULL DEFAULT ('r' || lower(hex(randomblob(7)))),
	"invoice"	TEXT NOT NULL DEFAULT '',
	"paid"	BOOLEAN NOT NULL DEFAULT FALSE,
	"party"	TEXT NOT NULL DEFAULT '',
	"type"	TEXT NOT NULL DEFAULT '',
	"updated"	TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
	"payment_date"	TEXT NOT NULL DEFAULT '',
	"paid_to"	TEXT NOT NULL DEFAULT '',
	PRIMARY KEY("id")
);

DROP TABLE IF EXISTS "transactions";
CREATE TABLE "transactions" (
	"discount_1"	NUMERIC NOT NULL DEFAULT 0,
	"discount_2"	NUMERIC NOT NULL DEFAULT 0,
	"id"	TEXT NOT NULL DEFAULT ('r' || lower(hex(randomblob(7)))),
	"invoice"	TEXT NOT NULL DEFAULT '',
	"item"	TEXT NOT NULL DEFAULT '',
	"price"	NUMERIC NOT NULL DEFAULT 0,
	"qty"	NUMERIC NOT NULL DEFAULT 0,
	"scheme"	NUMERIC NOT NULL DEFAULT 0,
	"updated"	TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
	"deleted"	BOOLEAN NOT NULL DEFAULT FALSE,
	"created"	text NOT NULL DEFAULT 'strftime(''%Y-%m-%d %H:%M:%fZ'')',
	"cost_price"	NUMERIC NOT NULL DEFAULT 0,
	"discount_rs"	NUMERIC NOT NULL DEFAULT 0,
	PRIMARY KEY("id")
);
COMMIT;
