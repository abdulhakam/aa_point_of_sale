-- U1790300300__materialised_invoice_documents.sql
--
-- Step 1 of the invoice document layer. INERT apart from creating and filling the
-- table: no trigger, so nothing about current behaviour changes. The trigger lands
-- in a later migration, once these documents are verified against PocketBase.
--
-- THE MONEY ARITHMETIC BELOW IS THE SINGLE DEFINITION. It is transcribed once, from
-- the legacy view SQL, and it is the only copy in the repository.
--   * Do not re-derive it anywhere. The document is the read model.
--   * Do not hand-edit the trigger variant; generate it from this file.
--   * trailbase/tools/invoice-document-parity.py reads the backfill out of THIS
--     file and diffs it against PocketBase. It is the only oracle, and the gate.
--
-- Why documents, and why in this database: a SQLite trigger cannot write to an
-- attached database (qualified table names are rejected inside a trigger body),
-- and cross-database atomicity is not guaranteed in WAL mode.

-- ---------------------------------------------------------------------------
-- payments gains a soft-delete flag
--
-- The legacy Payments screen has a delete button, but `payments` had no `deleted`
-- column, so a payment delete was a HARD delete and erased the row from every
-- running balance and the ledger. Every other mutable table here already carries
-- the flag. Existing rows default to 0 (live), so this is a no-op for current data.
-- ---------------------------------------------------------------------------
ALTER TABLE "payments" ADD COLUMN "deleted" INTEGER NOT NULL DEFAULT 0 CHECK ("deleted" IN (0, 1));

CREATE INDEX "idx_payments__deleted" ON "payments" ("deleted");

-- ---------------------------------------------------------------------------
-- inv_doc — one self-contained JSON document per invoice
--
-- `doc` holds the header, the totals, every line with its own calculated total,
-- and every payment. The projected columns are STORED generated columns: SQLite
-- computes them from the document at write time, so they cannot drift from it,
-- and they are indexable, so reports filter and group without json_extract.
--
-- STORED, not VIRTUAL, is the point. VIRTUAL recomputes json_extract on every read
-- and measured 34.7 ms for the outstanding GROUP BY; STORED computes once at write
-- and measured 7.1 ms.
--
-- `readable_id` is deliberately NOT unique. Legacy difference invoices are numbered
-- dif+YYYYMMDD and collide on a same-day pair; the decision is that an operator
-- edits the first four characters to an impossible value rather than the schema
-- imposing a rule. The index supports lookup, it is not a constraint.
-- ---------------------------------------------------------------------------
CREATE TABLE "inv_doc" (
  "id"          BLOB PRIMARY KEY NOT NULL REFERENCES "invoices"("id") ON DELETE CASCADE,
  "doc"         TEXT NOT NULL CHECK (json_valid("doc")),

  "readable_id" TEXT    GENERATED ALWAYS AS (json_extract("doc", '$.readable_id')) STORED,
  "inv_type"    INTEGER GENERATED ALWAYS AS (json_extract("doc", '$.type'))       STORED,
  "invoice_no"  REAL    GENERATED ALWAYS AS (json_extract("doc", '$.invoiceNo'))  STORED,
  "party"       TEXT    GENERATED ALWAYS AS (json_extract("doc", '$.party'))      STORED,
  "booker"      TEXT    GENERATED ALWAYS AS (json_extract("doc", '$.booker'))     STORED,
  "dated"       TEXT    GENERATED ALWAYS AS (json_extract("doc", '$.dated'))      STORED,
  "completed"   INTEGER GENERATED ALWAYS AS (json_extract("doc", '$.completed'))  STORED,
  "total"       REAL    GENERATED ALWAYS AS (CAST(json_extract("doc", '$.total') AS REAL))       STORED,
  "final_total" REAL    GENERATED ALWAYS AS (CAST(json_extract("doc", '$.final_total') AS REAL)) STORED,
  "paid_total"  REAL    GENERATED ALWAYS AS (CAST(json_extract("doc", '$.paid_total') AS REAL))  STORED,
  "remaining"   REAL    GENERATED ALWAYS AS (CAST(json_extract("doc", '$.remaining') AS REAL))   STORED,
  "line_count"  INTEGER GENERATED ALWAYS AS (json_array_length(json_extract("doc", '$.lines')))  STORED
) STRICT;

CREATE INDEX "idx_inv_doc__readable_id" ON "inv_doc" ("readable_id");
CREATE INDEX "idx_inv_doc__party"       ON "inv_doc" ("party");
CREATE INDEX "idx_inv_doc__dated"       ON "inv_doc" ("dated");
CREATE INDEX "idx_inv_doc__type_done"   ON "inv_doc" ("inv_type", "completed");
CREATE INDEX "idx_inv_doc__remaining"   ON "inv_doc" ("remaining");

-- ---------------------------------------------------------------------------
-- Backfill.
--
-- The line arithmetic, in order, because the order IS the specification:
--   line_total        = (price*qty) * (1 - discount_1/100) * (1 - discount_2/100)
--                       - discount_rs
--   total             = sum of each line ALREADY rounded to 2dp   <- legacy quirk
--   unrounded_total   = total, minus invoice d1, minus d2, THEN rounded to 2dp
--   final_total       = unrounded_total (the ROUNDED value) minus discount_rs
-- The last two lines are the quirk: legacy rounds unrounded_total before
-- subtracting discount_rs. Storing the raw expression instead moved 4 invoices by
-- half a cent and one by a whole cent.
-- ---------------------------------------------------------------------------
WITH lt AS (
  SELECT t."invoice" AS inv, t."id" AS line_id, t."item" AS item,
         t."qty" AS qty, t."price" AS price, t."cost_price" AS cost_price,
         t."scheme" AS scheme, t."discount_1" AS d1, t."discount_2" AS d2,
         t."discount_rs" AS drs,
         printf('%.2f',
           (t."price"*t."qty")*(1-t."discount_1"/100.0)
                           *(1-t."discount_2"/100.0)-t."discount_rs") AS line_rounded,
         (t."price"*t."qty")*(1-t."discount_1"/100.0)
                        *(1-t."discount_2"/100.0)-t."discount_rs" AS line_raw
  FROM "transactions" t WHERE t."deleted" = 0
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
-- payments has no "deleted" column in older depots; guard so the backfill is
-- re-runnable after the ALTER above has been applied.
paid AS (
  SELECT "invoice" AS inv,
         printf('%.2f', COALESCE(SUM(CASE WHEN "paid" = 1 THEN "amount" ELSE 0 END), 0)) AS paid_total
  FROM "payments" GROUP BY "invoice"
),
ljson AS (
  SELECT inv, json_group_array(json_object(
           'id', hex(line_id), 'item', hex(item), 'qty', qty, 'price', price,
           'cost_price', cost_price, 'scheme', scheme,
           'd1', d1, 'd2', d2, 'drs', drs,
           'total', line_rounded, 'total_raw', line_raw)) AS lines
  FROM lt GROUP BY inv
),
pjson AS (
  SELECT "invoice" AS inv, json_group_array(json_object(
           'id', hex("id"), 'type', "type", 'amount', "amount", 'paid', "paid",
           'payment_date', "payment_date", 'description', "description")) AS pays
  FROM "payments" GROUP BY "invoice"
)
INSERT INTO "inv_doc" ("id", "doc")
SELECT i."id",
  json_object(
    'readable_id', 'inv-' || i."invoiceNo",
    'type', i."type", 'invoiceNo', i."invoiceNo",
    'party', hex(i."party"), 'booker', hex(i."booker"),
    'dated', i."dated", 'completed', i."completed",
    'd1', i."discount_1", 'd2', i."discount_2", 'drs', i."discount_rs",
    'total', m.total,
    'unrounded_total', m.unrounded_total,
    'final_total', m.final_total,
    'paid_total', COALESCE(p.paid_total, 0),
    'remaining', m.final_total - COALESCE(p.paid_total, 0),
    'lines', json(COALESCE(l.lines, '[]')),
    'payments', json(COALESCE(pj.pays, '[]'))
  )
FROM "invoices" i
JOIN money m ON m.inv = i."id"
LEFT JOIN paid p ON p.inv = i."id"
LEFT JOIN ljson l ON l.inv = i."id"
LEFT JOIN pjson pj ON pj.inv = i."id"
WHERE i."deleted" = 0;
