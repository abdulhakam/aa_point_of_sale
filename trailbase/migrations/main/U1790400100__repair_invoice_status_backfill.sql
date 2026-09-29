-- Repair: U1790400000 backfilled `invoices.status` from the `completed` column, and `completed` is
-- meaningless in the imported v1 data — 0 on 8,923 of 8,935 invoices, because the import never set
-- it and the reports never filtered on it. The backfill therefore marked 8,923 real, settled
-- business documents as drafts, and the report predicate `status = 'open'` would have hidden
-- essentially the whole ledger.
--
-- U1790400000 itself is corrected in place for a depot that has not yet run it. This migration
-- repairs a depot that already has, which is the production one. Both are in the history on
-- purpose: the wrong one and its repair are both auditable.
--
-- Nothing is lost either way. A draft is still a draft in the sense the app cares about — it is
-- not in the books — but these rows are all historical documents, so they belong in the books.
UPDATE "invoices" SET "status" = 'open' WHERE "status" IS NULL OR "status" NOT IN ('draft', 'open');

-- Only rows that the app itself created since the migration can legitimately be a draft, and they
-- are identified by having no lines yet. Every imported invoice with lines is a real document.
UPDATE "invoices"
   SET "status" = 'open'
 WHERE "status" = 'draft'
   AND EXISTS (SELECT 1 FROM "transactions" t WHERE t."invoice" = "invoices"."id");
