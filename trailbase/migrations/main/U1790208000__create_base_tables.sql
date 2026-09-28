-- AA Point of Sale — TrailBase base schema.
--
-- Conventions, all of them required or recommended by TrailBase:
--   * STRICT tables. TrailBase refuses to expose non-STRICT tables.
--   * UUIDv7 BLOB primary keys for business records, generated server-side by
--     uuid_v7() and validated by is_uuid_v7(). Time-sortable, so cursor
--     pagination and index locality come for free.
--   * Enumerations are INTEGER codes backed by a lookup table with a FOREIGN
--     KEY — never TEXT, never JSON. The lookup table is the single source of
--     truth for "0 = purchase, 1 = sale, ..." and is itself exposed as a
--     read-only record API, so clients render labels from the database instead
--     of hardcoding a map. See README (Enumerations).
--   * No JSON columns and no VIEWs anywhere. Multi-valued PocketBase relations
--     became link tables; report aggregation is done by the client.
--   * created/updated are TEXT in PocketBase's '%Y-%m-%d %H:%M:%fZ' format so
--     rows exported from the old backend stay lexicographically comparable with
--     freshly written ones. `updated` is maintained by an AFTER UPDATE trigger
--     per table (SQLite has no ON UPDATE).
--   * deleted/paid/completed are 0/1 INTEGER flags. SQLite STRICT has no
--     boolean type, and TrailBase reports INTEGER columns as JSON integers.
--   * Empty-string sentinels ('') for the optional date columns are kept from
--     PocketBase, because the frontend tests `= ''`.
--   * Foreign keys are enforced (TrailBase sets `PRAGMA foreign_keys=ON`):
--       - nullable master-data references use ON DELETE SET NULL, so the child
--         survives and the link is cleared;
--       - ledger rows (transactions) use NO ACTION, so an invoice or item that
--         already has history cannot be deleted out from under it;
--       - link tables cascade, because a link without an endpoint is garbage.

-- ---------------------------------------------------------------------------
-- Enumeration vocabularies
-- ---------------------------------------------------------------------------
-- Codes are 0-based and stable: they are written into rows and read back by the
-- frontend, so they must never be renumbered. NOTE: 0 is a real value here, so
-- clients must test for null explicitly instead of relying on truthiness.

CREATE TABLE "party_types" (
  "id"          INTEGER PRIMARY KEY NOT NULL,
  "name"        TEXT NOT NULL UNIQUE,
  "description" TEXT NOT NULL DEFAULT '',
  "created"     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ','now')) CHECK (datetime("created") IS NOT NULL),
  "updated"     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ','now')) CHECK (datetime("updated") IS NOT NULL)
) STRICT;

INSERT INTO "party_types" ("id", "name", "description") VALUES
  (0, 'customer', 'Buys from us'),
  (1, 'supplier', 'Sells to us');

CREATE TABLE "invoice_types" (
  "id"          INTEGER PRIMARY KEY NOT NULL,
  "name"        TEXT NOT NULL UNIQUE,
  "description" TEXT NOT NULL DEFAULT '',
  "created"     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ','now')) CHECK (datetime("created") IS NOT NULL),
  "updated"     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ','now')) CHECK (datetime("updated") IS NOT NULL)
) STRICT;

INSERT INTO "invoice_types" ("id", "name", "description") VALUES
  (0, 'purchase',   'Goods bought into stock'),
  (1, 'sale',       'Goods sold to a customer'),
  (2, 'return',     'Goods returned'),
  (3, 'difference', 'Stock adjustment / write-off');

CREATE TABLE "payment_types" (
  "id"          INTEGER PRIMARY KEY NOT NULL,
  "name"        TEXT NOT NULL UNIQUE,
  "description" TEXT NOT NULL DEFAULT '',
  "created"     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ','now')) CHECK (datetime("created") IS NOT NULL),
  "updated"     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ','now')) CHECK (datetime("updated") IS NOT NULL)
) STRICT;

-- 'recieving' is spelled the way PocketBase spelled it; the frontend, the old
-- views and the ledger logic all used that spelling.
INSERT INTO "payment_types" ("id", "name", "description") VALUES
  (0, 'sending',   'Money paid out'),
  (1, 'recieving', 'Money taken in'),
  (2, 'return',    'Money returned');

-- ---------------------------------------------------------------------------
-- Master data
-- ---------------------------------------------------------------------------

CREATE TABLE "sections" (
  "id"      BLOB PRIMARY KEY NOT NULL CHECK (is_uuid_v7("id")) DEFAULT (uuid_v7()),
  "name"    TEXT NOT NULL DEFAULT '',
  "created" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ','now')) CHECK (datetime("created") IS NOT NULL),
  "updated" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ','now')) CHECK (datetime("updated") IS NOT NULL)
) STRICT;

CREATE TABLE "categories" (
  "id"      BLOB PRIMARY KEY NOT NULL CHECK (is_uuid_v7("id")) DEFAULT (uuid_v7()),
  "name"    TEXT NOT NULL DEFAULT '',
  "deleted" INTEGER NOT NULL DEFAULT 0 CHECK ("deleted" IN (0, 1)),
  "created" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ','now')) CHECK (datetime("created") IS NOT NULL),
  "updated" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ','now')) CHECK (datetime("updated") IS NOT NULL)
) STRICT;

CREATE TABLE "companies" (
  "id"      BLOB PRIMARY KEY NOT NULL CHECK (is_uuid_v7("id")) DEFAULT (uuid_v7()),
  "name"    TEXT NOT NULL DEFAULT '',
  "deleted" INTEGER NOT NULL DEFAULT 0 CHECK ("deleted" IN (0, 1)),
  "created" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ','now')) CHECK (datetime("created") IS NOT NULL),
  "updated" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ','now')) CHECK (datetime("updated") IS NOT NULL)
) STRICT;

CREATE TABLE "areas" (
  "id"      BLOB PRIMARY KEY NOT NULL CHECK (is_uuid_v7("id")) DEFAULT (uuid_v7()),
  "name"    TEXT NOT NULL DEFAULT '',
  "section" BLOB REFERENCES "sections"("id") ON DELETE SET NULL,
  "deleted" INTEGER NOT NULL DEFAULT 0 CHECK ("deleted" IN (0, 1)),
  "created" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ','now')) CHECK (datetime("created") IS NOT NULL),
  "updated" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ','now')) CHECK (datetime("updated") IS NOT NULL)
) STRICT;

-- Customers and suppliers. `type` is NULL when it has not been set (PocketBase
-- used '' for that); every non-NULL value is a valid party_types code.
CREATE TABLE "parties" (
  "id"      BLOB PRIMARY KEY NOT NULL CHECK (is_uuid_v7("id")) DEFAULT (uuid_v7()),
  "name"    TEXT NOT NULL DEFAULT '',
  "type"    INTEGER REFERENCES "party_types"("id"),
  "phone"   TEXT NOT NULL DEFAULT '',
  "address" TEXT NOT NULL DEFAULT '',
  "area"    BLOB REFERENCES "areas"("id") ON DELETE SET NULL,
  "deleted" INTEGER NOT NULL DEFAULT 0 CHECK ("deleted" IN (0, 1)),
  "created" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ','now')) CHECK (datetime("created") IS NOT NULL),
  "updated" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ','now')) CHECK (datetime("updated") IS NOT NULL)
) STRICT;

CREATE TABLE "order_bookers" (
  "id"      BLOB PRIMARY KEY NOT NULL CHECK (is_uuid_v7("id")) DEFAULT (uuid_v7()),
  "name"    TEXT NOT NULL DEFAULT '',
  "phone"   TEXT NOT NULL DEFAULT '',
  "deleted" INTEGER NOT NULL DEFAULT 0 CHECK ("deleted" IN (0, 1)),
  "created" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ','now')) CHECK (datetime("created") IS NOT NULL),
  "updated" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ','now')) CHECK (datetime("updated") IS NOT NULL)
) STRICT;

CREATE TABLE "items" (
  "id"           BLOB PRIMARY KEY NOT NULL CHECK (is_uuid_v7("id")) DEFAULT (uuid_v7()),
  "name"         TEXT NOT NULL DEFAULT '',
  "category"     BLOB REFERENCES "categories"("id") ON DELETE SET NULL,
  "barcode"      TEXT NOT NULL DEFAULT '',
  "display_id"   TEXT NOT NULL DEFAULT '',
  "cost_price"   REAL NOT NULL DEFAULT 0,
  "sale_price"   REAL NOT NULL DEFAULT 0,
  "box_size_qty" REAL NOT NULL DEFAULT 0,
  "created"      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ','now')) CHECK (datetime("created") IS NOT NULL),
  "updated"      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ','now')) CHECK (datetime("updated") IS NOT NULL)
) STRICT;

CREATE TABLE "expenses" (
  "id"          BLOB PRIMARY KEY NOT NULL CHECK (is_uuid_v7("id")) DEFAULT (uuid_v7()),
  "name"        TEXT NOT NULL DEFAULT '',
  "description" TEXT NOT NULL DEFAULT '',
  "amount"      REAL NOT NULL DEFAULT 0,
  "date"        TEXT NOT NULL DEFAULT '' CHECK ("date" = '' OR datetime("date") IS NOT NULL),
  "created"     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ','now')) CHECK (datetime("created") IS NOT NULL),
  "updated"     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ','now')) CHECK (datetime("updated") IS NOT NULL)
) STRICT;

-- ---------------------------------------------------------------------------
-- Link tables
-- ---------------------------------------------------------------------------
-- PocketBase modelled `parties.company` and `order_bookers.company` as
-- multi-valued relations, and the old scaffold stored them as JSON arrays. JSON
-- cannot be indexed or filtered by membership through the record API, so the
-- relation is a real row here.
--
-- Each link gets a UUIDv7 surrogate key: a composite PRIMARY KEY would be
-- marginally smaller, but TrailBase can only expose a table whose primary key is
-- a single INTEGER or UUID column, and the clients need to create and delete
-- these links through the API. The UNIQUE constraint below is what actually
-- prevents duplicates, and it doubles as the party -> company lookup index.

CREATE TABLE "party_companies" (
  "id"      BLOB PRIMARY KEY NOT NULL CHECK (is_uuid_v7("id")) DEFAULT (uuid_v7()),
  "party"   BLOB NOT NULL REFERENCES "parties"("id") ON DELETE CASCADE,
  "company" BLOB NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "created" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ','now')) CHECK (datetime("created") IS NOT NULL),
  "updated" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ','now')) CHECK (datetime("updated") IS NOT NULL),
  UNIQUE ("party", "company")
) STRICT;

CREATE TABLE "order_booker_companies" (
  "id"          BLOB PRIMARY KEY NOT NULL CHECK (is_uuid_v7("id")) DEFAULT (uuid_v7()),
  "order_booker" BLOB NOT NULL REFERENCES "order_bookers"("id") ON DELETE CASCADE,
  "company"     BLOB NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "created"     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ','now')) CHECK (datetime("created") IS NOT NULL),
  "updated"     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ','now')) CHECK (datetime("updated") IS NOT NULL),
  UNIQUE ("order_booker", "company")
) STRICT;

-- ---------------------------------------------------------------------------
-- Transactions
-- ---------------------------------------------------------------------------

CREATE TABLE "invoices" (
  "id"            BLOB PRIMARY KEY NOT NULL CHECK (is_uuid_v7("id")) DEFAULT (uuid_v7()),
  "type"          INTEGER REFERENCES "invoice_types"("id"),
  "invoiceNo"     REAL NOT NULL DEFAULT 0,
  "party"         BLOB REFERENCES "parties"("id") ON DELETE SET NULL,
  "booker"        BLOB REFERENCES "order_bookers"("id") ON DELETE SET NULL,
  "invoice_maker" BLOB REFERENCES "_user"("id") ON DELETE SET NULL,
  "dated"         TEXT NOT NULL DEFAULT '' CHECK ("dated" = '' OR datetime("dated") IS NOT NULL),
  "duedate"       TEXT NOT NULL DEFAULT '' CHECK ("duedate" = '' OR datetime("duedate") IS NOT NULL),
  "description"   TEXT NOT NULL DEFAULT '',
  "discount_1"    REAL NOT NULL DEFAULT 0,
  "discount_2"    REAL NOT NULL DEFAULT 0,
  "discount_rs"   REAL NOT NULL DEFAULT 0,
  "completed"     INTEGER NOT NULL DEFAULT 0 CHECK ("completed" IN (0, 1)),
  "deleted"       INTEGER NOT NULL DEFAULT 0 CHECK ("deleted" IN (0, 1)),
  "created"       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ','now')) CHECK (datetime("created") IS NOT NULL),
  "updated"       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ','now')) CHECK (datetime("updated") IS NOT NULL)
) STRICT;

CREATE TABLE "invoices_return_reference" (
  "id"                BLOB PRIMARY KEY NOT NULL CHECK (is_uuid_v7("id")) DEFAULT (uuid_v7()),
  "original_invoices" BLOB REFERENCES "invoices"("id") ON DELETE SET NULL,
  "created"           TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ','now')) CHECK (datetime("created") IS NOT NULL),
  "updated"           TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ','now')) CHECK (datetime("updated") IS NOT NULL)
) STRICT;

CREATE TABLE "transactions" (
  "id"          BLOB PRIMARY KEY NOT NULL CHECK (is_uuid_v7("id")) DEFAULT (uuid_v7()),
  "invoice"     BLOB NOT NULL REFERENCES "invoices"("id"),
  "item"        BLOB NOT NULL REFERENCES "items"("id"),
  "cost_price"  REAL NOT NULL DEFAULT 0,
  "price"       REAL NOT NULL DEFAULT 0,
  "qty"         REAL NOT NULL DEFAULT 0,
  "scheme"      REAL NOT NULL DEFAULT 0,
  "discount_1"  REAL NOT NULL DEFAULT 0,
  "discount_2"  REAL NOT NULL DEFAULT 0,
  "discount_rs" REAL NOT NULL DEFAULT 0,
  "deleted"     INTEGER NOT NULL DEFAULT 0 CHECK ("deleted" IN (0, 1)),
  "created"     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ','now')) CHECK (datetime("created") IS NOT NULL),
  "updated"     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ','now')) CHECK (datetime("updated") IS NOT NULL)
) STRICT;

CREATE TABLE "payments" (
  "id"           BLOB PRIMARY KEY NOT NULL CHECK (is_uuid_v7("id")) DEFAULT (uuid_v7()),
  "invoice"      BLOB REFERENCES "invoices"("id") ON DELETE SET NULL,
  "party"        BLOB REFERENCES "parties"("id") ON DELETE SET NULL,
  "paid_to"      BLOB REFERENCES "order_bookers"("id") ON DELETE SET NULL,
  "type"         INTEGER REFERENCES "payment_types"("id"),
  "amount"       REAL NOT NULL DEFAULT 0,
  "paid"         INTEGER NOT NULL DEFAULT 0 CHECK ("paid" IN (0, 1)),
  "payment_date" TEXT NOT NULL DEFAULT '' CHECK ("payment_date" = '' OR datetime("payment_date") IS NOT NULL),
  "description"  TEXT NOT NULL DEFAULT '',
  "created"      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ','now')) CHECK (datetime("created") IS NOT NULL),
  "updated"      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ','now')) CHECK (datetime("updated") IS NOT NULL)
) STRICT;

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
-- These cover the access paths the frontend actually takes: invoice detail
-- (transactions by invoice), item stock/profit reports (transactions by item),
-- invoice and payment lists (party/booker/type/date), the item picker
-- (barcode/display_id) and the link tables (the UNIQUE constraints above already
-- index party -> company; these add the reverse direction).

CREATE INDEX "idx_transactions_invoice" ON "transactions" ("invoice");
CREATE INDEX "idx_transactions_item" ON "transactions" ("item");

CREATE INDEX "idx_invoices_party" ON "invoices" ("party");
CREATE INDEX "idx_invoices_booker" ON "invoices" ("booker");
CREATE INDEX "idx_invoices_type" ON "invoices" ("type");
CREATE INDEX "idx_invoices_dated" ON "invoices" ("dated");
CREATE INDEX "idx_invoices_created" ON "invoices" ("created");
CREATE INDEX "idx_invoices_type_created" ON "invoices" ("type", "created");
CREATE INDEX "idx_invoices_invoice_maker" ON "invoices" ("invoice_maker");
CREATE INDEX "idx_invoices_return_reference" ON "invoices_return_reference" ("original_invoices");

CREATE INDEX "idx_payments_party" ON "payments" ("party");
CREATE INDEX "idx_payments_paid" ON "payments" ("paid");
CREATE INDEX "idx_payments_type" ON "payments" ("type");
CREATE INDEX "idx_payments_invoice" ON "payments" ("invoice");
CREATE INDEX "idx_payments_created" ON "payments" ("created");
CREATE INDEX "idx_payments_type_paid" ON "payments" ("type", "paid");
CREATE INDEX "idx_payments_party_paid_type" ON "payments" ("party", "paid", "type");
CREATE INDEX "idx_payments_payment_date" ON "payments" ("payment_date");

CREATE INDEX "idx_parties_area" ON "parties" ("area");
CREATE INDEX "idx_parties_type" ON "parties" ("type");
CREATE INDEX "idx_areas_section" ON "areas" ("section");
CREATE INDEX "idx_items_category" ON "items" ("category");
CREATE INDEX "idx_expenses_date" ON "expenses" ("date");

CREATE INDEX "idx_party_companies_company" ON "party_companies" ("company");
CREATE INDEX "idx_order_booker_companies_company" ON "order_booker_companies" ("company");

-- Product identifiers: the scanner looks up barcode, staff look up display_id.
CREATE INDEX "idx_items_display_id" ON "items" ("display_id");
-- Partial unique index: enforces the real-world barcode invariant while still
-- allowing any number of items without a barcode ('').
CREATE UNIQUE INDEX "idx_items_barcode_unique" ON "items" ("barcode") WHERE "barcode" != '';

-- ---------------------------------------------------------------------------
-- `updated` maintenance
-- ---------------------------------------------------------------------------
-- PocketBase bumped `updated` on every write. SQLite has no ON UPDATE, so the
-- equivalent is an AFTER UPDATE trigger per table, as in TrailBase's own
-- examples. Safe without recursion because SQLite's `recursive_triggers`
-- default (off) is not changed by TrailBase.

CREATE TRIGGER "trg_party_types__updated" AFTER UPDATE ON "party_types" FOR EACH ROW
  BEGIN UPDATE "party_types" SET "updated" = strftime('%Y-%m-%d %H:%M:%fZ','now') WHERE "id" = OLD."id"; END;
CREATE TRIGGER "trg_invoice_types__updated" AFTER UPDATE ON "invoice_types" FOR EACH ROW
  BEGIN UPDATE "invoice_types" SET "updated" = strftime('%Y-%m-%d %H:%M:%fZ','now') WHERE "id" = OLD."id"; END;
CREATE TRIGGER "trg_payment_types__updated" AFTER UPDATE ON "payment_types" FOR EACH ROW
  BEGIN UPDATE "payment_types" SET "updated" = strftime('%Y-%m-%d %H:%M:%fZ','now') WHERE "id" = OLD."id"; END;
CREATE TRIGGER "trg_sections__updated" AFTER UPDATE ON "sections" FOR EACH ROW
  BEGIN UPDATE "sections" SET "updated" = strftime('%Y-%m-%d %H:%M:%fZ','now') WHERE "id" = OLD."id"; END;
CREATE TRIGGER "trg_categories__updated" AFTER UPDATE ON "categories" FOR EACH ROW
  BEGIN UPDATE "categories" SET "updated" = strftime('%Y-%m-%d %H:%M:%fZ','now') WHERE "id" = OLD."id"; END;
CREATE TRIGGER "trg_companies__updated" AFTER UPDATE ON "companies" FOR EACH ROW
  BEGIN UPDATE "companies" SET "updated" = strftime('%Y-%m-%d %H:%M:%fZ','now') WHERE "id" = OLD."id"; END;
CREATE TRIGGER "trg_areas__updated" AFTER UPDATE ON "areas" FOR EACH ROW
  BEGIN UPDATE "areas" SET "updated" = strftime('%Y-%m-%d %H:%M:%fZ','now') WHERE "id" = OLD."id"; END;
CREATE TRIGGER "trg_parties__updated" AFTER UPDATE ON "parties" FOR EACH ROW
  BEGIN UPDATE "parties" SET "updated" = strftime('%Y-%m-%d %H:%M:%fZ','now') WHERE "id" = OLD."id"; END;
CREATE TRIGGER "trg_order_bookers__updated" AFTER UPDATE ON "order_bookers" FOR EACH ROW
  BEGIN UPDATE "order_bookers" SET "updated" = strftime('%Y-%m-%d %H:%M:%fZ','now') WHERE "id" = OLD."id"; END;
CREATE TRIGGER "trg_items__updated" AFTER UPDATE ON "items" FOR EACH ROW
  BEGIN UPDATE "items" SET "updated" = strftime('%Y-%m-%d %H:%M:%fZ','now') WHERE "id" = OLD."id"; END;
CREATE TRIGGER "trg_expenses__updated" AFTER UPDATE ON "expenses" FOR EACH ROW
  BEGIN UPDATE "expenses" SET "updated" = strftime('%Y-%m-%d %H:%M:%fZ','now') WHERE "id" = OLD."id"; END;
CREATE TRIGGER "trg_party_companies__updated" AFTER UPDATE ON "party_companies" FOR EACH ROW
  BEGIN UPDATE "party_companies" SET "updated" = strftime('%Y-%m-%d %H:%M:%fZ','now') WHERE "id" = OLD."id"; END;
CREATE TRIGGER "trg_order_booker_companies__updated" AFTER UPDATE ON "order_booker_companies" FOR EACH ROW
  BEGIN UPDATE "order_booker_companies" SET "updated" = strftime('%Y-%m-%d %H:%M:%fZ','now') WHERE "id" = OLD."id"; END;
CREATE TRIGGER "trg_invoices__updated" AFTER UPDATE ON "invoices" FOR EACH ROW
  BEGIN UPDATE "invoices" SET "updated" = strftime('%Y-%m-%d %H:%M:%fZ','now') WHERE "id" = OLD."id"; END;
CREATE TRIGGER "trg_invoices_return_reference__updated" AFTER UPDATE ON "invoices_return_reference" FOR EACH ROW
  BEGIN UPDATE "invoices_return_reference" SET "updated" = strftime('%Y-%m-%d %H:%M:%fZ','now') WHERE "id" = OLD."id"; END;
CREATE TRIGGER "trg_transactions__updated" AFTER UPDATE ON "transactions" FOR EACH ROW
  BEGIN UPDATE "transactions" SET "updated" = strftime('%Y-%m-%d %H:%M:%fZ','now') WHERE "id" = OLD."id"; END;
CREATE TRIGGER "trg_payments__updated" AFTER UPDATE ON "payments" FOR EACH ROW
  BEGIN UPDATE "payments" SET "updated" = strftime('%Y-%m-%d %H:%M:%fZ','now') WHERE "id" = OLD."id"; END;
