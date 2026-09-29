-- U1790300400__map_pocketbase_categories_to_companies.sql
--
-- The legacy `categories` collection and the new `companies` table are the SAME
-- thing under two names. The legacy frontend calls that collection "companies"
-- everywhere it meets a user:
--
--   app/management/page.tsx:10        { text: "companies", path: "management/categories" }
--   reports/paymentsbycompany:111     fullList({ collection: "categories" })  into a
--                                     variable named `companies`
--   reports/stockreport:68,99         filter built from `categories`, rendered "Company:"
--   reports/difference:65,97          the same, filter labelled "Company"
--   reports/profit:196, unified:195   dataQuery={{ collectionName: "categories" }}
--   invoices/purchase/CreateSupplier  creating a supplier inserts into `categories`
--
-- and the 15 rows are business names (BAKE PARLOR, ZEESHAN PAPAR, NATIONAL RECIPIE),
-- not product categories. `items.category` has always meant "which company owns this
-- item"; the column is the misnamed part, and the guest UI already labels it "Company"
-- (entities.js:102, report-pages.js:113).
--
-- The importer was writing that one list into BOTH tables, which left 15 names in two
-- places under different ids with no link -- items resolving into one, party and
-- booker company links into the other. This migration ends the duplication:
-- `items.category` points at `companies`, and `categories` is dropped.
--
-- Scope note: this touches the NEW system only. `backend/` (PocketBase) and
-- `frontend/` are the parity oracle and are not modified by this or any migration.
--
-- Reversal: the base migration still creates `categories`, so on a clean depot this
-- can be undone by re-running from scratch. There is no forward-only dependency.

-- ---------------------------------------------------------------------------
-- 1. Repoint items by NAME, so existing rows survive the move.
--    A join on name is the only correct key here: the two tables hold the same
--    names under DIFFERENT ids, which is the whole problem being fixed.
-- ---------------------------------------------------------------------------
UPDATE "items"
   SET "category" = (SELECT co."id" FROM "companies" co
                      JOIN "categories" cat ON cat."id" = "items"."category"
                     WHERE co."name" = cat."name")
 WHERE "category" IS NOT NULL;

-- Anything that could not be matched by name keeps no category rather than a
-- dangling one; the import will re-derive it from the source anyway.
UPDATE "items" SET "category" = NULL
 WHERE "category" IS NOT NULL
   AND "category" NOT IN (SELECT "id" FROM "companies");

-- ---------------------------------------------------------------------------
-- 2. Rebuild `items` with the FK pointing at companies.
--    SQLite cannot ALTER a foreign key, so this is the documented table rebuild.
-- ---------------------------------------------------------------------------
CREATE TABLE "items__new" (
  "id"           BLOB PRIMARY KEY NOT NULL CHECK (is_uuid_v7("id")) DEFAULT (uuid_v7()),
  "name"         TEXT NOT NULL DEFAULT '',
  "category"     BLOB REFERENCES "companies"("id") ON DELETE SET NULL,
  "barcode"      TEXT NOT NULL DEFAULT '',
  "display_id"   TEXT NOT NULL DEFAULT '',
  "cost_price"   REAL NOT NULL DEFAULT 0,
  "sale_price"   REAL NOT NULL DEFAULT 0,
  "box_size_qty" REAL NOT NULL DEFAULT 0,
  "created"      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ','now')) CHECK (datetime("created") IS NOT NULL),
  "updated"      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ','now')) CHECK (datetime("updated") IS NOT NULL)
) STRICT;

INSERT INTO "items__new" ("id", "name", "category", "barcode", "display_id",
                          "cost_price", "sale_price", "box_size_qty", "created", "updated")
SELECT "id", "name", "category", "barcode", "display_id",
       "cost_price", "sale_price", "box_size_qty", "created", "updated"
  FROM "items";

DROP TABLE "items";
ALTER TABLE "items__new" RENAME TO "items";

CREATE TRIGGER "trg_items__updated" AFTER UPDATE ON "items" FOR EACH ROW
BEGIN UPDATE "items" SET "updated" = strftime('%Y-%m-%d %H:%M:%fZ','now') WHERE "id" = OLD."id"; END;

-- The indexes are reproduced EXACTLY as the base migration declared them, including
-- the unique partial index on barcode -- dropping that one would silently allow
-- duplicate barcodes.
CREATE INDEX "idx_items_category" ON "items" ("category");
CREATE INDEX "idx_items_display_id" ON "items" ("display_id");
CREATE UNIQUE INDEX "idx_items_barcode_unique" ON "items" ("barcode") WHERE "barcode" != '';

-- ---------------------------------------------------------------------------
-- 3. Retire `categories`.
--    counts_for_row_numbers.sql counts it; that file is the verbatim legacy SQL and
--    is remapped in the same change, so the count is now of `companies` -- which is
--    the same 15 rows under the name legacy actually used.
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS "trg_categories__updated";
DROP TABLE "categories";
