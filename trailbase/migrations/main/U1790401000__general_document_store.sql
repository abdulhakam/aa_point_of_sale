-- A general document store.
--
-- `inv_doc` (U1790300300 + U1790300500) is already exactly the right shape: one JSON document per
-- real record, carrying the resolved names and ids, the calculated values, and the money, kept in
-- step by triggers so the document cannot drift from the tables it describes. What it lacks is a
-- *kind*, so only invoices can live in it.
--
-- This adds `document(kind, id, doc)`: the uniform read surface every screen and every renderer
-- can query, whatever the kind. Invoice documents are MIRRORED in rather than moved, so the proven
-- 14 triggers — ~1,400 lines of build SQL, the most correctness-sensitive code in the system — are
-- untouched and no document can be stale because of this change.
--
-- ## What each kind may contain, and why
--
-- A document is a cache, and a cache that lies is worse than no cache. The rule: a kind carries
-- the data it OWNS, and does not carry aggregates other kinds already compute quickly.
--
--   invoice  mirrored from inv_doc. Unchanged, including its 14 triggers.
--   voucher  one payment: amount, date, direction, the party and booker by name AND id, and the
--            invoice it settles. It owns these, so it cannot go stale.
--   party    identity, contact, companies and document COUNTS. Deliberately NOT a balance: a
--            party's outstanding aggregates invoices AND payments, so caching it would add two
--            more scoped trigger sets to the most visible number on screen — and `outstanding`
--            already answers it in ~200 ms.
--   item     identity, pricing and carton size. Deliberately NOT stock: stock aggregates every
--            transaction for the item, and `stockreport` answers it in ~200 ms. A stale stock
--            number on an item card would be read as the truth.
--
-- The excluded aggregates are exactly the ones already fast. What documents buy is the expensive
-- assembly that must walk thousands of rows — which today is the invoice, and the voucher.
--
-- ## Why `document` and not TrailBase's KV store
--
-- The KV store cannot join the base table's transaction and cannot be queried or indexed. A
-- document written outside the transaction that wrote the invoice can be stale in the window
-- between them, and a document you cannot `WHERE` on is not a lookup. The generated columns below
-- are the lookup: readable_id, label, dated and total are projected out of the JSON and stored, so
-- they are indexable without a second table.
--
-- ## Why the build SQL lives in views
--
-- SQLite allows ONE event per trigger — `AFTER INSERT OR UPDATE` is a syntax error. Since SQLite
-- has no trigger functions either, a kind that must react to both INSERT and UPDATE would need its
-- build SQL written twice. Putting each build in a view keeps it in one place and leaves the
-- triggers as two lines each.

CREATE TABLE "document" (
  "kind"        TEXT NOT NULL,
  "id"          BLOB NOT NULL,
  "doc"         TEXT NOT NULL CHECK (json_valid("doc")),
  "readable_id" TEXT GENERATED ALWAYS AS (json_extract("doc", '$.readable_id')) STORED,
  "label"       TEXT GENERATED ALWAYS AS (json_extract("doc", '$.label'))       STORED,
  "dated"       TEXT GENERATED ALWAYS AS (json_extract("doc", '$.dated'))       STORED,
  "total"       REAL GENERATED ALWAYS AS (CAST(json_extract("doc", '$.total') AS REAL)) STORED,
  "updated"     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ', 'now')),
  PRIMARY KEY ("kind", "id")
) STRICT;

CREATE INDEX "document_kind_readable_idx" ON "document" ("kind", "readable_id");
CREATE INDEX "document_kind_dated_idx"    ON "document" ("kind", "dated");

-- ---------------------------------------------------------------------------
-- The three new kinds, as views. A trigger reads one row from the matching view and upserts it.
-- ---------------------------------------------------------------------------

CREATE VIEW "document__voucher_src" AS
SELECT p."id" AS id,
  json_object(
    'kind', 'voucher',
    'readable_id', 'voucher-' || substr(hex(p."id"), 1, 8),
    'label', COALESCE(NULLIF(pa."name", ''), NULLIF(bo."name", ''), NULLIF(p."description", ''), 'Voucher'),
    'dated', COALESCE(NULLIF(p."payment_date", ''), substr(p."created", 1, 10)),
    'total', CAST(printf('%.2f', COALESCE(p."amount", 0)) AS REAL),
    'total_text', printf('%.2f', COALESCE(p."amount", 0)),
    'type', p."type",
    'direction', CASE p."type" WHEN 1 THEN 'Recieved' WHEN 0 THEN 'Paid out' ELSE 'Returned' END,
    'amount_text', printf('%.2f', COALESCE(p."amount", 0)),
    'paid', CASE WHEN p."paid" = 1 THEN 1 ELSE 0 END,
    'description', COALESCE(p."description", ''),
    'party', hex(pa."id"),
    'party_name', COALESCE(pa."name", ''),
    'paid_to', hex(bo."id"),
    'paid_to_name', COALESCE(bo."name", ''),
    'invoice', hex(i."id"),
    'invoice_no', i."invoiceNo",
    'invoice_type', i."type"
  ) AS doc
FROM "payments" p
LEFT JOIN "parties" pa ON pa."id" = p."party"
LEFT JOIN "order_bookers" bo ON bo."id" = p."paid_to"
LEFT JOIN "invoices" i ON i."id" = p."invoice";

CREATE VIEW "document__party_src" AS
SELECT p."id" AS id,
  json_object(
    'kind', 'party',
    'readable_id', 'party-' || substr(hex(p."id"), 1, 8),
    'label', COALESCE(NULLIF(p."name", ''), '(unnamed)'),
    'dated', substr(p."created", 1, 10),
    'total', CAST(0 AS REAL),
    'total_text', '0.00',
    'name', COALESCE(p."name", ''),
    'type', p."type",
    'type_text', CASE p."type" WHEN 0 THEN 'Customer' WHEN 1 THEN 'Supplier' ELSE 'Both' END,
    'phone', COALESCE(p."phone", ''),
    'address', COALESCE(p."address", ''),
    'area', hex(p."area"),
    'area_name', COALESCE((SELECT a."name" FROM "areas" a WHERE a."id" = p."area"), ''),
    'deleted', CASE WHEN p."deleted" = 1 THEN 1 ELSE 0 END,
    'companies', COALESCE((
      SELECT json_group_array(json_object('id', hex(c."id"), 'name', c."name"))
      FROM "party_companies" pc JOIN "companies" c ON c."id" = pc."company"
      WHERE pc."party" = p."id"), json('[]')),
    'invoice_count', (SELECT COUNT(*) FROM "invoices" i WHERE i."party" = p."id" AND i."deleted" = 0),
    'payment_count', (SELECT COUNT(*) FROM "payments" pm WHERE pm."party" = p."id" AND pm."paid" = 1)
  ) AS doc
FROM "parties" p;

CREATE VIEW "document__item_src" AS
SELECT it."id" AS id,
  json_object(
    'kind', 'item',
    'readable_id', 'item-' || substr(hex(it."id"), 1, 8),
    'label', COALESCE(NULLIF(it."name", ''), '(unnamed)'),
    'dated', substr(it."created", 1, 10),
    'total', CAST(printf('%.2f', COALESCE(it."cost_price", 0)) AS REAL),
    'total_text', printf('%.2f', COALESCE(it."cost_price", 0)),
    'name', COALESCE(it."name", ''),
    'company', hex(c."id"),
    'company_name', COALESCE(c."name", ''),
    'barcode', COALESCE(it."barcode", ''),
    'display_id', COALESCE(it."display_id", ''),
    'cost_price', CAST(printf('%.2f', COALESCE(it."cost_price", 0)) AS REAL),
    'sale_price', CAST(printf('%.2f', COALESCE(it."sale_price", 0)) AS REAL),
    'box_size_qty', COALESCE(it."box_size_qty", 0)
  ) AS doc
FROM "items" it
LEFT JOIN "companies" c ON c."id" = it."category";

-- ---------------------------------------------------------------------------
-- invoice — mirror. The build stays in inv_doc; this is a copy.
-- ---------------------------------------------------------------------------

CREATE TRIGGER "document__invoice_insert" AFTER INSERT ON "inv_doc" FOR EACH ROW
BEGIN
  INSERT INTO "document" ("kind", "id", "doc") VALUES ('invoice', NEW."id", NEW."doc")
  ON CONFLICT ("kind", "id") DO UPDATE SET "doc" = excluded."doc", "updated" = strftime('%Y-%m-%d %H:%M:%fZ','now');
END;

CREATE TRIGGER "document__invoice_update" AFTER UPDATE ON "inv_doc" FOR EACH ROW
BEGIN
  INSERT INTO "document" ("kind", "id", "doc") VALUES ('invoice', NEW."id", NEW."doc")
  ON CONFLICT ("kind", "id") DO UPDATE SET "doc" = excluded."doc", "updated" = strftime('%Y-%m-%d %H:%M:%fZ','now');
END;

CREATE TRIGGER "document__invoice_delete" AFTER DELETE ON "inv_doc" FOR EACH ROW
BEGIN
  DELETE FROM "document" WHERE "kind" = 'invoice' AND "id" = OLD."id";
END;

-- ---------------------------------------------------------------------------
-- voucher
-- ---------------------------------------------------------------------------

CREATE TRIGGER "document__voucher_insert" AFTER INSERT ON "payments" FOR EACH ROW
BEGIN
  INSERT INTO "document" ("kind", "id", "doc")
  SELECT 'voucher', s."id", s."doc" FROM "document__voucher_src" s WHERE s."id" = NEW."id"
  ON CONFLICT ("kind", "id") DO UPDATE SET "doc" = excluded."doc", "updated" = strftime('%Y-%m-%d %H:%M:%fZ','now');
END;

CREATE TRIGGER "document__voucher_update" AFTER UPDATE ON "payments" FOR EACH ROW
BEGIN
  INSERT INTO "document" ("kind", "id", "doc")
  SELECT 'voucher', s."id", s."doc" FROM "document__voucher_src" s WHERE s."id" = NEW."id"
  ON CONFLICT ("kind", "id") DO UPDATE SET "doc" = excluded."doc", "updated" = strftime('%Y-%m-%d %H:%M:%fZ','now');
END;

CREATE TRIGGER "document__voucher_delete" AFTER DELETE ON "payments" FOR EACH ROW
BEGIN
  DELETE FROM "document" WHERE "kind" = 'voucher' AND "id" = OLD."id";
END;

-- ---------------------------------------------------------------------------
-- party
-- ---------------------------------------------------------------------------

CREATE TRIGGER "document__party_insert" AFTER INSERT ON "parties" FOR EACH ROW
BEGIN
  INSERT INTO "document" ("kind", "id", "doc")
  SELECT 'party', s."id", s."doc" FROM "document__party_src" s WHERE s."id" = NEW."id"
  ON CONFLICT ("kind", "id") DO UPDATE SET "doc" = excluded."doc", "updated" = strftime('%Y-%m-%d %H:%M:%fZ','now');
END;

CREATE TRIGGER "document__party_update" AFTER UPDATE ON "parties" FOR EACH ROW
BEGIN
  INSERT INTO "document" ("kind", "id", "doc")
  SELECT 'party', s."id", s."doc" FROM "document__party_src" s WHERE s."id" = NEW."id"
  ON CONFLICT ("kind", "id") DO UPDATE SET "doc" = excluded."doc", "updated" = strftime('%Y-%m-%d %H:%M:%fZ','now');
END;

CREATE TRIGGER "document__party_delete" AFTER DELETE ON "parties" FOR EACH ROW
BEGIN
  DELETE FROM "document" WHERE "kind" = 'party' AND "id" = OLD."id";
END;

-- ---------------------------------------------------------------------------
-- item
-- ---------------------------------------------------------------------------

CREATE TRIGGER "document__item_insert" AFTER INSERT ON "items" FOR EACH ROW
BEGIN
  INSERT INTO "document" ("kind", "id", "doc")
  SELECT 'item', s."id", s."doc" FROM "document__item_src" s WHERE s."id" = NEW."id"
  ON CONFLICT ("kind", "id") DO UPDATE SET "doc" = excluded."doc", "updated" = strftime('%Y-%m-%d %H:%M:%fZ','now');
END;

CREATE TRIGGER "document__item_update" AFTER UPDATE ON "items" FOR EACH ROW
BEGIN
  INSERT INTO "document" ("kind", "id", "doc")
  SELECT 'item', s."id", s."doc" FROM "document__item_src" s WHERE s."id" = NEW."id"
  ON CONFLICT ("kind", "id") DO UPDATE SET "doc" = excluded."doc", "updated" = strftime('%Y-%m-%d %H:%M:%fZ','now');
END;

CREATE TRIGGER "document__item_delete" AFTER DELETE ON "items" FOR EACH ROW
BEGIN
  DELETE FROM "document" WHERE "kind" = 'item' AND "id" = OLD."id";
END;

-- ---------------------------------------------------------------------------
-- Backfill every kind. `kind = <here>` is compared against the generated column rather than the
-- id alone, so the guard is correct even though `id` is unique across kinds.
-- ---------------------------------------------------------------------------

INSERT INTO "document" ("kind", "id", "doc")
SELECT 'invoice', "id", "doc" FROM "inv_doc"
WHERE NOT EXISTS (SELECT 1 FROM "document" d WHERE d."kind" = 'invoice' AND d."id" = "inv_doc"."id");

INSERT INTO "document" ("kind", "id", "doc")
SELECT 'voucher', s."id", s."doc" FROM "document__voucher_src" s
WHERE NOT EXISTS (SELECT 1 FROM "document" d WHERE d."kind" = 'voucher' AND d."id" = s."id");

INSERT INTO "document" ("kind", "id", "doc")
SELECT 'party', s."id", s."doc" FROM "document__party_src" s
WHERE NOT EXISTS (SELECT 1 FROM "document" d WHERE d."kind" = 'party' AND d."id" = s."id");

INSERT INTO "document" ("kind", "id", "doc")
SELECT 'item', s."id", s."doc" FROM "document__item_src" s
WHERE NOT EXISTS (SELECT 1 FROM "document" d WHERE d."kind" = 'item' AND d."id" = s."id");
