-- Invoice lifecycle: an explicit status, and the Difference counterparty.
--
-- The app now models an invoice as draft -> open (see
-- vault/decisions/invoice-lifecycle-draft-open-append-only.md). `status` is the single source of
-- truth from here on; `completed` is retained because the record API contract and the v1 import
-- depend on it, and every write that changes `status` sets `completed` in the same UPDATE so the
-- two cannot drift.
--
-- A draft is readable by everyone but is NOT in the books: every report filters status = 'open'.
-- That predicate is applied in the guest's shared view builders, not here, so the SQL views stay a
-- faithful port of the legacy SQL (USE_SQL_VIEWS is off for the same reason).

ALTER TABLE "invoices" ADD COLUMN "status" TEXT;

-- Every EXISTING invoice becomes 'open', unconditionally.
--
-- This does NOT key off `completed`, which was the obvious thing to do and is wrong: in the
-- imported v1 data `completed` is 0 on 8,923 of 8,935 invoices, because the import never set it —
-- it was a PocketBase form-state field, not a business one, and the reports never filtered on it.
-- Backfilling from it would have marked 8,923 real, paid, long-standing business documents as
-- drafts and emptied every report in the system. Measured on the production depot before this
-- line was changed; see vault/issues/imported-completed-flag-carries-no-information.md.
--
-- Existing rows are historical documents and are in the books. Only NEW invoices are drafts.
UPDATE "invoices" SET "status" = 'open';

-- SQLite cannot add a CHECK to an existing column, so the constraint is a trigger. It fires on
-- every write path, including the record API, which is the point: an invalid status must not be
-- storable, only merely discouraged.
CREATE TRIGGER "invoices_status_check_insert"
BEFORE INSERT ON "invoices"
FOR EACH ROW WHEN NEW."status" IS NULL OR NEW."status" NOT IN ('draft', 'open')
BEGIN
  SELECT RAISE(ABORT, 'invoices.status must be ''draft'' or ''open''');
END;

-- The record API infers its columns from the table (there is no explicit column list in
-- config.textproto), so this new column is readable and writable through the Node client with no
-- config change. That is exactly why the constraint below has to be a trigger rather than advice:
-- an invalid status must be unstorable, not merely discouraged.
--
-- The update trigger also rejects NULL, because `NULL NOT IN (...)` evaluates to NULL, which is
-- falsy, and a trigger whose WHEN clause is falsy does not fire.
CREATE TRIGGER "invoices_status_check_update"
BEFORE UPDATE OF "status" ON "invoices"
FOR EACH ROW WHEN NEW."status" IS NULL OR NEW."status" NOT IN ('draft', 'open')
BEGIN
  SELECT RAISE(ABORT, 'invoices.status must be ''draft'' or ''open''');
END;

-- `status` is now the truth, so a fresh row with no explicit status is a draft, not an open
-- invoice. The import path sets it explicitly (the column did not exist when it ran).
CREATE INDEX "invoices_status_idx" ON "invoices" ("status");

-- ---------------------------------------------------------------------------
-- The Difference counterparty.
--
-- A stock difference is an invoice to a party named "Difference" (see
-- vault/decisions/returns-are-negative-quantities.md). It has to exist as a real party or a
-- difference cannot be entered at all, and the difference report re-keys on it.
--
-- `parties.type` is the 0/1 customer|supplier enum. A difference can cut either way, so the party
-- is seeded as a customer (type 0) and the invoice's own type decides the direction of the stock
-- movement: a purchase to Difference removes stock, a sale to Difference adds it.
--
-- Idempotent by NAME, not by id: the invariant is "exactly one party called Difference", and
-- uuid_v7() would make a re-run insert a second one.
--
-- `id` is deliberately omitted so the column's own DEFAULT (uuid_v7()) applies. An earlier version
-- supplied a hand-made uuid_v7-shaped literal and the depot refused it: every business table
-- carries CHECK (is_uuid_v7("id")), and a plausible-looking literal is not enough — let the
-- database mint it.
INSERT INTO "parties" ("name", "type", "deleted", "created", "updated")
SELECT 'Difference', 0, 0,
       '2026-09-29 00:00:00.000Z', '2026-09-29 00:00:00.000Z'
WHERE NOT EXISTS (SELECT 1 FROM "parties" WHERE "name" = 'Difference');

