-- U1790300500__invoice_document_sync.sql
--
-- The invoice materialised cache, made live: one document per invoice,
-- maintained by triggers in the same transaction as the write, and rebuildable on
-- demand or at server start.

--   * The build statement below is THE SINGLE DEFINITION of an invoice document.
--     Every trigger in this file is a mechanical narrowing of it to one invoice --
--     no second copy of the arithmetic exists anywhere.
--   * The same text is stored in `materialised_source`, and the runtime rebuild
--     (app/lib/invoice-doc.js, POST /invoice-doc/rebuild) executes exactly that
--     stored text. A user-triggered rebuild therefore cannot diverge from the
--     backfill the migration-time data was produced with.
--   * `trailbase/tools/invoice-doc-sync-check.mjs` re-derives every trigger from
--     the committed build statement and fails if the file has drifted. Run it
--     after editing anything below.
--
-- TrailBase's refinery installs an `AFTER UPDATE` trigger on every table that
-- stamps `updated`. It writes the row, which fires the triggers below a SECOND
-- time, and that second firing is the last thing to touch the document -- so the
-- document's own `updated` field is the settled one, by construction rather than
-- by trigger-firing luck. It also means a base-row update pays for the document
-- rebuild twice; that is priced into the numbers below rather than designed
-- around.
--
-- Why the document carries names, and what that costs: it is meant to be
-- readable on its own, so it carries party/item/booker/type names rather than
-- bare ids. A rename therefore has to reach every document quoting the old name,
-- and those triggers re-derive the affected documents with the same build
-- statement rather than patching the one field that changed. A name-only patch is
-- roughly half the cost, but it is a SECOND copy of the document's field list: a
-- field added to the build below without updating the patch would leave a stale
-- name in the document with no error anywhere. Re-deriving cannot drift.
--
-- Measured on the production depot (8,932 invoices, 23,421 lines, 26,526 payments,
-- 16.9 MB of documents at 1.9 KB each) by `trailbase/tools/invoice-doc-check.mjs` and
-- `trailbase/tools/invoice-document-parity.py`. The ranges are the spread across runs on a
-- machine that was busy, not a single sample:
--
--   line insert, 36-line invoice                  0.9 - 2.9 ms
--   line update / soft delete / hard delete       0.1 - 2.0 ms
--   payment insert / update / delete              0.1 - 7.7 ms
--   invoice header update, completed flag          1.5 - 9.6 ms
--   entering an invoice line by line, 100 lines    0.4 - 0.6 s in total
--   line moved to another invoice, both re-derived   10 - 17 ms
--   item rename, worst case (1,063 documents)      0.65 - 2.3 s
--   party rename, worst case (784 documents)       0.45 - 1.6 s
--   booker rename, worst case (4,122 documents)     2.1 - 8.2 s
--   full rebuild, in place                          3 - 15 s
--   full rebuild, shadow table + atomic swap       3 - 18 s
--   read one document by primary key                   0.03 ms
--   outstanding, GROUP BY party                    20 - 44 ms
--
-- Two things to read off that table.
--
-- A per-invoice write is cheap but NOT constant: re-deriving a document costs what the
-- invoice contains, so the 100th line of a 100-line invoice costs about 100x the first.
-- Half a second for a hundred lines is fine and no shop enters a hundred lines, but it is
-- the shape of the cost, and it is why the write-through re-derives rather than patching
-- one field.
--
-- And a rebuild is seconds, not milliseconds -- at the slow end, more than the guest's
-- ~20 s call deadline. That is why the rebuild is a job on the durable queue and not a
-- statement inside a request: run inline it finishes the work and then loses the HTTP
-- response to the deadline, which is exactly what happened the first time it was tried.

-- ---------------------------------------------------------------------------
-- 1. The registry the runtime rebuild reads.
--
-- Generic on purpose: `kind` names a materialised document type, `table_name` the
-- table it lives in, `sql` the statement that (re)builds it. A second materialised
-- document type is another row, not another mechanism.
-- ---------------------------------------------------------------------------
CREATE TABLE "materialised_source" (
  "kind"       TEXT PRIMARY KEY,
  "table_name" TEXT NOT NULL,
  "sql"        TEXT NOT NULL,
  "note"       TEXT NOT NULL DEFAULT '',
  "updated"    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ','now'))
) STRICT;

-- The booker rename trigger below reaches a payment's `paid_to`, and unlike
-- `party` and `invoice` that column has no index -- so that lookup was a scan of
-- all 26,526 payments. Every `paid_to` is NULL today, but the column is not
-- declared NOT NULL, so the index is what keeps the rename honest if that changes.
CREATE INDEX "idx_payments_paid_to" ON "payments" ("paid_to");

-- ---------------------------------------------------------------------------
-- 2. THE BUILD STATEMENT -- the single definition of an invoice document.
--
-- The line arithmetic, in order, because the order IS the specification
-- (unchanged from U1790300300, and pinned against PocketBase by
-- trailbase/tools/invoice-document-parity.py):
--   line_total        = (price*qty) * (1 - discount_1/100) * (1 - discount_2/100)
--                       - discount_rs
--   total             = sum of each line ALREADY rounded to 2dp   <- legacy quirk
--   unrounded_total   = total, minus invoice d1, minus d2, THEN rounded to 2dp
--   final_total       = unrounded_total (the ROUNDED value) minus discount_rs
-- The last two lines are the quirk: legacy rounds unrounded_total before
-- subtracting discount_rs. Storing the raw expression instead moved 4 invoices by
-- half a cent and one by a whole cent.
--
-- The `ORDER BY` inside each `json_group_array` is not cosmetic. Without it the
-- line order is whatever the scan produced, and a document is read by a human as
-- well as by SQL, so the order has to be the order the lines were entered in
-- ([[deterministic-sort-and-sql-reads-in-guest]]).
--
-- Additions over the U1790300300 shape: the denormalised names and phone, the
-- header's duedate/description/created/updated, and each payment's type/party/
-- paid-to names. Money is untouched -- the arithmetic above is character for
-- character what the parity harness verified.
-- ---------------------------------------------------------------------------

-- WITH lt AS (
--   SELECT t."invoice" AS inv, t."id" AS line_id, t."item" AS item,
--          t."qty" AS qty, t."price" AS price, t."cost_price" AS cost_price,
--          t."scheme" AS scheme, t."discount_1" AS d1, t."discount_2" AS d2,
--          t."discount_rs" AS drs, it."name" AS item_name,
--          printf('%.2f',
--            (t."price"*t."qty")*(1-t."discount_1"/100.0)
--                            *(1-t."discount_2"/100.0)-t."discount_rs") AS line_rounded,
--          (t."price"*t."qty")*(1-t."discount_1"/100.0)
--                         *(1-t."discount_2"/100.0)-t."discount_rs" AS line_raw
--   FROM "transactions" t
--   LEFT JOIN "items" it ON it."id" = t."item"
--   WHERE t."deleted" = 0
-- ),
-- sums AS (
--   SELECT i."id" AS inv,
--          printf('%.2f', COALESCE(SUM(CAST(lt.line_rounded AS REAL)), 0)) AS total,
--          i."discount_1" AS d1, i."discount_2" AS d2, i."discount_rs" AS drs
--   FROM "invoices" i LEFT JOIN lt ON lt.inv = i."id"
--   WHERE i."deleted" = 0 GROUP BY i."id"
-- ),
-- money AS (
--   SELECT s.inv, s.total, s.d1, s.d2, s.drs,
--          printf('%.2f', s.total - (s.total * s.d1 / 100.0)
--                               - ((s.total - (s.total * s.d1 / 100.0)) * s.d2 / 100.0))
--            AS unrounded_total,
--          printf('%.2f', printf('%.2f', s.total - (s.total * s.d1 / 100.0)
--                               - ((s.total - (s.total * s.d1 / 100.0)) * s.d2 / 100.0))
--                          - s.drs) AS final_total
--   FROM sums s
-- ),
-- paid AS (
--   SELECT "invoice" AS inv,
--          printf('%.2f', COALESCE(SUM(CASE WHEN "paid" = 1 THEN "amount" ELSE 0 END), 0)) AS paid_total
--   FROM "payments" WHERE "deleted" = 0 GROUP BY "invoice"
-- ),
-- ljson AS (
--   SELECT inv, json_group_array(json_object(
--            'id', hex(line_id), 'item', hex(item), 'item_name', item_name,
--            'qty', qty, 'price', price, 'cost_price', cost_price, 'scheme', scheme,
--            'd1', d1, 'd2', d2, 'drs', drs,
--            'total', line_rounded, 'total_raw', line_raw) ORDER BY line_id) AS lines
--   FROM lt GROUP BY inv
-- ),
-- pjson AS (
--   SELECT pay."invoice" AS inv, json_group_array(json_object(
--            'id', hex(pay."id"), 'type', pay."type", 'type_name', pty."name",
--            'amount', pay."amount", 'paid', pay."paid",
--            'payment_date', pay."payment_date", 'description', pay."description",
--            'party', hex(pay."party"), 'party_name', pa."name",
--            'paid_to', hex(pay."paid_to"), 'paid_to_name', ob."name")
--            ORDER BY pay."id") AS pays
--   FROM "payments" pay
--   LEFT JOIN "payment_types" pty ON pty."id" = pay."type"
--   LEFT JOIN "parties" pa ON pa."id" = pay."party"
--   LEFT JOIN "order_bookers" ob ON ob."id" = pay."paid_to"
--   WHERE pay."deleted" = 0 GROUP BY pay."invoice"
-- )
-- INSERT INTO "inv_doc" ("id", "doc")
-- SELECT i."id",
--   json_object(
--     'readable_id', 'inv-' || i."invoiceNo",
--     'type', i."type", 'type_name', it."name",
--     'invoiceNo', i."invoiceNo",
--     'party', hex(i."party"), 'party_name', pa."name", 'party_phone', pa."phone",
--     'booker', hex(i."booker"), 'booker_name', ob."name",
--     'invoice_maker', hex(i."invoice_maker"),
--     'dated', i."dated", 'duedate', i."duedate", 'description', i."description",
--     'completed', i."completed",
--     'd1', i."discount_1", 'd2', i."discount_2", 'drs', i."discount_rs",
--     'total', m.total, 'unrounded_total', m.unrounded_total, 'final_total', m.final_total,
--     'paid_total', COALESCE(p.paid_total, 0),
--     'remaining', printf('%.2f', CAST(m.final_total AS REAL) - CAST(COALESCE(p.paid_total, 0) AS REAL)),
--     'created', i."created", 'updated', i."updated",
--     'lines', json(COALESCE(l.lines, '[]')),
--     'payments', json(COALESCE(pj.pays, '[]'))
--   )
-- FROM "invoices" i
-- JOIN money m ON m.inv = i."id"
-- LEFT JOIN "invoice_types" it ON it."id" = i."type"
-- LEFT JOIN "parties" pa ON pa."id" = i."party"
-- LEFT JOIN "order_bookers" ob ON ob."id" = i."booker"
-- LEFT JOIN paid p ON p.inv = i."id"
-- LEFT JOIN ljson l ON l.inv = i."id"
-- LEFT JOIN pjson pj ON pj.inv = i."id"
-- WHERE i."deleted" = 0

-- ---------------------------------------------------------------------------
-- 3. The same statement, stored.
--
-- The runtime rebuild (app/lib/invoice-doc.js, POST /invoice-doc/rebuild) reads this
-- row and executes it verbatim, so "rebuild" means exactly "run the build". The
-- stored text and the statement in section 4 are the same statement, and
-- tools/invoice-doc-sync-check.mjs asserts it against a live database as well as
-- against this file.
-- ---------------------------------------------------------------------------

INSERT INTO "materialised_source" ("kind", "table_name", "sql", "note") VALUES
  ('invoice.build', 'inv_doc',
'WITH lt AS (
  SELECT t."invoice" AS inv, t."id" AS line_id, t."item" AS item,
         t."qty" AS qty, t."price" AS price, t."cost_price" AS cost_price,
         t."scheme" AS scheme, t."discount_1" AS d1, t."discount_2" AS d2,
         t."discount_rs" AS drs, it."name" AS item_name,
         printf(''%.2f'',
           (t."price"*t."qty")*(1-t."discount_1"/100.0)
                           *(1-t."discount_2"/100.0)-t."discount_rs") AS line_rounded,
         (t."price"*t."qty")*(1-t."discount_1"/100.0)
                        *(1-t."discount_2"/100.0)-t."discount_rs" AS line_raw
  FROM "transactions" t
  LEFT JOIN "items" it ON it."id" = t."item"
  WHERE t."deleted" = 0
),
sums AS (
  SELECT i."id" AS inv,
         printf(''%.2f'', COALESCE(SUM(CAST(lt.line_rounded AS REAL)), 0)) AS total,
         i."discount_1" AS d1, i."discount_2" AS d2, i."discount_rs" AS drs
  FROM "invoices" i LEFT JOIN lt ON lt.inv = i."id"
  WHERE i."deleted" = 0 GROUP BY i."id"
),
money AS (
  SELECT s.inv, s.total, s.d1, s.d2, s.drs,
         printf(''%.2f'', s.total - (s.total * s.d1 / 100.0)
                              - ((s.total - (s.total * s.d1 / 100.0)) * s.d2 / 100.0))
           AS unrounded_total,
         printf(''%.2f'', printf(''%.2f'', s.total - (s.total * s.d1 / 100.0)
                              - ((s.total - (s.total * s.d1 / 100.0)) * s.d2 / 100.0))
                         - s.drs) AS final_total
  FROM sums s
),
paid AS (
  SELECT "invoice" AS inv,
         printf(''%.2f'', COALESCE(SUM(CASE WHEN "paid" = 1 THEN "amount" ELSE 0 END), 0)) AS paid_total
  FROM "payments" WHERE "deleted" = 0 GROUP BY "invoice"
),
ljson AS (
  SELECT inv, json_group_array(json_object(
           ''id'', hex(line_id), ''item'', hex(item), ''item_name'', item_name,
           ''qty'', qty, ''price'', price, ''cost_price'', cost_price, ''scheme'', scheme,
           ''d1'', d1, ''d2'', d2, ''drs'', drs,
           ''total'', line_rounded, ''total_raw'', line_raw) ORDER BY line_id) AS lines
  FROM lt GROUP BY inv
),
pjson AS (
  SELECT pay."invoice" AS inv, json_group_array(json_object(
           ''id'', hex(pay."id"), ''type'', pay."type", ''type_name'', pty."name",
           ''amount'', pay."amount", ''paid'', pay."paid",
           ''payment_date'', pay."payment_date", ''description'', pay."description",
           ''party'', hex(pay."party"), ''party_name'', pa."name",
           ''paid_to'', hex(pay."paid_to"), ''paid_to_name'', ob."name")
           ORDER BY pay."id") AS pays
  FROM "payments" pay
  LEFT JOIN "payment_types" pty ON pty."id" = pay."type"
  LEFT JOIN "parties" pa ON pa."id" = pay."party"
  LEFT JOIN "order_bookers" ob ON ob."id" = pay."paid_to"
  WHERE pay."deleted" = 0 GROUP BY pay."invoice"
)
INSERT INTO "inv_doc" ("id", "doc")
SELECT i."id",
  json_object(
    ''readable_id'', ''inv-'' || i."invoiceNo",
    ''type'', i."type", ''type_name'', it."name",
    ''invoiceNo'', i."invoiceNo",
    ''party'', hex(i."party"), ''party_name'', pa."name", ''party_phone'', pa."phone",
    ''booker'', hex(i."booker"), ''booker_name'', ob."name",
    ''invoice_maker'', hex(i."invoice_maker"),
    ''dated'', i."dated", ''duedate'', i."duedate", ''description'', i."description",
    ''completed'', i."completed",
    ''d1'', i."discount_1", ''d2'', i."discount_2", ''drs'', i."discount_rs",
    ''total'', m.total, ''unrounded_total'', m.unrounded_total, ''final_total'', m.final_total,
    ''paid_total'', COALESCE(p.paid_total, 0),
    ''remaining'', printf(''%.2f'', CAST(m.final_total AS REAL) - CAST(COALESCE(p.paid_total, 0) AS REAL)),
    ''created'', i."created", ''updated'', i."updated",
    ''lines'', json(COALESCE(l.lines, ''[]'')),
    ''payments'', json(COALESCE(pj.pays, ''[]''))
  )
FROM "invoices" i
JOIN money m ON m.inv = i."id"
LEFT JOIN "invoice_types" it ON it."id" = i."type"
LEFT JOIN "parties" pa ON pa."id" = i."party"
LEFT JOIN "order_bookers" ob ON ob."id" = i."booker"
LEFT JOIN paid p ON p.inv = i."id"
LEFT JOIN ljson l ON l.inv = i."id"
LEFT JOIN pjson pj ON pj.inv = i."id"
WHERE i."deleted" = 0',
   'The single definition of an invoice document. Read and executed verbatim by the
    runtime rebuild (app/lib/invoice-doc.js); the triggers in this file are
    narrowings of exactly this text, proved by tools/invoice-doc-sync-check.mjs.');

-- ---------------------------------------------------------------------------
-- 4. Repopulate.
--
-- `inv_doc` is empty on a depot whose data arrived after the migrations ran --
-- which is every real depot, because the v1 import is a plugin that runs against
-- a migrated database. The backfill in U1790300300 could only see the rows that
-- existed at migrate time. This is the rebuild, and it also moves every existing
-- document onto the enriched shape (names, dates, descriptions).
-- ---------------------------------------------------------------------------
DELETE FROM "inv_doc";

WITH lt AS (
  SELECT t."invoice" AS inv, t."id" AS line_id, t."item" AS item,
         t."qty" AS qty, t."price" AS price, t."cost_price" AS cost_price,
         t."scheme" AS scheme, t."discount_1" AS d1, t."discount_2" AS d2,
         t."discount_rs" AS drs, it."name" AS item_name,
         printf('%.2f',
           (t."price"*t."qty")*(1-t."discount_1"/100.0)
                           *(1-t."discount_2"/100.0)-t."discount_rs") AS line_rounded,
         (t."price"*t."qty")*(1-t."discount_1"/100.0)
                        *(1-t."discount_2"/100.0)-t."discount_rs" AS line_raw
  FROM "transactions" t
  LEFT JOIN "items" it ON it."id" = t."item"
  WHERE t."deleted" = 0
),
sums AS (
  SELECT i."id" AS inv,
         printf('%.2f', COALESCE(SUM(CAST(lt.line_rounded AS REAL)), 0)) AS total,
         i."discount_1" AS d1, i."discount_2" AS d2, i."discount_rs" AS drs
  FROM "invoices" i LEFT JOIN lt ON lt.inv = i."id"
  WHERE i."deleted" = 0 GROUP BY i."id"
),
money AS (
  SELECT s.inv, s.total, s.d1, s.d2, s.drs,
         printf('%.2f', s.total - (s.total * s.d1 / 100.0)
                              - ((s.total - (s.total * s.d1 / 100.0)) * s.d2 / 100.0))
           AS unrounded_total,
         printf('%.2f', printf('%.2f', s.total - (s.total * s.d1 / 100.0)
                              - ((s.total - (s.total * s.d1 / 100.0)) * s.d2 / 100.0))
                         - s.drs) AS final_total
  FROM sums s
),
paid AS (
  SELECT "invoice" AS inv,
         printf('%.2f', COALESCE(SUM(CASE WHEN "paid" = 1 THEN "amount" ELSE 0 END), 0)) AS paid_total
  FROM "payments" WHERE "deleted" = 0 GROUP BY "invoice"
),
ljson AS (
  SELECT inv, json_group_array(json_object(
           'id', hex(line_id), 'item', hex(item), 'item_name', item_name,
           'qty', qty, 'price', price, 'cost_price', cost_price, 'scheme', scheme,
           'd1', d1, 'd2', d2, 'drs', drs,
           'total', line_rounded, 'total_raw', line_raw) ORDER BY line_id) AS lines
  FROM lt GROUP BY inv
),
pjson AS (
  SELECT pay."invoice" AS inv, json_group_array(json_object(
           'id', hex(pay."id"), 'type', pay."type", 'type_name', pty."name",
           'amount', pay."amount", 'paid', pay."paid",
           'payment_date', pay."payment_date", 'description', pay."description",
           'party', hex(pay."party"), 'party_name', pa."name",
           'paid_to', hex(pay."paid_to"), 'paid_to_name', ob."name")
           ORDER BY pay."id") AS pays
  FROM "payments" pay
  LEFT JOIN "payment_types" pty ON pty."id" = pay."type"
  LEFT JOIN "parties" pa ON pa."id" = pay."party"
  LEFT JOIN "order_bookers" ob ON ob."id" = pay."paid_to"
  WHERE pay."deleted" = 0 GROUP BY pay."invoice"
)
INSERT INTO "inv_doc" ("id", "doc")
SELECT i."id",
  json_object(
    'readable_id', 'inv-' || i."invoiceNo",
    'type', i."type", 'type_name', it."name",
    'invoiceNo', i."invoiceNo",
    'party', hex(i."party"), 'party_name', pa."name", 'party_phone', pa."phone",
    'booker', hex(i."booker"), 'booker_name', ob."name",
    'invoice_maker', hex(i."invoice_maker"),
    'dated', i."dated", 'duedate', i."duedate", 'description', i."description",
    'completed', i."completed",
    'd1', i."discount_1", 'd2', i."discount_2", 'drs', i."discount_rs",
    'total', m.total, 'unrounded_total', m.unrounded_total, 'final_total', m.final_total,
    'paid_total', COALESCE(p.paid_total, 0),
    'remaining', printf('%.2f', CAST(m.final_total AS REAL) - CAST(COALESCE(p.paid_total, 0) AS REAL)),
    'created', i."created", 'updated', i."updated",
    'lines', json(COALESCE(l.lines, '[]')),
    'payments', json(COALESCE(pj.pays, '[]'))
  )
FROM "invoices" i
JOIN money m ON m.inv = i."id"
LEFT JOIN "invoice_types" it ON it."id" = i."type"
LEFT JOIN "parties" pa ON pa."id" = i."party"
LEFT JOIN "order_bookers" ob ON ob."id" = i."booker"
LEFT JOIN paid p ON p.inv = i."id"
LEFT JOIN ljson l ON l.inv = i."id"
LEFT JOIN pjson pj ON pj.inv = i."id"
WHERE i."deleted" = 0;

-- ===========================================================================
-- 5. WRITE-THROUGH.
--
-- Every statement below is the build from section 2 with its four depot-wide
-- scans narrowed to one invoice, wrapped in the operation that changed it. The
-- narrowing is a textual substitution of the same text, and it is asserted by
-- tools/invoice-doc-sync-check.mjs. It matters: the unnarrowed form re-aggregates
-- all 23,421 lines and 26,526 payments on every line write, which measured 237 ms
-- per line -- unusable at a till.
--
-- The document is written in the SAME transaction as the line or payment that
-- changed, so no reader can see an invoice whose stored total disagrees with its
-- own lines. There is no window and no invalidation step.
-- ===========================================================================

-- A line is added. The document does not exist yet only if the header is gone.
CREATE TRIGGER "inv_doc__line_insert" AFTER INSERT ON "transactions" FOR EACH ROW
WHEN NEW."invoice" IS NOT NULL
BEGIN
  UPDATE "inv_doc" SET "doc" = (WITH lt AS (
  SELECT t."invoice" AS inv, t."id" AS line_id, t."item" AS item,
         t."qty" AS qty, t."price" AS price, t."cost_price" AS cost_price,
         t."scheme" AS scheme, t."discount_1" AS d1, t."discount_2" AS d2,
         t."discount_rs" AS drs, it."name" AS item_name,
         printf('%.2f',
           (t."price"*t."qty")*(1-t."discount_1"/100.0)
                           *(1-t."discount_2"/100.0)-t."discount_rs") AS line_rounded,
         (t."price"*t."qty")*(1-t."discount_1"/100.0)
                        *(1-t."discount_2"/100.0)-t."discount_rs" AS line_raw
  FROM "transactions" t
  LEFT JOIN "items" it ON it."id" = t."item"
  WHERE t."deleted" = 0 AND t."invoice" = NEW."invoice"
),
sums AS (
  SELECT i."id" AS inv,
         printf('%.2f', COALESCE(SUM(CAST(lt.line_rounded AS REAL)), 0)) AS total,
         i."discount_1" AS d1, i."discount_2" AS d2, i."discount_rs" AS drs
  FROM "invoices" i LEFT JOIN lt ON lt.inv = i."id"
  WHERE i."id" = NEW."invoice" AND i."deleted" = 0 GROUP BY i."id"
),
money AS (
  SELECT s.inv, s.total, s.d1, s.d2, s.drs,
         printf('%.2f', s.total - (s.total * s.d1 / 100.0)
                              - ((s.total - (s.total * s.d1 / 100.0)) * s.d2 / 100.0))
           AS unrounded_total,
         printf('%.2f', printf('%.2f', s.total - (s.total * s.d1 / 100.0)
                              - ((s.total - (s.total * s.d1 / 100.0)) * s.d2 / 100.0))
                         - s.drs) AS final_total
  FROM sums s
),
paid AS (
  SELECT "invoice" AS inv,
         printf('%.2f', COALESCE(SUM(CASE WHEN "paid" = 1 THEN "amount" ELSE 0 END), 0)) AS paid_total
  FROM "payments" WHERE "deleted" = 0 AND "invoice" = NEW."invoice" GROUP BY "invoice"
),
ljson AS (
  SELECT inv, json_group_array(json_object(
           'id', hex(line_id), 'item', hex(item), 'item_name', item_name,
           'qty', qty, 'price', price, 'cost_price', cost_price, 'scheme', scheme,
           'd1', d1, 'd2', d2, 'drs', drs,
           'total', line_rounded, 'total_raw', line_raw) ORDER BY line_id) AS lines
  FROM lt GROUP BY inv
),
pjson AS (
  SELECT pay."invoice" AS inv, json_group_array(json_object(
           'id', hex(pay."id"), 'type', pay."type", 'type_name', pty."name",
           'amount', pay."amount", 'paid', pay."paid",
           'payment_date', pay."payment_date", 'description', pay."description",
           'party', hex(pay."party"), 'party_name', pa."name",
           'paid_to', hex(pay."paid_to"), 'paid_to_name', ob."name")
           ORDER BY pay."id") AS pays
  FROM "payments" pay
  LEFT JOIN "payment_types" pty ON pty."id" = pay."type"
  LEFT JOIN "parties" pa ON pa."id" = pay."party"
  LEFT JOIN "order_bookers" ob ON ob."id" = pay."paid_to"
  WHERE pay."deleted" = 0 AND pay."invoice" = NEW."invoice" GROUP BY pay."invoice"
)
SELECT
  json_object(
    'readable_id', 'inv-' || i."invoiceNo",
    'type', i."type", 'type_name', it."name",
    'invoiceNo', i."invoiceNo",
    'party', hex(i."party"), 'party_name', pa."name", 'party_phone', pa."phone",
    'booker', hex(i."booker"), 'booker_name', ob."name",
    'invoice_maker', hex(i."invoice_maker"),
    'dated', i."dated", 'duedate', i."duedate", 'description', i."description",
    'completed', i."completed",
    'd1', i."discount_1", 'd2', i."discount_2", 'drs', i."discount_rs",
    'total', m.total, 'unrounded_total', m.unrounded_total, 'final_total', m.final_total,
    'paid_total', COALESCE(p.paid_total, 0),
    'remaining', printf('%.2f', CAST(m.final_total AS REAL) - CAST(COALESCE(p.paid_total, 0) AS REAL)),
    'created', i."created", 'updated', i."updated",
    'lines', json(COALESCE(l.lines, '[]')),
    'payments', json(COALESCE(pj.pays, '[]'))
  )
FROM "invoices" i
JOIN money m ON m.inv = i."id"
LEFT JOIN "invoice_types" it ON it."id" = i."type"
LEFT JOIN "parties" pa ON pa."id" = i."party"
LEFT JOIN "order_bookers" ob ON ob."id" = i."booker"
LEFT JOIN paid p ON p.inv = i."id"
LEFT JOIN ljson l ON l.inv = i."id"
LEFT JOIN pjson pj ON pj.inv = i."id"
WHERE i."deleted" = 0) WHERE "id" = NEW."invoice";
END;

-- A line's money or item changes: same invoice, new arithmetic.
CREATE TRIGGER "inv_doc__line_update" AFTER UPDATE ON "transactions" FOR EACH ROW
BEGIN
  UPDATE "inv_doc" SET "doc" = (WITH lt AS (
  SELECT t."invoice" AS inv, t."id" AS line_id, t."item" AS item,
         t."qty" AS qty, t."price" AS price, t."cost_price" AS cost_price,
         t."scheme" AS scheme, t."discount_1" AS d1, t."discount_2" AS d2,
         t."discount_rs" AS drs, it."name" AS item_name,
         printf('%.2f',
           (t."price"*t."qty")*(1-t."discount_1"/100.0)
                           *(1-t."discount_2"/100.0)-t."discount_rs") AS line_rounded,
         (t."price"*t."qty")*(1-t."discount_1"/100.0)
                        *(1-t."discount_2"/100.0)-t."discount_rs" AS line_raw
  FROM "transactions" t
  LEFT JOIN "items" it ON it."id" = t."item"
  WHERE t."deleted" = 0 AND t."invoice" = NEW."invoice"
),
sums AS (
  SELECT i."id" AS inv,
         printf('%.2f', COALESCE(SUM(CAST(lt.line_rounded AS REAL)), 0)) AS total,
         i."discount_1" AS d1, i."discount_2" AS d2, i."discount_rs" AS drs
  FROM "invoices" i LEFT JOIN lt ON lt.inv = i."id"
  WHERE i."id" = NEW."invoice" AND i."deleted" = 0 GROUP BY i."id"
),
money AS (
  SELECT s.inv, s.total, s.d1, s.d2, s.drs,
         printf('%.2f', s.total - (s.total * s.d1 / 100.0)
                              - ((s.total - (s.total * s.d1 / 100.0)) * s.d2 / 100.0))
           AS unrounded_total,
         printf('%.2f', printf('%.2f', s.total - (s.total * s.d1 / 100.0)
                              - ((s.total - (s.total * s.d1 / 100.0)) * s.d2 / 100.0))
                         - s.drs) AS final_total
  FROM sums s
),
paid AS (
  SELECT "invoice" AS inv,
         printf('%.2f', COALESCE(SUM(CASE WHEN "paid" = 1 THEN "amount" ELSE 0 END), 0)) AS paid_total
  FROM "payments" WHERE "deleted" = 0 AND "invoice" = NEW."invoice" GROUP BY "invoice"
),
ljson AS (
  SELECT inv, json_group_array(json_object(
           'id', hex(line_id), 'item', hex(item), 'item_name', item_name,
           'qty', qty, 'price', price, 'cost_price', cost_price, 'scheme', scheme,
           'd1', d1, 'd2', d2, 'drs', drs,
           'total', line_rounded, 'total_raw', line_raw) ORDER BY line_id) AS lines
  FROM lt GROUP BY inv
),
pjson AS (
  SELECT pay."invoice" AS inv, json_group_array(json_object(
           'id', hex(pay."id"), 'type', pay."type", 'type_name', pty."name",
           'amount', pay."amount", 'paid', pay."paid",
           'payment_date', pay."payment_date", 'description', pay."description",
           'party', hex(pay."party"), 'party_name', pa."name",
           'paid_to', hex(pay."paid_to"), 'paid_to_name', ob."name")
           ORDER BY pay."id") AS pays
  FROM "payments" pay
  LEFT JOIN "payment_types" pty ON pty."id" = pay."type"
  LEFT JOIN "parties" pa ON pa."id" = pay."party"
  LEFT JOIN "order_bookers" ob ON ob."id" = pay."paid_to"
  WHERE pay."deleted" = 0 AND pay."invoice" = NEW."invoice" GROUP BY pay."invoice"
)
SELECT
  json_object(
    'readable_id', 'inv-' || i."invoiceNo",
    'type', i."type", 'type_name', it."name",
    'invoiceNo', i."invoiceNo",
    'party', hex(i."party"), 'party_name', pa."name", 'party_phone', pa."phone",
    'booker', hex(i."booker"), 'booker_name', ob."name",
    'invoice_maker', hex(i."invoice_maker"),
    'dated', i."dated", 'duedate', i."duedate", 'description', i."description",
    'completed', i."completed",
    'd1', i."discount_1", 'd2', i."discount_2", 'drs', i."discount_rs",
    'total', m.total, 'unrounded_total', m.unrounded_total, 'final_total', m.final_total,
    'paid_total', COALESCE(p.paid_total, 0),
    'remaining', printf('%.2f', CAST(m.final_total AS REAL) - CAST(COALESCE(p.paid_total, 0) AS REAL)),
    'created', i."created", 'updated', i."updated",
    'lines', json(COALESCE(l.lines, '[]')),
    'payments', json(COALESCE(pj.pays, '[]'))
  )
FROM "invoices" i
JOIN money m ON m.inv = i."id"
LEFT JOIN "invoice_types" it ON it."id" = i."type"
LEFT JOIN "parties" pa ON pa."id" = i."party"
LEFT JOIN "order_bookers" ob ON ob."id" = i."booker"
LEFT JOIN paid p ON p.inv = i."id"
LEFT JOIN ljson l ON l.inv = i."id"
LEFT JOIN pjson pj ON pj.inv = i."id"
WHERE i."deleted" = 0) WHERE "id" = NEW."invoice";
END;

-- A line is moved to another invoice: BOTH documents are now wrong.
CREATE TRIGGER "inv_doc__line_reassigned" AFTER UPDATE ON "transactions" FOR EACH ROW
WHEN OLD."invoice" IS NOT NEW."invoice"
BEGIN
  UPDATE "inv_doc" SET "doc" = (WITH lt AS (
  SELECT t."invoice" AS inv, t."id" AS line_id, t."item" AS item,
         t."qty" AS qty, t."price" AS price, t."cost_price" AS cost_price,
         t."scheme" AS scheme, t."discount_1" AS d1, t."discount_2" AS d2,
         t."discount_rs" AS drs, it."name" AS item_name,
         printf('%.2f',
           (t."price"*t."qty")*(1-t."discount_1"/100.0)
                           *(1-t."discount_2"/100.0)-t."discount_rs") AS line_rounded,
         (t."price"*t."qty")*(1-t."discount_1"/100.0)
                        *(1-t."discount_2"/100.0)-t."discount_rs" AS line_raw
  FROM "transactions" t
  LEFT JOIN "items" it ON it."id" = t."item"
  WHERE t."deleted" = 0 AND t."invoice" = OLD."invoice"
),
sums AS (
  SELECT i."id" AS inv,
         printf('%.2f', COALESCE(SUM(CAST(lt.line_rounded AS REAL)), 0)) AS total,
         i."discount_1" AS d1, i."discount_2" AS d2, i."discount_rs" AS drs
  FROM "invoices" i LEFT JOIN lt ON lt.inv = i."id"
  WHERE i."id" = OLD."invoice" AND i."deleted" = 0 GROUP BY i."id"
),
money AS (
  SELECT s.inv, s.total, s.d1, s.d2, s.drs,
         printf('%.2f', s.total - (s.total * s.d1 / 100.0)
                              - ((s.total - (s.total * s.d1 / 100.0)) * s.d2 / 100.0))
           AS unrounded_total,
         printf('%.2f', printf('%.2f', s.total - (s.total * s.d1 / 100.0)
                              - ((s.total - (s.total * s.d1 / 100.0)) * s.d2 / 100.0))
                         - s.drs) AS final_total
  FROM sums s
),
paid AS (
  SELECT "invoice" AS inv,
         printf('%.2f', COALESCE(SUM(CASE WHEN "paid" = 1 THEN "amount" ELSE 0 END), 0)) AS paid_total
  FROM "payments" WHERE "deleted" = 0 AND "invoice" = OLD."invoice" GROUP BY "invoice"
),
ljson AS (
  SELECT inv, json_group_array(json_object(
           'id', hex(line_id), 'item', hex(item), 'item_name', item_name,
           'qty', qty, 'price', price, 'cost_price', cost_price, 'scheme', scheme,
           'd1', d1, 'd2', d2, 'drs', drs,
           'total', line_rounded, 'total_raw', line_raw) ORDER BY line_id) AS lines
  FROM lt GROUP BY inv
),
pjson AS (
  SELECT pay."invoice" AS inv, json_group_array(json_object(
           'id', hex(pay."id"), 'type', pay."type", 'type_name', pty."name",
           'amount', pay."amount", 'paid', pay."paid",
           'payment_date', pay."payment_date", 'description', pay."description",
           'party', hex(pay."party"), 'party_name', pa."name",
           'paid_to', hex(pay."paid_to"), 'paid_to_name', ob."name")
           ORDER BY pay."id") AS pays
  FROM "payments" pay
  LEFT JOIN "payment_types" pty ON pty."id" = pay."type"
  LEFT JOIN "parties" pa ON pa."id" = pay."party"
  LEFT JOIN "order_bookers" ob ON ob."id" = pay."paid_to"
  WHERE pay."deleted" = 0 AND pay."invoice" = OLD."invoice" GROUP BY pay."invoice"
)
SELECT
  json_object(
    'readable_id', 'inv-' || i."invoiceNo",
    'type', i."type", 'type_name', it."name",
    'invoiceNo', i."invoiceNo",
    'party', hex(i."party"), 'party_name', pa."name", 'party_phone', pa."phone",
    'booker', hex(i."booker"), 'booker_name', ob."name",
    'invoice_maker', hex(i."invoice_maker"),
    'dated', i."dated", 'duedate', i."duedate", 'description', i."description",
    'completed', i."completed",
    'd1', i."discount_1", 'd2', i."discount_2", 'drs', i."discount_rs",
    'total', m.total, 'unrounded_total', m.unrounded_total, 'final_total', m.final_total,
    'paid_total', COALESCE(p.paid_total, 0),
    'remaining', printf('%.2f', CAST(m.final_total AS REAL) - CAST(COALESCE(p.paid_total, 0) AS REAL)),
    'created', i."created", 'updated', i."updated",
    'lines', json(COALESCE(l.lines, '[]')),
    'payments', json(COALESCE(pj.pays, '[]'))
  )
FROM "invoices" i
JOIN money m ON m.inv = i."id"
LEFT JOIN "invoice_types" it ON it."id" = i."type"
LEFT JOIN "parties" pa ON pa."id" = i."party"
LEFT JOIN "order_bookers" ob ON ob."id" = i."booker"
LEFT JOIN paid p ON p.inv = i."id"
LEFT JOIN ljson l ON l.inv = i."id"
LEFT JOIN pjson pj ON pj.inv = i."id"
WHERE i."deleted" = 0) WHERE "id" = OLD."invoice";
END;

CREATE TRIGGER "inv_doc__line_delete" AFTER DELETE ON "transactions" FOR EACH ROW
BEGIN
  UPDATE "inv_doc" SET "doc" = (WITH lt AS (
  SELECT t."invoice" AS inv, t."id" AS line_id, t."item" AS item,
         t."qty" AS qty, t."price" AS price, t."cost_price" AS cost_price,
         t."scheme" AS scheme, t."discount_1" AS d1, t."discount_2" AS d2,
         t."discount_rs" AS drs, it."name" AS item_name,
         printf('%.2f',
           (t."price"*t."qty")*(1-t."discount_1"/100.0)
                           *(1-t."discount_2"/100.0)-t."discount_rs") AS line_rounded,
         (t."price"*t."qty")*(1-t."discount_1"/100.0)
                        *(1-t."discount_2"/100.0)-t."discount_rs" AS line_raw
  FROM "transactions" t
  LEFT JOIN "items" it ON it."id" = t."item"
  WHERE t."deleted" = 0 AND t."invoice" = OLD."invoice"
),
sums AS (
  SELECT i."id" AS inv,
         printf('%.2f', COALESCE(SUM(CAST(lt.line_rounded AS REAL)), 0)) AS total,
         i."discount_1" AS d1, i."discount_2" AS d2, i."discount_rs" AS drs
  FROM "invoices" i LEFT JOIN lt ON lt.inv = i."id"
  WHERE i."id" = OLD."invoice" AND i."deleted" = 0 GROUP BY i."id"
),
money AS (
  SELECT s.inv, s.total, s.d1, s.d2, s.drs,
         printf('%.2f', s.total - (s.total * s.d1 / 100.0)
                              - ((s.total - (s.total * s.d1 / 100.0)) * s.d2 / 100.0))
           AS unrounded_total,
         printf('%.2f', printf('%.2f', s.total - (s.total * s.d1 / 100.0)
                              - ((s.total - (s.total * s.d1 / 100.0)) * s.d2 / 100.0))
                         - s.drs) AS final_total
  FROM sums s
),
paid AS (
  SELECT "invoice" AS inv,
         printf('%.2f', COALESCE(SUM(CASE WHEN "paid" = 1 THEN "amount" ELSE 0 END), 0)) AS paid_total
  FROM "payments" WHERE "deleted" = 0 AND "invoice" = OLD."invoice" GROUP BY "invoice"
),
ljson AS (
  SELECT inv, json_group_array(json_object(
           'id', hex(line_id), 'item', hex(item), 'item_name', item_name,
           'qty', qty, 'price', price, 'cost_price', cost_price, 'scheme', scheme,
           'd1', d1, 'd2', d2, 'drs', drs,
           'total', line_rounded, 'total_raw', line_raw) ORDER BY line_id) AS lines
  FROM lt GROUP BY inv
),
pjson AS (
  SELECT pay."invoice" AS inv, json_group_array(json_object(
           'id', hex(pay."id"), 'type', pay."type", 'type_name', pty."name",
           'amount', pay."amount", 'paid', pay."paid",
           'payment_date', pay."payment_date", 'description', pay."description",
           'party', hex(pay."party"), 'party_name', pa."name",
           'paid_to', hex(pay."paid_to"), 'paid_to_name', ob."name")
           ORDER BY pay."id") AS pays
  FROM "payments" pay
  LEFT JOIN "payment_types" pty ON pty."id" = pay."type"
  LEFT JOIN "parties" pa ON pa."id" = pay."party"
  LEFT JOIN "order_bookers" ob ON ob."id" = pay."paid_to"
  WHERE pay."deleted" = 0 AND pay."invoice" = OLD."invoice" GROUP BY pay."invoice"
)
SELECT
  json_object(
    'readable_id', 'inv-' || i."invoiceNo",
    'type', i."type", 'type_name', it."name",
    'invoiceNo', i."invoiceNo",
    'party', hex(i."party"), 'party_name', pa."name", 'party_phone', pa."phone",
    'booker', hex(i."booker"), 'booker_name', ob."name",
    'invoice_maker', hex(i."invoice_maker"),
    'dated', i."dated", 'duedate', i."duedate", 'description', i."description",
    'completed', i."completed",
    'd1', i."discount_1", 'd2', i."discount_2", 'drs', i."discount_rs",
    'total', m.total, 'unrounded_total', m.unrounded_total, 'final_total', m.final_total,
    'paid_total', COALESCE(p.paid_total, 0),
    'remaining', printf('%.2f', CAST(m.final_total AS REAL) - CAST(COALESCE(p.paid_total, 0) AS REAL)),
    'created', i."created", 'updated', i."updated",
    'lines', json(COALESCE(l.lines, '[]')),
    'payments', json(COALESCE(pj.pays, '[]'))
  )
FROM "invoices" i
JOIN money m ON m.inv = i."id"
LEFT JOIN "invoice_types" it ON it."id" = i."type"
LEFT JOIN "parties" pa ON pa."id" = i."party"
LEFT JOIN "order_bookers" ob ON ob."id" = i."booker"
LEFT JOIN paid p ON p.inv = i."id"
LEFT JOIN ljson l ON l.inv = i."id"
LEFT JOIN pjson pj ON pj.inv = i."id"
WHERE i."deleted" = 0) WHERE "id" = OLD."invoice";
END;

CREATE TRIGGER "inv_doc__payment_insert" AFTER INSERT ON "payments" FOR EACH ROW
WHEN NEW."invoice" IS NOT NULL
BEGIN
  UPDATE "inv_doc" SET "doc" = (WITH lt AS (
  SELECT t."invoice" AS inv, t."id" AS line_id, t."item" AS item,
         t."qty" AS qty, t."price" AS price, t."cost_price" AS cost_price,
         t."scheme" AS scheme, t."discount_1" AS d1, t."discount_2" AS d2,
         t."discount_rs" AS drs, it."name" AS item_name,
         printf('%.2f',
           (t."price"*t."qty")*(1-t."discount_1"/100.0)
                           *(1-t."discount_2"/100.0)-t."discount_rs") AS line_rounded,
         (t."price"*t."qty")*(1-t."discount_1"/100.0)
                        *(1-t."discount_2"/100.0)-t."discount_rs" AS line_raw
  FROM "transactions" t
  LEFT JOIN "items" it ON it."id" = t."item"
  WHERE t."deleted" = 0 AND t."invoice" = NEW."invoice"
),
sums AS (
  SELECT i."id" AS inv,
         printf('%.2f', COALESCE(SUM(CAST(lt.line_rounded AS REAL)), 0)) AS total,
         i."discount_1" AS d1, i."discount_2" AS d2, i."discount_rs" AS drs
  FROM "invoices" i LEFT JOIN lt ON lt.inv = i."id"
  WHERE i."id" = NEW."invoice" AND i."deleted" = 0 GROUP BY i."id"
),
money AS (
  SELECT s.inv, s.total, s.d1, s.d2, s.drs,
         printf('%.2f', s.total - (s.total * s.d1 / 100.0)
                              - ((s.total - (s.total * s.d1 / 100.0)) * s.d2 / 100.0))
           AS unrounded_total,
         printf('%.2f', printf('%.2f', s.total - (s.total * s.d1 / 100.0)
                              - ((s.total - (s.total * s.d1 / 100.0)) * s.d2 / 100.0))
                         - s.drs) AS final_total
  FROM sums s
),
paid AS (
  SELECT "invoice" AS inv,
         printf('%.2f', COALESCE(SUM(CASE WHEN "paid" = 1 THEN "amount" ELSE 0 END), 0)) AS paid_total
  FROM "payments" WHERE "deleted" = 0 AND "invoice" = NEW."invoice" GROUP BY "invoice"
),
ljson AS (
  SELECT inv, json_group_array(json_object(
           'id', hex(line_id), 'item', hex(item), 'item_name', item_name,
           'qty', qty, 'price', price, 'cost_price', cost_price, 'scheme', scheme,
           'd1', d1, 'd2', d2, 'drs', drs,
           'total', line_rounded, 'total_raw', line_raw) ORDER BY line_id) AS lines
  FROM lt GROUP BY inv
),
pjson AS (
  SELECT pay."invoice" AS inv, json_group_array(json_object(
           'id', hex(pay."id"), 'type', pay."type", 'type_name', pty."name",
           'amount', pay."amount", 'paid', pay."paid",
           'payment_date', pay."payment_date", 'description', pay."description",
           'party', hex(pay."party"), 'party_name', pa."name",
           'paid_to', hex(pay."paid_to"), 'paid_to_name', ob."name")
           ORDER BY pay."id") AS pays
  FROM "payments" pay
  LEFT JOIN "payment_types" pty ON pty."id" = pay."type"
  LEFT JOIN "parties" pa ON pa."id" = pay."party"
  LEFT JOIN "order_bookers" ob ON ob."id" = pay."paid_to"
  WHERE pay."deleted" = 0 AND pay."invoice" = NEW."invoice" GROUP BY pay."invoice"
)
SELECT
  json_object(
    'readable_id', 'inv-' || i."invoiceNo",
    'type', i."type", 'type_name', it."name",
    'invoiceNo', i."invoiceNo",
    'party', hex(i."party"), 'party_name', pa."name", 'party_phone', pa."phone",
    'booker', hex(i."booker"), 'booker_name', ob."name",
    'invoice_maker', hex(i."invoice_maker"),
    'dated', i."dated", 'duedate', i."duedate", 'description', i."description",
    'completed', i."completed",
    'd1', i."discount_1", 'd2', i."discount_2", 'drs', i."discount_rs",
    'total', m.total, 'unrounded_total', m.unrounded_total, 'final_total', m.final_total,
    'paid_total', COALESCE(p.paid_total, 0),
    'remaining', printf('%.2f', CAST(m.final_total AS REAL) - CAST(COALESCE(p.paid_total, 0) AS REAL)),
    'created', i."created", 'updated', i."updated",
    'lines', json(COALESCE(l.lines, '[]')),
    'payments', json(COALESCE(pj.pays, '[]'))
  )
FROM "invoices" i
JOIN money m ON m.inv = i."id"
LEFT JOIN "invoice_types" it ON it."id" = i."type"
LEFT JOIN "parties" pa ON pa."id" = i."party"
LEFT JOIN "order_bookers" ob ON ob."id" = i."booker"
LEFT JOIN paid p ON p.inv = i."id"
LEFT JOIN ljson l ON l.inv = i."id"
LEFT JOIN pjson pj ON pj.inv = i."id"
WHERE i."deleted" = 0) WHERE "id" = NEW."invoice";
END;

-- A payment is edited or marked paid: paid_total and remaining both move.
CREATE TRIGGER "inv_doc__payment_update" AFTER UPDATE ON "payments" FOR EACH ROW
BEGIN
  UPDATE "inv_doc" SET "doc" = (WITH lt AS (
  SELECT t."invoice" AS inv, t."id" AS line_id, t."item" AS item,
         t."qty" AS qty, t."price" AS price, t."cost_price" AS cost_price,
         t."scheme" AS scheme, t."discount_1" AS d1, t."discount_2" AS d2,
         t."discount_rs" AS drs, it."name" AS item_name,
         printf('%.2f',
           (t."price"*t."qty")*(1-t."discount_1"/100.0)
                           *(1-t."discount_2"/100.0)-t."discount_rs") AS line_rounded,
         (t."price"*t."qty")*(1-t."discount_1"/100.0)
                        *(1-t."discount_2"/100.0)-t."discount_rs" AS line_raw
  FROM "transactions" t
  LEFT JOIN "items" it ON it."id" = t."item"
  WHERE t."deleted" = 0 AND t."invoice" = NEW."invoice"
),
sums AS (
  SELECT i."id" AS inv,
         printf('%.2f', COALESCE(SUM(CAST(lt.line_rounded AS REAL)), 0)) AS total,
         i."discount_1" AS d1, i."discount_2" AS d2, i."discount_rs" AS drs
  FROM "invoices" i LEFT JOIN lt ON lt.inv = i."id"
  WHERE i."id" = NEW."invoice" AND i."deleted" = 0 GROUP BY i."id"
),
money AS (
  SELECT s.inv, s.total, s.d1, s.d2, s.drs,
         printf('%.2f', s.total - (s.total * s.d1 / 100.0)
                              - ((s.total - (s.total * s.d1 / 100.0)) * s.d2 / 100.0))
           AS unrounded_total,
         printf('%.2f', printf('%.2f', s.total - (s.total * s.d1 / 100.0)
                              - ((s.total - (s.total * s.d1 / 100.0)) * s.d2 / 100.0))
                         - s.drs) AS final_total
  FROM sums s
),
paid AS (
  SELECT "invoice" AS inv,
         printf('%.2f', COALESCE(SUM(CASE WHEN "paid" = 1 THEN "amount" ELSE 0 END), 0)) AS paid_total
  FROM "payments" WHERE "deleted" = 0 AND "invoice" = NEW."invoice" GROUP BY "invoice"
),
ljson AS (
  SELECT inv, json_group_array(json_object(
           'id', hex(line_id), 'item', hex(item), 'item_name', item_name,
           'qty', qty, 'price', price, 'cost_price', cost_price, 'scheme', scheme,
           'd1', d1, 'd2', d2, 'drs', drs,
           'total', line_rounded, 'total_raw', line_raw) ORDER BY line_id) AS lines
  FROM lt GROUP BY inv
),
pjson AS (
  SELECT pay."invoice" AS inv, json_group_array(json_object(
           'id', hex(pay."id"), 'type', pay."type", 'type_name', pty."name",
           'amount', pay."amount", 'paid', pay."paid",
           'payment_date', pay."payment_date", 'description', pay."description",
           'party', hex(pay."party"), 'party_name', pa."name",
           'paid_to', hex(pay."paid_to"), 'paid_to_name', ob."name")
           ORDER BY pay."id") AS pays
  FROM "payments" pay
  LEFT JOIN "payment_types" pty ON pty."id" = pay."type"
  LEFT JOIN "parties" pa ON pa."id" = pay."party"
  LEFT JOIN "order_bookers" ob ON ob."id" = pay."paid_to"
  WHERE pay."deleted" = 0 AND pay."invoice" = NEW."invoice" GROUP BY pay."invoice"
)
SELECT
  json_object(
    'readable_id', 'inv-' || i."invoiceNo",
    'type', i."type", 'type_name', it."name",
    'invoiceNo', i."invoiceNo",
    'party', hex(i."party"), 'party_name', pa."name", 'party_phone', pa."phone",
    'booker', hex(i."booker"), 'booker_name', ob."name",
    'invoice_maker', hex(i."invoice_maker"),
    'dated', i."dated", 'duedate', i."duedate", 'description', i."description",
    'completed', i."completed",
    'd1', i."discount_1", 'd2', i."discount_2", 'drs', i."discount_rs",
    'total', m.total, 'unrounded_total', m.unrounded_total, 'final_total', m.final_total,
    'paid_total', COALESCE(p.paid_total, 0),
    'remaining', printf('%.2f', CAST(m.final_total AS REAL) - CAST(COALESCE(p.paid_total, 0) AS REAL)),
    'created', i."created", 'updated', i."updated",
    'lines', json(COALESCE(l.lines, '[]')),
    'payments', json(COALESCE(pj.pays, '[]'))
  )
FROM "invoices" i
JOIN money m ON m.inv = i."id"
LEFT JOIN "invoice_types" it ON it."id" = i."type"
LEFT JOIN "parties" pa ON pa."id" = i."party"
LEFT JOIN "order_bookers" ob ON ob."id" = i."booker"
LEFT JOIN paid p ON p.inv = i."id"
LEFT JOIN ljson l ON l.inv = i."id"
LEFT JOIN pjson pj ON pj.inv = i."id"
WHERE i."deleted" = 0) WHERE "id" = NEW."invoice";
END;

CREATE TRIGGER "inv_doc__payment_reassigned" AFTER UPDATE ON "payments" FOR EACH ROW
WHEN OLD."invoice" IS NOT NEW."invoice"
BEGIN
  UPDATE "inv_doc" SET "doc" = (WITH lt AS (
  SELECT t."invoice" AS inv, t."id" AS line_id, t."item" AS item,
         t."qty" AS qty, t."price" AS price, t."cost_price" AS cost_price,
         t."scheme" AS scheme, t."discount_1" AS d1, t."discount_2" AS d2,
         t."discount_rs" AS drs, it."name" AS item_name,
         printf('%.2f',
           (t."price"*t."qty")*(1-t."discount_1"/100.0)
                           *(1-t."discount_2"/100.0)-t."discount_rs") AS line_rounded,
         (t."price"*t."qty")*(1-t."discount_1"/100.0)
                        *(1-t."discount_2"/100.0)-t."discount_rs" AS line_raw
  FROM "transactions" t
  LEFT JOIN "items" it ON it."id" = t."item"
  WHERE t."deleted" = 0 AND t."invoice" = OLD."invoice"
),
sums AS (
  SELECT i."id" AS inv,
         printf('%.2f', COALESCE(SUM(CAST(lt.line_rounded AS REAL)), 0)) AS total,
         i."discount_1" AS d1, i."discount_2" AS d2, i."discount_rs" AS drs
  FROM "invoices" i LEFT JOIN lt ON lt.inv = i."id"
  WHERE i."id" = OLD."invoice" AND i."deleted" = 0 GROUP BY i."id"
),
money AS (
  SELECT s.inv, s.total, s.d1, s.d2, s.drs,
         printf('%.2f', s.total - (s.total * s.d1 / 100.0)
                              - ((s.total - (s.total * s.d1 / 100.0)) * s.d2 / 100.0))
           AS unrounded_total,
         printf('%.2f', printf('%.2f', s.total - (s.total * s.d1 / 100.0)
                              - ((s.total - (s.total * s.d1 / 100.0)) * s.d2 / 100.0))
                         - s.drs) AS final_total
  FROM sums s
),
paid AS (
  SELECT "invoice" AS inv,
         printf('%.2f', COALESCE(SUM(CASE WHEN "paid" = 1 THEN "amount" ELSE 0 END), 0)) AS paid_total
  FROM "payments" WHERE "deleted" = 0 AND "invoice" = OLD."invoice" GROUP BY "invoice"
),
ljson AS (
  SELECT inv, json_group_array(json_object(
           'id', hex(line_id), 'item', hex(item), 'item_name', item_name,
           'qty', qty, 'price', price, 'cost_price', cost_price, 'scheme', scheme,
           'd1', d1, 'd2', d2, 'drs', drs,
           'total', line_rounded, 'total_raw', line_raw) ORDER BY line_id) AS lines
  FROM lt GROUP BY inv
),
pjson AS (
  SELECT pay."invoice" AS inv, json_group_array(json_object(
           'id', hex(pay."id"), 'type', pay."type", 'type_name', pty."name",
           'amount', pay."amount", 'paid', pay."paid",
           'payment_date', pay."payment_date", 'description', pay."description",
           'party', hex(pay."party"), 'party_name', pa."name",
           'paid_to', hex(pay."paid_to"), 'paid_to_name', ob."name")
           ORDER BY pay."id") AS pays
  FROM "payments" pay
  LEFT JOIN "payment_types" pty ON pty."id" = pay."type"
  LEFT JOIN "parties" pa ON pa."id" = pay."party"
  LEFT JOIN "order_bookers" ob ON ob."id" = pay."paid_to"
  WHERE pay."deleted" = 0 AND pay."invoice" = OLD."invoice" GROUP BY pay."invoice"
)
SELECT
  json_object(
    'readable_id', 'inv-' || i."invoiceNo",
    'type', i."type", 'type_name', it."name",
    'invoiceNo', i."invoiceNo",
    'party', hex(i."party"), 'party_name', pa."name", 'party_phone', pa."phone",
    'booker', hex(i."booker"), 'booker_name', ob."name",
    'invoice_maker', hex(i."invoice_maker"),
    'dated', i."dated", 'duedate', i."duedate", 'description', i."description",
    'completed', i."completed",
    'd1', i."discount_1", 'd2', i."discount_2", 'drs', i."discount_rs",
    'total', m.total, 'unrounded_total', m.unrounded_total, 'final_total', m.final_total,
    'paid_total', COALESCE(p.paid_total, 0),
    'remaining', printf('%.2f', CAST(m.final_total AS REAL) - CAST(COALESCE(p.paid_total, 0) AS REAL)),
    'created', i."created", 'updated', i."updated",
    'lines', json(COALESCE(l.lines, '[]')),
    'payments', json(COALESCE(pj.pays, '[]'))
  )
FROM "invoices" i
JOIN money m ON m.inv = i."id"
LEFT JOIN "invoice_types" it ON it."id" = i."type"
LEFT JOIN "parties" pa ON pa."id" = i."party"
LEFT JOIN "order_bookers" ob ON ob."id" = i."booker"
LEFT JOIN paid p ON p.inv = i."id"
LEFT JOIN ljson l ON l.inv = i."id"
LEFT JOIN pjson pj ON pj.inv = i."id"
WHERE i."deleted" = 0) WHERE "id" = OLD."invoice";
END;

-- A deleted payment leaves an invoice with fewer payments, not with no document.
CREATE TRIGGER "inv_doc__payment_delete" AFTER DELETE ON "payments" FOR EACH ROW
BEGIN
  UPDATE "inv_doc" SET "doc" = (WITH lt AS (
  SELECT t."invoice" AS inv, t."id" AS line_id, t."item" AS item,
         t."qty" AS qty, t."price" AS price, t."cost_price" AS cost_price,
         t."scheme" AS scheme, t."discount_1" AS d1, t."discount_2" AS d2,
         t."discount_rs" AS drs, it."name" AS item_name,
         printf('%.2f',
           (t."price"*t."qty")*(1-t."discount_1"/100.0)
                           *(1-t."discount_2"/100.0)-t."discount_rs") AS line_rounded,
         (t."price"*t."qty")*(1-t."discount_1"/100.0)
                        *(1-t."discount_2"/100.0)-t."discount_rs" AS line_raw
  FROM "transactions" t
  LEFT JOIN "items" it ON it."id" = t."item"
  WHERE t."deleted" = 0 AND t."invoice" = OLD."invoice"
),
sums AS (
  SELECT i."id" AS inv,
         printf('%.2f', COALESCE(SUM(CAST(lt.line_rounded AS REAL)), 0)) AS total,
         i."discount_1" AS d1, i."discount_2" AS d2, i."discount_rs" AS drs
  FROM "invoices" i LEFT JOIN lt ON lt.inv = i."id"
  WHERE i."id" = OLD."invoice" AND i."deleted" = 0 GROUP BY i."id"
),
money AS (
  SELECT s.inv, s.total, s.d1, s.d2, s.drs,
         printf('%.2f', s.total - (s.total * s.d1 / 100.0)
                              - ((s.total - (s.total * s.d1 / 100.0)) * s.d2 / 100.0))
           AS unrounded_total,
         printf('%.2f', printf('%.2f', s.total - (s.total * s.d1 / 100.0)
                              - ((s.total - (s.total * s.d1 / 100.0)) * s.d2 / 100.0))
                         - s.drs) AS final_total
  FROM sums s
),
paid AS (
  SELECT "invoice" AS inv,
         printf('%.2f', COALESCE(SUM(CASE WHEN "paid" = 1 THEN "amount" ELSE 0 END), 0)) AS paid_total
  FROM "payments" WHERE "deleted" = 0 AND "invoice" = OLD."invoice" GROUP BY "invoice"
),
ljson AS (
  SELECT inv, json_group_array(json_object(
           'id', hex(line_id), 'item', hex(item), 'item_name', item_name,
           'qty', qty, 'price', price, 'cost_price', cost_price, 'scheme', scheme,
           'd1', d1, 'd2', d2, 'drs', drs,
           'total', line_rounded, 'total_raw', line_raw) ORDER BY line_id) AS lines
  FROM lt GROUP BY inv
),
pjson AS (
  SELECT pay."invoice" AS inv, json_group_array(json_object(
           'id', hex(pay."id"), 'type', pay."type", 'type_name', pty."name",
           'amount', pay."amount", 'paid', pay."paid",
           'payment_date', pay."payment_date", 'description', pay."description",
           'party', hex(pay."party"), 'party_name', pa."name",
           'paid_to', hex(pay."paid_to"), 'paid_to_name', ob."name")
           ORDER BY pay."id") AS pays
  FROM "payments" pay
  LEFT JOIN "payment_types" pty ON pty."id" = pay."type"
  LEFT JOIN "parties" pa ON pa."id" = pay."party"
  LEFT JOIN "order_bookers" ob ON ob."id" = pay."paid_to"
  WHERE pay."deleted" = 0 AND pay."invoice" = OLD."invoice" GROUP BY pay."invoice"
)
SELECT
  json_object(
    'readable_id', 'inv-' || i."invoiceNo",
    'type', i."type", 'type_name', it."name",
    'invoiceNo', i."invoiceNo",
    'party', hex(i."party"), 'party_name', pa."name", 'party_phone', pa."phone",
    'booker', hex(i."booker"), 'booker_name', ob."name",
    'invoice_maker', hex(i."invoice_maker"),
    'dated', i."dated", 'duedate', i."duedate", 'description', i."description",
    'completed', i."completed",
    'd1', i."discount_1", 'd2', i."discount_2", 'drs', i."discount_rs",
    'total', m.total, 'unrounded_total', m.unrounded_total, 'final_total', m.final_total,
    'paid_total', COALESCE(p.paid_total, 0),
    'remaining', printf('%.2f', CAST(m.final_total AS REAL) - CAST(COALESCE(p.paid_total, 0) AS REAL)),
    'created', i."created", 'updated', i."updated",
    'lines', json(COALESCE(l.lines, '[]')),
    'payments', json(COALESCE(pj.pays, '[]'))
  )
FROM "invoices" i
JOIN money m ON m.inv = i."id"
LEFT JOIN "invoice_types" it ON it."id" = i."type"
LEFT JOIN "parties" pa ON pa."id" = i."party"
LEFT JOIN "order_bookers" ob ON ob."id" = i."booker"
LEFT JOIN paid p ON p.inv = i."id"
LEFT JOIN ljson l ON l.inv = i."id"
LEFT JOIN pjson pj ON pj.inv = i."id"
WHERE i."deleted" = 0) WHERE "id" = OLD."invoice";
END;

-- A new invoice: the document is created here, so the first line already finds one.
CREATE TRIGGER "inv_doc__invoice_insert" AFTER INSERT ON "invoices" FOR EACH ROW
WHEN NEW."deleted" = 0
BEGIN
  INSERT INTO "inv_doc" ("id", "doc") WITH lt AS (
  SELECT t."invoice" AS inv, t."id" AS line_id, t."item" AS item,
         t."qty" AS qty, t."price" AS price, t."cost_price" AS cost_price,
         t."scheme" AS scheme, t."discount_1" AS d1, t."discount_2" AS d2,
         t."discount_rs" AS drs, it."name" AS item_name,
         printf('%.2f',
           (t."price"*t."qty")*(1-t."discount_1"/100.0)
                           *(1-t."discount_2"/100.0)-t."discount_rs") AS line_rounded,
         (t."price"*t."qty")*(1-t."discount_1"/100.0)
                        *(1-t."discount_2"/100.0)-t."discount_rs" AS line_raw
  FROM "transactions" t
  LEFT JOIN "items" it ON it."id" = t."item"
  WHERE t."deleted" = 0 AND t."invoice" = NEW."id"
),
sums AS (
  SELECT i."id" AS inv,
         printf('%.2f', COALESCE(SUM(CAST(lt.line_rounded AS REAL)), 0)) AS total,
         i."discount_1" AS d1, i."discount_2" AS d2, i."discount_rs" AS drs
  FROM "invoices" i LEFT JOIN lt ON lt.inv = i."id"
  WHERE i."id" = NEW."id" AND i."deleted" = 0 GROUP BY i."id"
),
money AS (
  SELECT s.inv, s.total, s.d1, s.d2, s.drs,
         printf('%.2f', s.total - (s.total * s.d1 / 100.0)
                              - ((s.total - (s.total * s.d1 / 100.0)) * s.d2 / 100.0))
           AS unrounded_total,
         printf('%.2f', printf('%.2f', s.total - (s.total * s.d1 / 100.0)
                              - ((s.total - (s.total * s.d1 / 100.0)) * s.d2 / 100.0))
                         - s.drs) AS final_total
  FROM sums s
),
paid AS (
  SELECT "invoice" AS inv,
         printf('%.2f', COALESCE(SUM(CASE WHEN "paid" = 1 THEN "amount" ELSE 0 END), 0)) AS paid_total
  FROM "payments" WHERE "deleted" = 0 AND "invoice" = NEW."id" GROUP BY "invoice"
),
ljson AS (
  SELECT inv, json_group_array(json_object(
           'id', hex(line_id), 'item', hex(item), 'item_name', item_name,
           'qty', qty, 'price', price, 'cost_price', cost_price, 'scheme', scheme,
           'd1', d1, 'd2', d2, 'drs', drs,
           'total', line_rounded, 'total_raw', line_raw) ORDER BY line_id) AS lines
  FROM lt GROUP BY inv
),
pjson AS (
  SELECT pay."invoice" AS inv, json_group_array(json_object(
           'id', hex(pay."id"), 'type', pay."type", 'type_name', pty."name",
           'amount', pay."amount", 'paid', pay."paid",
           'payment_date', pay."payment_date", 'description', pay."description",
           'party', hex(pay."party"), 'party_name', pa."name",
           'paid_to', hex(pay."paid_to"), 'paid_to_name', ob."name")
           ORDER BY pay."id") AS pays
  FROM "payments" pay
  LEFT JOIN "payment_types" pty ON pty."id" = pay."type"
  LEFT JOIN "parties" pa ON pa."id" = pay."party"
  LEFT JOIN "order_bookers" ob ON ob."id" = pay."paid_to"
  WHERE pay."deleted" = 0 AND pay."invoice" = NEW."id" GROUP BY pay."invoice"
)

  SELECT NEW."id", json_object(
    'readable_id', 'inv-' || i."invoiceNo",
    'type', i."type", 'type_name', it."name",
    'invoiceNo', i."invoiceNo",
    'party', hex(i."party"), 'party_name', pa."name", 'party_phone', pa."phone",
    'booker', hex(i."booker"), 'booker_name', ob."name",
    'invoice_maker', hex(i."invoice_maker"),
    'dated', i."dated", 'duedate', i."duedate", 'description', i."description",
    'completed', i."completed",
    'd1', i."discount_1", 'd2', i."discount_2", 'drs', i."discount_rs",
    'total', m.total, 'unrounded_total', m.unrounded_total, 'final_total', m.final_total,
    'paid_total', COALESCE(p.paid_total, 0),
    'remaining', printf('%.2f', CAST(m.final_total AS REAL) - CAST(COALESCE(p.paid_total, 0) AS REAL)),
    'created', i."created", 'updated', i."updated",
    'lines', json(COALESCE(l.lines, '[]')),
    'payments', json(COALESCE(pj.pays, '[]'))
  )
FROM "invoices" i
JOIN money m ON m.inv = i."id"
LEFT JOIN "invoice_types" it ON it."id" = i."type"
LEFT JOIN "parties" pa ON pa."id" = i."party"
LEFT JOIN "order_bookers" ob ON ob."id" = i."booker"
LEFT JOIN paid p ON p.inv = i."id"
LEFT JOIN ljson l ON l.inv = i."id"
LEFT JOIN pjson pj ON pj.inv = i."id"
WHERE i."deleted" = 0
  ON CONFLICT("id") DO UPDATE SET "doc" = excluded."doc";
END;

-- Header, discounts, dates, completed flag -- and the way back from a soft delete,
-- so this is an upsert rather than a bare UPDATE. A bare UPDATE would find no row
-- to fix for a restored invoice, because the hidden trigger below removed it.
CREATE TRIGGER "inv_doc__invoice_update" AFTER UPDATE ON "invoices" FOR EACH ROW
WHEN NEW."deleted" = 0
BEGIN
  INSERT INTO "inv_doc" ("id", "doc") WITH lt AS (
  SELECT t."invoice" AS inv, t."id" AS line_id, t."item" AS item,
         t."qty" AS qty, t."price" AS price, t."cost_price" AS cost_price,
         t."scheme" AS scheme, t."discount_1" AS d1, t."discount_2" AS d2,
         t."discount_rs" AS drs, it."name" AS item_name,
         printf('%.2f',
           (t."price"*t."qty")*(1-t."discount_1"/100.0)
                           *(1-t."discount_2"/100.0)-t."discount_rs") AS line_rounded,
         (t."price"*t."qty")*(1-t."discount_1"/100.0)
                        *(1-t."discount_2"/100.0)-t."discount_rs" AS line_raw
  FROM "transactions" t
  LEFT JOIN "items" it ON it."id" = t."item"
  WHERE t."deleted" = 0 AND t."invoice" = NEW."id"
),
sums AS (
  SELECT i."id" AS inv,
         printf('%.2f', COALESCE(SUM(CAST(lt.line_rounded AS REAL)), 0)) AS total,
         i."discount_1" AS d1, i."discount_2" AS d2, i."discount_rs" AS drs
  FROM "invoices" i LEFT JOIN lt ON lt.inv = i."id"
  WHERE i."id" = NEW."id" AND i."deleted" = 0 GROUP BY i."id"
),
money AS (
  SELECT s.inv, s.total, s.d1, s.d2, s.drs,
         printf('%.2f', s.total - (s.total * s.d1 / 100.0)
                              - ((s.total - (s.total * s.d1 / 100.0)) * s.d2 / 100.0))
           AS unrounded_total,
         printf('%.2f', printf('%.2f', s.total - (s.total * s.d1 / 100.0)
                              - ((s.total - (s.total * s.d1 / 100.0)) * s.d2 / 100.0))
                         - s.drs) AS final_total
  FROM sums s
),
paid AS (
  SELECT "invoice" AS inv,
         printf('%.2f', COALESCE(SUM(CASE WHEN "paid" = 1 THEN "amount" ELSE 0 END), 0)) AS paid_total
  FROM "payments" WHERE "deleted" = 0 AND "invoice" = NEW."id" GROUP BY "invoice"
),
ljson AS (
  SELECT inv, json_group_array(json_object(
           'id', hex(line_id), 'item', hex(item), 'item_name', item_name,
           'qty', qty, 'price', price, 'cost_price', cost_price, 'scheme', scheme,
           'd1', d1, 'd2', d2, 'drs', drs,
           'total', line_rounded, 'total_raw', line_raw) ORDER BY line_id) AS lines
  FROM lt GROUP BY inv
),
pjson AS (
  SELECT pay."invoice" AS inv, json_group_array(json_object(
           'id', hex(pay."id"), 'type', pay."type", 'type_name', pty."name",
           'amount', pay."amount", 'paid', pay."paid",
           'payment_date', pay."payment_date", 'description', pay."description",
           'party', hex(pay."party"), 'party_name', pa."name",
           'paid_to', hex(pay."paid_to"), 'paid_to_name', ob."name")
           ORDER BY pay."id") AS pays
  FROM "payments" pay
  LEFT JOIN "payment_types" pty ON pty."id" = pay."type"
  LEFT JOIN "parties" pa ON pa."id" = pay."party"
  LEFT JOIN "order_bookers" ob ON ob."id" = pay."paid_to"
  WHERE pay."deleted" = 0 AND pay."invoice" = NEW."id" GROUP BY pay."invoice"
)

  SELECT NEW."id", json_object(
    'readable_id', 'inv-' || i."invoiceNo",
    'type', i."type", 'type_name', it."name",
    'invoiceNo', i."invoiceNo",
    'party', hex(i."party"), 'party_name', pa."name", 'party_phone', pa."phone",
    'booker', hex(i."booker"), 'booker_name', ob."name",
    'invoice_maker', hex(i."invoice_maker"),
    'dated', i."dated", 'duedate', i."duedate", 'description', i."description",
    'completed', i."completed",
    'd1', i."discount_1", 'd2', i."discount_2", 'drs', i."discount_rs",
    'total', m.total, 'unrounded_total', m.unrounded_total, 'final_total', m.final_total,
    'paid_total', COALESCE(p.paid_total, 0),
    'remaining', printf('%.2f', CAST(m.final_total AS REAL) - CAST(COALESCE(p.paid_total, 0) AS REAL)),
    'created', i."created", 'updated', i."updated",
    'lines', json(COALESCE(l.lines, '[]')),
    'payments', json(COALESCE(pj.pays, '[]'))
  )
FROM "invoices" i
JOIN money m ON m.inv = i."id"
LEFT JOIN "invoice_types" it ON it."id" = i."type"
LEFT JOIN "parties" pa ON pa."id" = i."party"
LEFT JOIN "order_bookers" ob ON ob."id" = i."booker"
LEFT JOIN paid p ON p.inv = i."id"
LEFT JOIN ljson l ON l.inv = i."id"
LEFT JOIN pjson pj ON pj.inv = i."id"
WHERE i."deleted" = 0
  ON CONFLICT("id") DO UPDATE SET "doc" = excluded."doc";
END;

-- A soft-deleted invoice is not a document. Without this the narrowing above
-- returns no row for it, and the UPDATE would store NULL into a NOT NULL column.
CREATE TRIGGER "inv_doc__invoice_hidden" AFTER UPDATE OF "deleted" ON "invoices" FOR EACH ROW
WHEN NEW."deleted" = 1
BEGIN
  DELETE FROM "inv_doc" WHERE "id" = NEW."id";
END;

-- A hard-deleted invoice takes its document with it through the ON DELETE CASCADE
-- declared in U1790300300, so there is no delete trigger to add here.


-- ===========================================================================
-- 6. RENAMES.
--
-- The document is denormalised on purpose -- it carries party/item/booker/type
-- names so that reading one invoice needs no join at all. A rename therefore has
-- to reach every document quoting the old name.
--
-- These re-derive the affected documents with the same build statement rather
-- than patching the one field that changed. That is a deliberate trade: a name
-- patch is ~2x cheaper (444 ms vs 1,213 ms for the worst item) but it is a
-- SECOND copy of the document's field list, and a field added to section 2
-- without updating the patch would leave a stale name in the document with no
-- error. Re-deriving cannot drift. The cost is a one-off of 1-5 s on a master-data
-- edit, against a per-invoice read that must not join.
--
-- `transactions.item` is the index that makes the item case cheap; a `json_each`
-- scan over every document instead measured 823 ms for the same 1,063 documents.
-- ===========================================================================

CREATE TRIGGER "inv_doc__item_renamed" AFTER UPDATE OF "name" ON "items" FOR EACH ROW
WHEN NEW."name" IS NOT OLD."name"
BEGIN
  UPDATE "inv_doc" SET "doc" = (WITH lt AS (
  SELECT t."invoice" AS inv, t."id" AS line_id, t."item" AS item,
         t."qty" AS qty, t."price" AS price, t."cost_price" AS cost_price,
         t."scheme" AS scheme, t."discount_1" AS d1, t."discount_2" AS d2,
         t."discount_rs" AS drs, it."name" AS item_name,
         printf('%.2f',
           (t."price"*t."qty")*(1-t."discount_1"/100.0)
                           *(1-t."discount_2"/100.0)-t."discount_rs") AS line_rounded,
         (t."price"*t."qty")*(1-t."discount_1"/100.0)
                        *(1-t."discount_2"/100.0)-t."discount_rs" AS line_raw
  FROM "transactions" t
  LEFT JOIN "items" it ON it."id" = t."item"
  WHERE t."deleted" = 0 AND t."invoice" = "inv_doc"."id"
),
sums AS (
  SELECT i."id" AS inv,
         printf('%.2f', COALESCE(SUM(CAST(lt.line_rounded AS REAL)), 0)) AS total,
         i."discount_1" AS d1, i."discount_2" AS d2, i."discount_rs" AS drs
  FROM "invoices" i LEFT JOIN lt ON lt.inv = i."id"
  WHERE i."id" = "inv_doc"."id" AND i."deleted" = 0 GROUP BY i."id"
),
money AS (
  SELECT s.inv, s.total, s.d1, s.d2, s.drs,
         printf('%.2f', s.total - (s.total * s.d1 / 100.0)
                              - ((s.total - (s.total * s.d1 / 100.0)) * s.d2 / 100.0))
           AS unrounded_total,
         printf('%.2f', printf('%.2f', s.total - (s.total * s.d1 / 100.0)
                              - ((s.total - (s.total * s.d1 / 100.0)) * s.d2 / 100.0))
                         - s.drs) AS final_total
  FROM sums s
),
paid AS (
  SELECT "invoice" AS inv,
         printf('%.2f', COALESCE(SUM(CASE WHEN "paid" = 1 THEN "amount" ELSE 0 END), 0)) AS paid_total
  FROM "payments" WHERE "deleted" = 0 AND "invoice" = "inv_doc"."id" GROUP BY "invoice"
),
ljson AS (
  SELECT inv, json_group_array(json_object(
           'id', hex(line_id), 'item', hex(item), 'item_name', item_name,
           'qty', qty, 'price', price, 'cost_price', cost_price, 'scheme', scheme,
           'd1', d1, 'd2', d2, 'drs', drs,
           'total', line_rounded, 'total_raw', line_raw) ORDER BY line_id) AS lines
  FROM lt GROUP BY inv
),
pjson AS (
  SELECT pay."invoice" AS inv, json_group_array(json_object(
           'id', hex(pay."id"), 'type', pay."type", 'type_name', pty."name",
           'amount', pay."amount", 'paid', pay."paid",
           'payment_date', pay."payment_date", 'description', pay."description",
           'party', hex(pay."party"), 'party_name', pa."name",
           'paid_to', hex(pay."paid_to"), 'paid_to_name', ob."name")
           ORDER BY pay."id") AS pays
  FROM "payments" pay
  LEFT JOIN "payment_types" pty ON pty."id" = pay."type"
  LEFT JOIN "parties" pa ON pa."id" = pay."party"
  LEFT JOIN "order_bookers" ob ON ob."id" = pay."paid_to"
  WHERE pay."deleted" = 0 AND pay."invoice" = "inv_doc"."id" GROUP BY pay."invoice"
)
SELECT
  json_object(
    'readable_id', 'inv-' || i."invoiceNo",
    'type', i."type", 'type_name', it."name",
    'invoiceNo', i."invoiceNo",
    'party', hex(i."party"), 'party_name', pa."name", 'party_phone', pa."phone",
    'booker', hex(i."booker"), 'booker_name', ob."name",
    'invoice_maker', hex(i."invoice_maker"),
    'dated', i."dated", 'duedate', i."duedate", 'description', i."description",
    'completed', i."completed",
    'd1', i."discount_1", 'd2', i."discount_2", 'drs', i."discount_rs",
    'total', m.total, 'unrounded_total', m.unrounded_total, 'final_total', m.final_total,
    'paid_total', COALESCE(p.paid_total, 0),
    'remaining', printf('%.2f', CAST(m.final_total AS REAL) - CAST(COALESCE(p.paid_total, 0) AS REAL)),
    'created', i."created", 'updated', i."updated",
    'lines', json(COALESCE(l.lines, '[]')),
    'payments', json(COALESCE(pj.pays, '[]'))
  )
FROM "invoices" i
JOIN money m ON m.inv = i."id"
LEFT JOIN "invoice_types" it ON it."id" = i."type"
LEFT JOIN "parties" pa ON pa."id" = i."party"
LEFT JOIN "order_bookers" ob ON ob."id" = i."booker"
LEFT JOIN paid p ON p.inv = i."id"
LEFT JOIN ljson l ON l.inv = i."id"
LEFT JOIN pjson pj ON pj.inv = i."id"
WHERE i."deleted" = 0)
  WHERE "id" IN (SELECT "invoice" FROM "transactions" WHERE "item" = NEW."id" AND "deleted" = 0);
END;

CREATE TRIGGER "inv_doc__party_renamed" AFTER UPDATE OF "name", "phone" ON "parties" FOR EACH ROW
WHEN NEW."name" IS NOT OLD."name" OR NEW."phone" IS NOT OLD."phone"
BEGIN
  UPDATE "inv_doc" SET "doc" = (WITH lt AS (
  SELECT t."invoice" AS inv, t."id" AS line_id, t."item" AS item,
         t."qty" AS qty, t."price" AS price, t."cost_price" AS cost_price,
         t."scheme" AS scheme, t."discount_1" AS d1, t."discount_2" AS d2,
         t."discount_rs" AS drs, it."name" AS item_name,
         printf('%.2f',
           (t."price"*t."qty")*(1-t."discount_1"/100.0)
                           *(1-t."discount_2"/100.0)-t."discount_rs") AS line_rounded,
         (t."price"*t."qty")*(1-t."discount_1"/100.0)
                        *(1-t."discount_2"/100.0)-t."discount_rs" AS line_raw
  FROM "transactions" t
  LEFT JOIN "items" it ON it."id" = t."item"
  WHERE t."deleted" = 0 AND t."invoice" = "inv_doc"."id"
),
sums AS (
  SELECT i."id" AS inv,
         printf('%.2f', COALESCE(SUM(CAST(lt.line_rounded AS REAL)), 0)) AS total,
         i."discount_1" AS d1, i."discount_2" AS d2, i."discount_rs" AS drs
  FROM "invoices" i LEFT JOIN lt ON lt.inv = i."id"
  WHERE i."id" = "inv_doc"."id" AND i."deleted" = 0 GROUP BY i."id"
),
money AS (
  SELECT s.inv, s.total, s.d1, s.d2, s.drs,
         printf('%.2f', s.total - (s.total * s.d1 / 100.0)
                              - ((s.total - (s.total * s.d1 / 100.0)) * s.d2 / 100.0))
           AS unrounded_total,
         printf('%.2f', printf('%.2f', s.total - (s.total * s.d1 / 100.0)
                              - ((s.total - (s.total * s.d1 / 100.0)) * s.d2 / 100.0))
                         - s.drs) AS final_total
  FROM sums s
),
paid AS (
  SELECT "invoice" AS inv,
         printf('%.2f', COALESCE(SUM(CASE WHEN "paid" = 1 THEN "amount" ELSE 0 END), 0)) AS paid_total
  FROM "payments" WHERE "deleted" = 0 AND "invoice" = "inv_doc"."id" GROUP BY "invoice"
),
ljson AS (
  SELECT inv, json_group_array(json_object(
           'id', hex(line_id), 'item', hex(item), 'item_name', item_name,
           'qty', qty, 'price', price, 'cost_price', cost_price, 'scheme', scheme,
           'd1', d1, 'd2', d2, 'drs', drs,
           'total', line_rounded, 'total_raw', line_raw) ORDER BY line_id) AS lines
  FROM lt GROUP BY inv
),
pjson AS (
  SELECT pay."invoice" AS inv, json_group_array(json_object(
           'id', hex(pay."id"), 'type', pay."type", 'type_name', pty."name",
           'amount', pay."amount", 'paid', pay."paid",
           'payment_date', pay."payment_date", 'description', pay."description",
           'party', hex(pay."party"), 'party_name', pa."name",
           'paid_to', hex(pay."paid_to"), 'paid_to_name', ob."name")
           ORDER BY pay."id") AS pays
  FROM "payments" pay
  LEFT JOIN "payment_types" pty ON pty."id" = pay."type"
  LEFT JOIN "parties" pa ON pa."id" = pay."party"
  LEFT JOIN "order_bookers" ob ON ob."id" = pay."paid_to"
  WHERE pay."deleted" = 0 AND pay."invoice" = "inv_doc"."id" GROUP BY pay."invoice"
)
SELECT
  json_object(
    'readable_id', 'inv-' || i."invoiceNo",
    'type', i."type", 'type_name', it."name",
    'invoiceNo', i."invoiceNo",
    'party', hex(i."party"), 'party_name', pa."name", 'party_phone', pa."phone",
    'booker', hex(i."booker"), 'booker_name', ob."name",
    'invoice_maker', hex(i."invoice_maker"),
    'dated', i."dated", 'duedate', i."duedate", 'description', i."description",
    'completed', i."completed",
    'd1', i."discount_1", 'd2', i."discount_2", 'drs', i."discount_rs",
    'total', m.total, 'unrounded_total', m.unrounded_total, 'final_total', m.final_total,
    'paid_total', COALESCE(p.paid_total, 0),
    'remaining', printf('%.2f', CAST(m.final_total AS REAL) - CAST(COALESCE(p.paid_total, 0) AS REAL)),
    'created', i."created", 'updated', i."updated",
    'lines', json(COALESCE(l.lines, '[]')),
    'payments', json(COALESCE(pj.pays, '[]'))
  )
FROM "invoices" i
JOIN money m ON m.inv = i."id"
LEFT JOIN "invoice_types" it ON it."id" = i."type"
LEFT JOIN "parties" pa ON pa."id" = i."party"
LEFT JOIN "order_bookers" ob ON ob."id" = i."booker"
LEFT JOIN paid p ON p.inv = i."id"
LEFT JOIN ljson l ON l.inv = i."id"
LEFT JOIN pjson pj ON pj.inv = i."id"
WHERE i."deleted" = 0)
  WHERE "id" IN (SELECT "id" FROM "invoices" WHERE "party" = NEW."id")
     OR "id" IN (SELECT "invoice" FROM "payments" WHERE "party" = NEW."id" AND "invoice" IS NOT NULL);
END;

CREATE TRIGGER "inv_doc__booker_renamed" AFTER UPDATE OF "name" ON "order_bookers" FOR EACH ROW
WHEN NEW."name" IS NOT OLD."name"
BEGIN
  UPDATE "inv_doc" SET "doc" = (WITH lt AS (
  SELECT t."invoice" AS inv, t."id" AS line_id, t."item" AS item,
         t."qty" AS qty, t."price" AS price, t."cost_price" AS cost_price,
         t."scheme" AS scheme, t."discount_1" AS d1, t."discount_2" AS d2,
         t."discount_rs" AS drs, it."name" AS item_name,
         printf('%.2f',
           (t."price"*t."qty")*(1-t."discount_1"/100.0)
                           *(1-t."discount_2"/100.0)-t."discount_rs") AS line_rounded,
         (t."price"*t."qty")*(1-t."discount_1"/100.0)
                        *(1-t."discount_2"/100.0)-t."discount_rs" AS line_raw
  FROM "transactions" t
  LEFT JOIN "items" it ON it."id" = t."item"
  WHERE t."deleted" = 0 AND t."invoice" = "inv_doc"."id"
),
sums AS (
  SELECT i."id" AS inv,
         printf('%.2f', COALESCE(SUM(CAST(lt.line_rounded AS REAL)), 0)) AS total,
         i."discount_1" AS d1, i."discount_2" AS d2, i."discount_rs" AS drs
  FROM "invoices" i LEFT JOIN lt ON lt.inv = i."id"
  WHERE i."id" = "inv_doc"."id" AND i."deleted" = 0 GROUP BY i."id"
),
money AS (
  SELECT s.inv, s.total, s.d1, s.d2, s.drs,
         printf('%.2f', s.total - (s.total * s.d1 / 100.0)
                              - ((s.total - (s.total * s.d1 / 100.0)) * s.d2 / 100.0))
           AS unrounded_total,
         printf('%.2f', printf('%.2f', s.total - (s.total * s.d1 / 100.0)
                              - ((s.total - (s.total * s.d1 / 100.0)) * s.d2 / 100.0))
                         - s.drs) AS final_total
  FROM sums s
),
paid AS (
  SELECT "invoice" AS inv,
         printf('%.2f', COALESCE(SUM(CASE WHEN "paid" = 1 THEN "amount" ELSE 0 END), 0)) AS paid_total
  FROM "payments" WHERE "deleted" = 0 AND "invoice" = "inv_doc"."id" GROUP BY "invoice"
),
ljson AS (
  SELECT inv, json_group_array(json_object(
           'id', hex(line_id), 'item', hex(item), 'item_name', item_name,
           'qty', qty, 'price', price, 'cost_price', cost_price, 'scheme', scheme,
           'd1', d1, 'd2', d2, 'drs', drs,
           'total', line_rounded, 'total_raw', line_raw) ORDER BY line_id) AS lines
  FROM lt GROUP BY inv
),
pjson AS (
  SELECT pay."invoice" AS inv, json_group_array(json_object(
           'id', hex(pay."id"), 'type', pay."type", 'type_name', pty."name",
           'amount', pay."amount", 'paid', pay."paid",
           'payment_date', pay."payment_date", 'description', pay."description",
           'party', hex(pay."party"), 'party_name', pa."name",
           'paid_to', hex(pay."paid_to"), 'paid_to_name', ob."name")
           ORDER BY pay."id") AS pays
  FROM "payments" pay
  LEFT JOIN "payment_types" pty ON pty."id" = pay."type"
  LEFT JOIN "parties" pa ON pa."id" = pay."party"
  LEFT JOIN "order_bookers" ob ON ob."id" = pay."paid_to"
  WHERE pay."deleted" = 0 AND pay."invoice" = "inv_doc"."id" GROUP BY pay."invoice"
)
SELECT
  json_object(
    'readable_id', 'inv-' || i."invoiceNo",
    'type', i."type", 'type_name', it."name",
    'invoiceNo', i."invoiceNo",
    'party', hex(i."party"), 'party_name', pa."name", 'party_phone', pa."phone",
    'booker', hex(i."booker"), 'booker_name', ob."name",
    'invoice_maker', hex(i."invoice_maker"),
    'dated', i."dated", 'duedate', i."duedate", 'description', i."description",
    'completed', i."completed",
    'd1', i."discount_1", 'd2', i."discount_2", 'drs', i."discount_rs",
    'total', m.total, 'unrounded_total', m.unrounded_total, 'final_total', m.final_total,
    'paid_total', COALESCE(p.paid_total, 0),
    'remaining', printf('%.2f', CAST(m.final_total AS REAL) - CAST(COALESCE(p.paid_total, 0) AS REAL)),
    'created', i."created", 'updated', i."updated",
    'lines', json(COALESCE(l.lines, '[]')),
    'payments', json(COALESCE(pj.pays, '[]'))
  )
FROM "invoices" i
JOIN money m ON m.inv = i."id"
LEFT JOIN "invoice_types" it ON it."id" = i."type"
LEFT JOIN "parties" pa ON pa."id" = i."party"
LEFT JOIN "order_bookers" ob ON ob."id" = i."booker"
LEFT JOIN paid p ON p.inv = i."id"
LEFT JOIN ljson l ON l.inv = i."id"
LEFT JOIN pjson pj ON pj.inv = i."id"
WHERE i."deleted" = 0)
  WHERE "id" IN (SELECT "id" FROM "invoices" WHERE "booker" = NEW."id")
     OR "id" IN (SELECT "invoice" FROM "payments" WHERE "paid_to" = NEW."id" AND "invoice" IS NOT NULL);
END;
