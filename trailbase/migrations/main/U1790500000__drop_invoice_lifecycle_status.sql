-- Remove the invoice lifecycle: there is no `status` and no draft.
--
-- vault/decisions/no-draft-invoices-published-on-save.md (2026-10-02) supersedes
-- vault/decisions/invoice-lifecycle-draft-open-append-only.md. The ORDERS system the draft phase
-- existed for has been removed from the project, so an invoice is published the moment it is saved
-- and stays editable afterwards. `invoices.status` is therefore not "kept but unused" — it is
-- dropped, because it is the column the import, the reports and the UI each keyed off, and leaving
-- it in place is what let a whole imported ledger be misfiled (see
-- vault/issues/imported-invoices-are-all-drafts-so-every-report-is-empty.md).
--
-- Why this matters rather than being cosmetic: the draft filter removed every invoice, then every
-- transaction and payment that referenced one, so all 14 report pages rendered 0 rows / 0.00 while
-- the payments, inventory and management screens stayed correct. Any future filter on a status the
-- importer does not set can do that again, so the column goes.
--
-- `completed` is deliberately KEPT. It is a legacy column of the record API contract and of the v1
-- import, and the materialised invoice documents read it; it is now inert — it no longer mirrors any
-- lifecycle — but removing it is separate work.

DROP TRIGGER IF EXISTS "invoices_status_default_insert";
DROP TRIGGER IF EXISTS "invoices_status_check_insert";
DROP TRIGGER IF EXISTS "invoices_status_check_update";
DROP INDEX IF EXISTS "invoices_status_idx";

-- SQLite refuses to drop a column that an index, view or trigger still mentions. The three above are
-- the only such dependents in the depot; if a future schema adds one, this fails loudly rather than
-- leaving the column behind.
ALTER TABLE "invoices" DROP COLUMN "status";