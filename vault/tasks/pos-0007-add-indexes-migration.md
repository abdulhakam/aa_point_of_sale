---
type: Task
status: Ready
ticket: POS-0007
priority: P0
belongs_to:
  - "[[AA Point of Sale]]"
related_to:
  - "[[Data Model]]"
  - "[[Reports & Ledgers]]"
affects:
  - "[[Backend — PocketBase Data Service]]"
blocked_by:
  - "[[POS-0005 Baseline performance metrics]]"
  - "[[POS-0006 Backup database and repo snapshot]]"
created: 2026-09-20
updated: 2026-09-20
tags:
  - performance
  - indexes
  - migration
---

# POS-0007 Add indexes via migration

## Goal

Add secondary indexes on the columns the report/ledger views and filters actually join and
filter on, so SQLite stops full-scanning 8.9k–26k row tables.

## Indexes to add (migration file, applied via `pocketbase migrate up`)

- `transactions(invoice)` — join in `transaction_view`/`invoice_view` (23,413 rows).
- `transactions(item)` — join in `items_report`/`items_difference_report`.
- `invoices(party)`, `invoices(booker)`, `invoices(type)`, `invoices(dated)` —
  `invoice_view` GROUP BY + report filters.
- `payments(party)`, `payments(paid)`, `payments(type)`, `payments(invoice)` —
  `payments_view`, `ledger_party`, `ledger_booker`, `ledger_area`, `ledger_journal`.

Write a single `backend/pb_migrations/<ts>_add_perf_indexes.js` using raw SQL
(`db.newQuery("CREATE INDEX IF NOT EXISTS ...")`) inside `migrate((db) => {...})`, with a
matching down-migration that drops them. Follow the existing migration style in
`backend/pb_migrations/` (v0.22 API: `migrate((db)=>{...}, (db)=>{...})`).

## Done when

- Migration applies cleanly (`pocketbase migrate up`) against a **copy** of the DB.
- `scripts/inspect_db.py` lists the new indexes.
- `EXPLAIN QUERY PLAN` for `invoice_view`/`transaction_view` now shows index usage
  (SEARCH vs SCAN) for the joined columns.

## Notes

- SQLite **views cannot be indexed**; this only helps the base tables the views read.
  Indexing the heavy view outputs requires materialization — see
  [[POS-0021 Materialize hot report views into tables]].
- Verify each index name is unique and `IF NOT EXISTS` is used for idempotency.

## Related

- Verified by [[POS-0008 Index verification test]].
- Unblocks meaningful gains from [[POS-0011 Paginated list plumbing]] and
  [[POS-0021 Materialize hot report views into tables]].
