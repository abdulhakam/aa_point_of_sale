-- Make `invoices.status` insertable through the record API.
--
-- U1790400000 made the status constraint strict in both directions: it rejected NULL as well as a
-- garbage value. That was right for an UPDATE, where NULL would silently take a document out of
-- every report, but wrong for an INSERT: the record API infers its columns from the table, so any
-- client that posts an invoice without naming `status` — including trailbase/tools/guest-smoke.mjs
-- — was refused with a bare `400 db constraint: trigger`. A client that does not know about the
-- lifecycle should get a sensible default, not a database error.
--
-- The rule becomes:
--   INSERT with no status  -> 'draft' (a new document nobody has committed)
--   INSERT with a bad value -> refused
--   UPDATE to a bad value   -> refused
--   UPDATE to NULL          -> refused, because NULL means "not in the books" and must be explicit
--
-- SQLite cannot add a column default after the fact, so the default is applied by an AFTER INSERT
-- trigger. `completed` moves with it, because it is the legacy mirror of the same fact.

DROP TRIGGER "invoices_status_check_insert";

CREATE TRIGGER "invoices_status_check_insert"
BEFORE INSERT ON "invoices"
FOR EACH ROW WHEN NEW."status" IS NOT NULL AND NEW."status" NOT IN ('draft', 'open')
BEGIN
  SELECT RAISE(ABORT, 'invoices.status must be ''draft'' or ''open''');
END;

CREATE TRIGGER "invoices_status_default_insert"
AFTER INSERT ON "invoices"
FOR EACH ROW WHEN NEW."status" IS NULL
BEGIN
  UPDATE "invoices" SET "status" = 'draft', "completed" = 0 WHERE "id" = NEW."id";
END;
