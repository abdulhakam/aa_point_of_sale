-- Drop the general document store: the table, its 12 triggers, its 3 views, 36,603 rows.
--
-- The store was built on 2026-09-30 as the precomputed-document cache for a document/render path that
-- would generalise beyond invoices (vault/issues/document-store-and-streaming-render.md). It was
-- verified 15/15, deliberately scoped, and it worked. What changed is the plan: **the document path
-- is not being built beyond invoices** (owner, 2026-10-02), so no consumer ever arrives.
--
-- Nothing reads it. `SELECT ... FROM "document"` has zero hits in the guest, and it is not an exposed
-- record collection in config.textproto. What the app reads is `inv_doc`, which is a different table
-- with different triggers.
--
-- WHAT SURVIVES, and must not be confused with this: `inv_doc` (8,927 rows) is the invoice document
-- store, maintained by the `inv_doc__*` triggers, and it IS read -- by the print path
-- (`app/views/invoices/document.html`) and by `app/lib/queue.js`. It is untouched here. The `document`
-- table additionally held a *mirror* of the invoice documents, which is why the invoice kind appears
-- in the row count below; that mirror is what goes, and `inv_doc` still holds every invoice document.
--
-- WHAT IT COST, measured on a copy of the depot before this migration: the 12 triggers rebuilt a JSON
-- document on every write to the tables they watch.
--
--     payments row   10.07 ms -> 5.10 ms   (~5 ms saved per payment write)
--     parties row     3.29 ms -> 0.13 ms   (~3.2 ms)
--     items row       2.79 ms -> 0.28 ms   (~2.5 ms)
--
-- (Those absolute figures include the harness re-preparing each statement and are inflated; the
-- differences are the meaningful numbers and are consistent across all three tables.)
--
-- It also removes the last three `CREATE VIEW`s in the database, which matters because the owner
-- wants TrailBase's SQLite to hold no VIEW objects at all. The three views were read by the triggers,
-- and a SQLite trigger cannot read a `.sql` file -- so while the store existed, "no views in the
-- database" and "keep the store" could not both hold. Dropping the store settles it.
--
-- If a document path beyond invoices is ever revived, the cheapest route is NOT to rebuild this: the
-- KV store already serves the report case (spoolreports.js spools rows to a KV key and hands it to the
-- renderer), and a single-document cache must be trigger-maintained regardless, because payments,
-- parties, items and invoices are all writable through TrailBase's record API and a guest-written
-- cache would be stale from the instant it was written.

-- Twelve triggers in four families: voucher/payment, party, item, and the invoice mirror on inv_doc.
-- Order matters only in that the views must go before the table; triggers first so nothing can fire
-- mid-drop.
DROP TRIGGER IF EXISTS "document__voucher_insert";
DROP TRIGGER IF EXISTS "document__voucher_update";
DROP TRIGGER IF EXISTS "document__voucher_delete";
DROP TRIGGER IF EXISTS "document__party_insert";
DROP TRIGGER IF EXISTS "document__party_update";
DROP TRIGGER IF EXISTS "document__party_delete";
DROP TRIGGER IF EXISTS "document__item_insert";
DROP TRIGGER IF EXISTS "document__item_update";
DROP TRIGGER IF EXISTS "document__item_delete";
-- These three hang off `inv_doc`, not off the tables below. They are the only part of the store that
-- duplicates something still read; `inv_doc` itself keeps its data and its own three triggers.
DROP TRIGGER IF EXISTS "document__invoice_insert";
DROP TRIGGER IF EXISTS "document__invoice_update";
DROP TRIGGER IF EXISTS "document__invoice_delete";

-- The last three VIEWs in the database.
DROP VIEW IF EXISTS "document__voucher_src";
DROP VIEW IF EXISTS "document__party_src";
DROP VIEW IF EXISTS "document__item_src";

-- The indexes go with the table, but naming them makes the intent explicit and makes a partial
-- failure obvious rather than silent.
DROP INDEX IF EXISTS "document_kind_readable_idx";
DROP INDEX IF EXISTS "document_kind_dated_idx";

DROP TABLE IF EXISTS "document";