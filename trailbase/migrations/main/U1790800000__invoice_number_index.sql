-- An index on (type, invoiceNo) for the console invoice-# picker's number search.
--
-- The picker's search (`routes/data/invoices/search/route.ts`) filters
-- `WHERE type = ? AND CAST(invoiceNo AS TEXT) LIKE '%digits%' ORDER BY invoiceNo DESC LIMIT 50`.
-- The string cast made the predicate non-sargable, so the plan was `idx_invoices_type` (type only)
-- plus a TEMP B-TREE to satisfy the ORDER BY — a full scan+sort of the type on every keystroke (~10 ms
-- for type 1, 12,395 rows).
--
-- With `(type, invoiceNo)` fixed on the leading `type`, the rows are already in `invoiceNo` order, so
-- the plain `LIKE` is served from this index with NO temp sort and with early termination once the 50
-- LIMIT is reached. Measured on the production depot (main.db copy): broad query `%3%` 10 ms -> 0.35 ms;
-- a rare `%12345%` scan stays ~2.7 ms (it is the index rows, not the wide table). Substring matching is
-- preserved — a middle fragment still finds the invoice — which an `invoiceNo BETWEEN` prefix range
-- would have dropped. This index is therefore preferred over the prefix-range rewrite.
--
-- `idx_invoices_type` (type alone) remains for any plan that wants a narrower index; this one covers it.

CREATE INDEX IF NOT EXISTS "idx_invoices_type_invoiceno" ON "invoices" ("type", "invoiceNo");
