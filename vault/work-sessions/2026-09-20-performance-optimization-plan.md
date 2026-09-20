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
- 2026-09-20 — POS-0006 Done: backup at `backend/pb_data/backups/20260920-1232/`
  (data.db 11.1MB, logs.db 57MB, types.d.ts), verified read-only; `/backend/pb_data`
  already git-ignored.
- 2026-09-20 — POS-0005 Done: `scripts/perf_baseline.py` + `scripts/perf_http.py`;
  results in `scripts/baseline_sql_full.txt` and [[Performance Baseline]].
  Headlines: `ledger_party` full scan ABORTED at 180s; `invoice_view` full list 26s;
  `transactions_report` 107s; `payments_view` 111s; deep expand = 1MB/500 rows.
- 2026-09-20 — POS-0007 Done on scratch copy: `1789890189_add_performance_indexes.js`
  (18 indexes via collection.indexes). POS-0008 Done: `scripts/tests/test_indexes.py`
  PASS — all plans now SEARCH...USING INDEX.
- 2026-09-20 — Measured after-indexes: `ledger_party` 180s+ → 35.7s (O(n²) fixed by
  `payments(party)` index). Whole-view scans unchanged (26s→23s A/B, within noise) —
  confirmed indexes alone cannot fix full-list fetches; that needs POS-0015/0017.
  Learned: `bench_pagination.py` A/B; an earlier 38s reading was contaminated by a
  concurrent run and discarded.
- 2026-09-20 — POS-0009 Done: providers.tsx staleTime 0.5s→60s, gcTime 10min;
  refetchOnMount kept true and documented (bare invalidateQueries() + false would
  serve stale data after writes). Reference data cached 5min via useAPI helpers.
- 2026-09-20 — POS-0011 Done: useAPI.ts adds `crud.listPage`/`usePagedList`
  (getList + keepPreviousData), fixes `crud.listall` dropped-return bug and
  `invalidateQueries(string)` v5 misuse in the CRUD hooks.
- 2026-09-20 — POS-0013 Done on scratch copy: `ledger_party` rewritten with
  `SUM(...) OVER (PARTITION BY party ORDER BY payment_date RANGE UNBOUNDED PRECEDING)`
  (identical columns → no schema change) and new `payments_summary` view
  (GROUP BY day, party, area, section, booker, party_type, type, paid).
- 2026-09-20 — POS-0014 Done: `scripts/tests/test_report_sql.py` — window balance
  matches the correlated subquery for all 26,526 rows (0 mismatches); summary totals
  match the JS calculator over several filters.
- 2026-09-20 — Latent frontend bug found: `payments_view.amount` falls back to
  `invoice_view.final_total` (printf → STRING), so the old JS `+=` concatenated
  strings for unset-amount payments. The SQL aggregation does real arithmetic.
- 2026-09-20 — Vault health pass: fixed the POS-0014 verification warning (added
  Work log/Verification sections), added backlink edges (Glossary, subsystems, both
  Decisions, Knowledgebase Guide, POS-0014), and enriched tags (route-map, glossary,
  reports-and-ledgers, frontend, desktop). `kb.py validate` + `kb_check.py` → PASS,
  quality 100/100, 437 resolved links, 55 distinct tags.

## Exact next action

Apply the three migrations to the live DB (`pocketbase migrate up`), smoke-test serve,
then proceed to [[POS-0015 Trim expands + adopt pagination in report pages]].
