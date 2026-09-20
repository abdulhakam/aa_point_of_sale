---
type: WorkSession
status: Active
started: 2026-09-20
updated: 2026-09-20
belongs_to:
  - "[[AA Point of Sale]]"
works_on:
  - "[[POS-0005 Baseline performance metrics]]"
created: 2026-09-20
tags:
  - performance
  - planning
---

# Work Session — Performance Optimization Plan — 2026-09-20

## Objective

Plan and sequence the invoice/report performance optimization (SQL aggregation, indexes,
React Query cache fix, pagination, expand trimming) plus a drop-in PocketBase upgrade
(0.22.9 → v0.22.55) and a scheduled, separately-tested jump to v0.40.4.

## Starting state (verified this session)

- Live DB `backend/pb_data/data.db`: transactions=23,413, payments=26,526, invoices=8,927,
  parties=942, items=207, areas=59, sections=10, categories=15, order_bookers=4, expenses=88.
- Only primary-key `sqlite_autoindex_*_1` exist; no secondary indexes on hot columns.
- `ledger_party` SQL uses a per-row correlated `SUM()` subquery for running balance (O(n²)).
- `frontend/src/app/providers.tsx`: `staleTime: 1000/2`, `refetchOnMount: true`.
- Reports fetch full `transactions_report`/`payments_view`/`invoice_view` via `getFullList`.
- PocketBase server `0.22.9`, JS SDK `0.20.1`. No JS hooks (`pb_hooks` absent).
- Python 3.14 + sqlite3 3.50.4 available; Node/npm at `C:\Program Files\nodejs`.

## Constraints

- Offline, single-Windows-machine app; frontend talks to PocketBase REST directly.
- PocketBase upgrade: user chose **v0.22.55 (drop-in)**; v0.40.4 deferred as a separate,
  tested migration (its JS-migration + SDK breaking changes are out of scope here).
- Never modify `backend/pb_data/data.db` directly; all schema changes via `pb_migrations`.
- Every change gets a related test task (per user requirement).

## Execution plan (most efficient order)

1. Baseline metrics → 2. Backup → 3. Indexes → 4. Cache config → 5. Pagination plumbing →
6. SQL aggregation → 7. Trim expands → 8. Re-apply to frontend → 9. E2E regression →
10. PB v0.22.55 upgrade → 11. Materialize hot views → 12. Schedule PB v0.40.4 migration.

See the Project [[AA Point of Sale]] task index and dependency graph for POS-0005..POS-0024.

## Activity log

- 2026-09-20 — Inspected code, live DB, and view SQL; confirmed scale and root causes.
- 2026-09-20 — Verified PB release lines (0.22.55 drop-in; 0.40.4 latest w/ breaking changes).
- 2026-09-20 — Authored granular Task documents POS-0005..POS-0024 with test companions.

## Exact next action

Run [[POS-0005 Baseline performance metrics]] (capture timings + EXPLAIN QUERY PLAN),
then [[POS-0006 Backup database and repo snapshot]].
