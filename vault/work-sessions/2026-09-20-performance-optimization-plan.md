---
type: WorkSession
status: Active
started: 2026-09-20
updated: 2026-09-20
belongs_to:
  - "[[AA Point of Sale]]"
works_on:
  - "[[POS-0010 Cache behavior test]]"
  - "[[POS-0012 Pagination test]]"
  - "[[POS-0015 Trim expands + adopt pagination in report pages]]"
created: 2026-09-20
tags:
  - performance
  - planning
---

# Work Session — Performance Optimization Plan — 2026-09-20

> **RESUME HERE:** backend data-layer work (POS-0005 → POS-0014) is Done and verified on
> the live DB. POS-0010/0012 tests pass. **POS-0015, POS-0016 and POS-0025 are Done** — deep
> expands removed from the report pages (including the Daily Sale / Outstanding / Product Sale
> trio), the cash memo payments list paginated with `payments_summary`-backed totals, and all
> routes verified in a headless browser. Next is POS-0017. POS-0018 (re-measure), POS-0019
> (PocketBase v0.22.55) and later tasks are **not started**. See
> [[Checkpoint — AA Point of Sale — 2026-09-20]] for the exact next action, current git state,
> and the backend cheat-sheet.

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

- 2026-09-20 — POS-0025 Done: Daily Sale / Outstanding / Product Sale reports. Premise was
  stale (these three were already in source via `261a56c`, linked in the hub, and built), so
  [[Issue — Standalone Build Drift]] and [[Reconcile the standalone build with source]] were
  corrected. Trimmed dailysale (deep `party.area.section` → `useHydratedRefs`), removed
  productsale's wholly-unused `invoice.*` expand (+ a stray `console.log`) and outstanding's
  unused `party` expand. Browser-verified at 2025-11-12: row counts 78/83/602 and every total
  match direct DB queries exactly; build + tsc clean.
- 2026-09-20 — POS-0015 + POS-0016 **Done**: ran the browser render pass over CDP (headless
  Chrome 153; the `chrome-devtools` MCP is not exposed to the session and `agent-browser` is
  not installed). All 7 rewired routes rendered with live data and resolved names; the cash
  memo payments list paginated (50/page, 18 pages, page 2 navigates) with totals stable across
  pages and equal to the DB. **Bug found and fixed:** the `payments_summary` query inherited
  `useFullList`'s default `sort=-created`, which that view cannot sort by → 400 → page crash;
  fixed with `sort: "day"`. Also cleaned up an ESLint dep warning in `useHydratedRefs`.
  Harness recipe recorded in [[POS-0016 Report pages render test]].
- 2026-09-20 — POS-0015 pagination + summary totals: cash memo payments list now uses
  `usePagedList` (50/page) with `mantine-datatable` controls; totals come from
  `payments_summary` via `summaryCalculator()` when filters are summary-compatible, falling
  back to the full list for the Company/Invoice filters (added `enabled` to `useFullList`).
  `scripts/tests/test_summary_totals.py` PASS (9 filter shapes); `tsc` + build clean.
  Print reports deliberately stay full-list (they print the whole set).
- 2026-09-20 — POS-0015 (partial, In Progress): added `useRefMaps`/`hydrateRefs`/`useHydratedRefs`
  to `useAPI.ts` (client-side reference resolver + expand synthesiser, low-churn adapter);
  removed the deep server expand from 7 pages (`reports/transactions/unified`, `reports/profit`,
  `reports/payments`, `reports/payments/areawise`, `reports/salesreport`,
  `cashmemo/payments/PaymentsView`, `reports/paymentsbycompany`).
  `scripts/tests/test_expand_trim.py` PASS — 0 mismatches on 4,800 values; payload 70.1%/74.8%/64.9%
  smaller. `npx tsc --noEmit` clean; `npm run build` OK. Pagination of the transactional list
  remains (blocked on sourcing totals from `payments_summary` for the Company/Invoice filters).
- 2026-09-20 — POS-0012 Done: wrote `scripts/tests/test_pagination.py`, ran against live API (port 8090). All 5 checks PASS.
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
- 2026-09-20 — Vault health pass: fixed the POS-0014 verification warning (added Work
  log/Verification sections) and ran `kb_check.py`. Current verified validation:
  **PASS**, quality 99/100, 442 resolved links / 0 unresolved, 55 distinct tags,
  8 Done tasks (7 verified).
- 2026-09-20 — POS-0010 Done: wrote `scripts/tests/test_cache_behavior.py`, ran against live API.
  Section A (config inspection): all 10 checks pass. Section B (write-read
  consistency): create/update/delete all reflected immediately. totalItems=8927.
- 2026-09-20 — Repo hygiene: `backend/pb_data_bench/` (the scratch DB copy used for the
    A/B benchmark) was **accidentally git-tracked**; it is now covered by `.gitignore`
    along with the bench server logs. NB the copy is still tracked in history from commit
    `4ac911c` and will show as a deletion until that is committed — see the Checkpoint.

## Exact next action

1. ~~Write `scripts/tests/test_pagination.py` and run it ([[POS-0012 Pagination test]]).~~
   **DONE** — written and run; RESULT: PASS (disjoint pages, totalItems=8927, filter
   narrows, perPage changes size, sort honored). Task closed.
2. ~~Run the cache behaviour check ([[POS-0010 Cache behavior test]]).~~ **DONE** —
   config inspection (10/10 checks) + HTTP write-read consistency (create/update/delete all
   immediately visible). Task closed.
3. ~~[[POS-0015 Trim expands + adopt pagination in report pages]] + [[POS-0016 Report pages render test]]~~
   **DONE** — implementation + in-browser verification; `payments_summary` bad-sort bug found
   and fixed.
4. ~~[[POS-0025 Optimize + verify the Daily Sale, Outstanding, and Product Sale reports]]~~
   **DONE** — trims + browser verification; stale drift docs corrected.
5. Next: [[POS-0017 Invoice entry pages: paginate + trim expands]], then
   [[POS-0018 Regression-test performance suite]], then
   [[POS-0019 Upgrade PocketBase v0.22.9 → v0.22.55]].

Status of `scripts/tests/test_pagination.py`: **it now exists** and passes (see
[[POS-0012 Pagination test]]). An earlier note in this session that claimed it existed was
premature; it is no longer accurate to say the script is missing.
