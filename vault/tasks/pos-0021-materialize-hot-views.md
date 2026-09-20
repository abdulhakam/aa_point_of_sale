---
type: Task
status: Ready
ticket: POS-0021
priority: P2
belongs_to:
  - "[[AA Point of Sale]]"
related_to:
  - "[[Reports & Ledgers]]"
  - "[[Data Model]]"
affects:
  - "[[Backend — PocketBase Data Service]]"
blocked_by:
  - "[[POS-0013 SQL aggregation views]]"
  - "[[POS-0018 Regression-test performance suite]]"
created: 2026-09-20
updated: 2026-09-20
tags:
  - performance
  - materialized-views
  - sql
  - backend
---

# POS-0021 Materialize hot report views into tables

## Goal

For the heaviest reports still slow after indexing, materialize the view into a **real
table** (refreshed on write) so it can itself be indexed — SQLite views cannot be indexed.

## Rationale

- [[POS-0007 Add indexes via migration]] indexes the base tables, but a view's *computed output* (e.g. the running
  balance or per-invoice aggregated totals) can't be indexed. Materializing into a table
  lets us index the aggregated result and query it directly.

## Scope

- Pick the 1–2 heaviest views (candidates: `ledger_party` running balance, the new
  sales/profit summary from [[POS-0013 SQL aggregation views]]).
- Create a real table + a refresh mechanism:
  - Option A (v0.22-compatible): JS hooks (`pb_hooks`) `onRecordAfter*` on
    invoices/transactions/payments to recompute/refresh the materialized rows on write.
  - Option B: a scheduled/periodic refresh (`cronAdd`) or an on-demand refresh endpoint.
- Add indexes on the materialized table's filter/group columns.

## Trade-offs / risks

- Adds write-time cost and staleness/consistency complexity. Only do this if
  [[POS-0018 Regression-test performance suite]] shows a specific report is still too slow after
  [[POS-0007 Add indexes via migration]] + [[POS-0013 SQL aggregation views]].
- Keep the original views as the source of truth; the materialized table is a derived cache.

## Done when

- A materialized table exists for the chosen view, refreshes on write (or on a schedule),
  is indexed, and returns identical results to the source view (verified).

## Related

- Only if needed; decided by [[POS-0018 Regression-test performance suite]] results.
- Its verification folds into [[POS-0018 Regression-test performance suite]].
