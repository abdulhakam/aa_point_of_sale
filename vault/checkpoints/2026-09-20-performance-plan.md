---
type: Checkpoint
status: Current
belongs_to:
  - "[[AA Point of Sale]]"
work_session:
  - "[[Work Session — Performance Optimization Plan — 2026-09-20]]"
works_on:
  - "[[POS-0005 Baseline performance metrics]]"
  - "[[POS-0006 Backup database and repo snapshot]]"
created: 2026-09-20
updated: 2026-09-20
tags:
  - checkpoint
  - performance
  - planning
---

# Checkpoint — AA Point of Sale — 2026-09-20

## Objective

Deliver the invoice/report performance optimization and the PocketBase upgrade as tracked,
granular tasks with test companions and an efficient dependency-ordered sequence. Keep this
checkpoint current enough that a fresh session can resume without chat history.

## Status at a glance

Backend data-layer work (POS-0005 → POS-0014) is **done and verified on the live DB**.
The cache and pagination-helper tests (POS-0010, POS-0012) pass. **POS-0015, POS-0016,
POS-0017 and POS-0025 are done and browser-verified**: deep expands removed from the report
pages, the cash memo payments list paginated with `payments_summary`-backed totals, and the
invoice entry pages no longer fetch the whole `invoice_view` (the selector is paged +
server-searchable). The browser passes also caught and fixed a 400-causing bad sort on the
`payments_summary` request. Next: the regression re-measure (POS-0018); the PocketBase
v0.22.55 upgrade (POS-0019) is the main remaining item.

## Active tasks

- [[POS-0018 Regression-test performance suite]] — Ready (NEXT, final re-measure)
- [[POS-0019 Upgrade PocketBase v0.22.9 → v0.22.55]] — Ready
- [[POS-0020 PocketBase v0.22.55 regression test]] — Ready
- [[POS-0021 Materialize hot report views into tables]] — Ready (conditional on POS-0018)
- [[POS-0022 Upgrade PocketBase to v0.40.4]] — Backlog (deferred, separate migration)
- [[POS-0023 PocketBase v0.40.4 migration test]] — Backlog
- [[POS-0024 Record performance optimization decisions]] — Ready

## Completed since previous checkpoint

- **POS-0017 (done)** Invoice entry pages. `InvoiceForm.tsx` no longer runs
  `getFullList(invoice_view, expand: "party,invoice_maker,booker")`: the selector is a
  `usePagedList` (50 newest, server-search by `invoiceNo`), the id-generation count is a 1-row
  `usePagedList` on the same view/filter, and the selected invoice is a `getOne`. `difference`
  dropped its redundant expand; `orders` dropped `expand: "booker,invoice_maker,party"` and
  resolves names via `useHydratedRefs`. Verified in-browser by capturing the real requests: the
  entry pages now issue `perPage=50` + `perPage=1` (no expand), and `orders` renders 8,927 rows
  with party/booker names. Residual: the interactive dropdown→edit flow was not exercised by
  the harness; `orders` still fetches the full `invoice_view` (no expand) because
  `DataViewTable` lacks server-pagination props.
- **POS-0025 (done)** Daily Sale / Outstanding / Product Sale reports trimmed + verified. The
  premise ("source lacks these three") was stale — they were added by `261a56c` and are linked
  in the reports hub, so [[Issue — Standalone Build Drift]] and
  [[Reconcile the standalone build with source]] were corrected. Trimmed: `dailysale`'s
  `party.area.section` chain now resolves via `useHydratedRefs`; `productsale`'s wholly-unused
  `invoice.*` expand removed (plus a stray `console.log`); `outstanding`'s unused `party`
  expand removed. Browser-verified at 2025-11-12: row counts (78/83/602) and every total match
  direct DB queries exactly.
- **POS-0015 + POS-0016 (done)** Deep-expand trim + pagination + summary totals, verified in a
  browser. Added `useRefMaps`/`hydrateRefs`/`useHydratedRefs` to `useAPI.ts` and removed the
  server expand from 7 pages (`reports/transactions/unified`, `reports/profit`,
  `reports/payments`, `reports/payments/areawise`, `reports/salesreport`,
  `cashmemo/payments/PaymentsView`, `reports/paymentsbycompany`); the cash memo payments list
  now uses `usePagedList` (50/page) with `payments_summary`-backed totals (full-list fallback
  for the Company/Invoice filters). Verified: `test_expand_trim.py` PASS (0 mismatches on
  4,800 values; payload −70.1/−74.8/−64.9%), `test_summary_totals.py` PASS (9 filter shapes);
  `tsc` + `npm run build` clean; **headless-Chrome pass on all 7 routes** — names resolve,
  pagination navigates (50/page, 18 pages), totals stable and equal to the DB. The browser pass
  caught a real defect: `useFullList`'s default `sort=-created` is invalid on
  `payments_summary` (no `created` column) → 400 → page crash; fixed with `sort: "day"`.
- **POS-0010** Cache behavior verified — `scripts/tests/test_cache_behavior.py` → PASS.
  Section A: 10/10 config checks (staleTime 60 s, gcTime 10 min, refetchOnMount true,
  reference 5 min, keepPreviousData, query-key + invalidation patterns). Section B: HTTP
  write→read consistency (create/update/delete all reflected immediately; totalItems=8927
  matches raw SQL).
- **POS-0012** Pagination test — `scripts/tests/test_pagination.py` → PASS. Disjoint pages,
  totalItems=8927, filter narrows, perPage changes size, sort order honored.
- **POS-0005** Baseline metrics — scripts written, before-numbers captured (see
  [[Performance Baseline]]).
- **POS-0006** Backup — `backend/pb_data/backups/20260920-1232/` (data.db, logs.db, types.d.ts),
  verified read-only with matching row counts.
- **POS-0007** Indexes — `1789890189_add_performance_indexes.js`, 18 indexes, applied to live.
- **POS-0008** Index verification — `scripts/tests/test_indexes.py` → PASS.
- **POS-0009** Cache config — `providers.tsx` staleTime 0.5 s → 60 s + gcTime; reference data
  5 min via `useAPI.ts` helpers. (Deviation: `refetchOnMount` deliberately kept `true`;
  rationale documented in the task and in code.)
- **POS-0011** Pagination plumbing — `crud.listPage` + `usePagedList` (getList +
  `keepPreviousData`); fixed the dropped return in `crud.listall` and the React Query v5
  `invalidateQueries` call-shape bug in the CRUD hooks.
- **POS-0013** SQL aggregation — `ledger_party` rewritten with a window function
  (`RANGE BETWEEN UNBOUNDED PRECEDING`, replacing an O(n²) correlated subquery) and a new
  `payments_summary` view. Applied to live.
- **POS-0014** Equivalence test — `scripts/tests/test_report_sql.py` → PASS (0 mismatches on
  26,526 ledger rows; summary totals match the old JS calculator across 3 filter cases).

## Current verified state

**Committed:** `4ac911c` "did a lot but still a lot remains" (2026-09-20 14:54 +0500) captured
the work up to that point: the three migrations, `useAPI.ts`, `providers.tsx`, the
`scripts/*` tooling and its captured output. **Warning:** that commit also swept in the
scratch DB (`backend/pb_data_bench/` — ~18 MB of blobs), `pb_bench*.txt`,
`pb_live_smoke*.txt` and assorted `*.err.txt` logs. `.gitignore` now covers the bench
copy and the scratch artifacts, but the already-committed files remain tracked and should
be removed from tracking (`git rm -r --cached backend/pb_data_bench` and the stray logs)
in a deliberate hygiene commit.

**Committed this session:** `6e99c14` (POS-0015 expand trim + POS-0010/0012 verification
tests) and `6c7bce4` (POS-0015 pagination + browser-verified POS-0015/0016). `git status`
shows no working-tree change to `frontend/src/app/app/reports/ledgers/page.tsx` — the
previously flagged change was committed in `4ac911c` (see
[[Review the uncommitted Ledgers report change]]).

**Uncommitted (POS-0017):**
`frontend/src/app/app/invoices/{InvoiceForm.tsx,difference/page.tsx,orders/page.tsx}`, plus the
vault changes ([[POS-0017 Invoice entry pages: paginate + trim expands]], the hydration-note
correction in [[POS-0016 Report pages render test]], the project note, this checkpoint and the
work session). Pre-existing/unrelated: `.commandcode/taste/taste.md` and
`vault/.noteriv/workspace.json` (Tolaria-generated).

- Live DB `backend/pb_data/data.db` (production):
  - 18 secondary indexes (verified by `scripts/tests/test_indexes.py`: 18/18 present;
    6/6 hot plans `SEARCH ... USING INDEX`).
  - `ledger_party` now uses `SUM(...) OVER (... RANGE UNBOUNDED PRECEDING)` (verified by
    `scripts/verify_live.py`).
  - New view `payments_summary` live (23,790 grouped rows for all payments; filterable by
    day/type/paid/party). Verified over HTTP.
- Before/after baselines captured: `scripts/baseline_sql_full.txt`, `scripts/baseline_http.txt`,
  `scripts/after_indexes_http.txt`. Per-page times ~unchanged (indexes don't shorten a full
  view scan); record-level pagination speed is dominated by the full-view materialization.
- Measured win so far: party-ledger filtered request **>180 s → ~4.4 s** on the live DB.
- `scripts/bench_pagination.py` A/B run (26 s vs 23 s) was contaminated by a concurrent
  server and **discarded** — not usable as evidence.
- Latent pre-existing bug found (not introduced here): the old JS payment-summation `+=`
  concatenated string amounts, because `payments_view.amount` falls back to the
  printf-formatted `invoice_view.final_total`.
- Frontend `npm run build` compiles cleanly (48 static pages) with the new cache config and
  the new `usePagedList` helper — log in `scripts/frontend_build2.txt`.
- PocketBase server: 0.22.9 (unchanged — the v0.22.55 upgrade is
  [[POS-0019 Upgrade PocketBase v0.22.9 → v0.22.55]], not started).
  No server is currently running (ports 8090/8095 free); `backend/pb_data_bench` holds a
  **pre-migration** snapshot restored by a `git checkout`.

## Decisions and assumptions

- PocketBase upgrade target = v0.22.55 (drop-in); v0.40.4 = separate tested migration
  ([[POS-0022 Upgrade PocketBase to v0.40.4]] / [[POS-0023 PocketBase v0.40.4 migration test]]).
- Every change has a related test task; tests validate numerical equivalence before any
  report page is rewired.
- All DB schema changes go through `backend/pb_migrations`, never direct DB edits.

## Blockers and unresolved questions

- **Browser rendering of POS-0015 is verified** (see "Completed since"). The
  `agent-browser` CLI is not installed and the `chrome-devtools` MCP is not exposed to the
  agent session, so future browser passes must drive Chrome over CDP directly — the exact
  recipe (auth injection, clock shift to a data-dense month, control test) is recorded in
  [[POS-0016 Report pages render test]].
- **Cache + pagination behaviour now verified.** [[POS-0010 Cache behavior test]] and
  [[POS-0012 Pagination test]] both PASS (see "Completed since previous checkpoint").
  Caveat: the browser-level "no re-fetch within staleTime" check is inferred from verified
  configuration, not from browser automation.
- **`payments_summary` is now used** by the cash memo payments list for its totals
  (see [[POS-0015 Trim expands + adopt pagination in report pages]]).
- **Repo hygiene debt:** `4ac911c` committed the scratch bench DB (~18 MB) plus stray
  `*.err.txt`/`pb_bench*`/`pb_live_smoke*` logs. `.gitignore` now covers them, but they need
  `git rm --cached` in a deliberate commit.
- Open question: does `usePagedList`'s 60 s `staleTime` interact acceptably with the invoice
  picker UX (a stale picker could hide a just-created invoice until invalidation)? Confirm
  during [[POS-0017 Invoice entry pages: paginate + trim expands]].

## Exact next action

1. ~~Write `scripts/tests/test_pagination.py` …~~ **DONE** (PASS).
2. ~~Run [[POS-0010 Cache behavior test]].~~ **DONE** (PASS).
3. ~~[[POS-0015 Trim expands + adopt pagination in report pages]] + [[POS-0016 Report pages render test]]~~
   **DONE** — implementation + in-browser verification; one defect found and fixed.
4. ~~[[POS-0025 Optimize + verify the Daily Sale, Outstanding, and Product Sale reports]]~~
   **DONE** — trims applied and browser-verified; the "missing reports" premise was stale and
   the [[Issue — Standalone Build Drift]] / [[Reconcile the standalone build with source]]
   evidence corrected.
5. ~~[[POS-0017 Invoice entry pages: paginate + trim expands]]~~ **DONE** — selector paged +
   server-searchable, expands dropped; verified by capturing the real requests.
6. Next: [[POS-0018 Regression-test performance suite]] (re-measure page-load timing and
   finalise before/after), then the [[POS-0019 Upgrade PocketBase v0.22.9 → v0.22.55]] upgrade.

## Verification still required

- Final `python scripts/kb_check.py vault` after the last edits.
- Re-run `scripts/tests/test_indexes.py` / `verify_live.py` / `test_report_sql.py` if the
  live DB or migrations change again.
- `scripts/tests/test_pagination.py` / `test_cache_behavior.py` require the live server on
  port 8090 (already running for this session).

## Resume procedure

1. Read [[AA Point of Sale]] (task index + dependency graph).
2. Read this checkpoint.
3. Read [[Work Session — Performance Optimization Plan — 2026-09-20]] (full activity log,
   including the discarded measurement and the corrected false claims).
4. Read [[Performance Baseline]] for all before/after numbers and the caveats.
5. Continue from "Exact next action" above.

## Backend state cheat-sheet (so you don't have to re-derive it)

- Migration files (all applied to live, committed in `4ac911c`):
  - `1789890189_add_performance_indexes.js` — 18 indexes via `collection.indexes`.
  - `1789890300_ledger_party_window_function.js` — window-function running balance.
  - `1789890310_payments_summary_view.js` — new grouped view.
- Apply elsewhere with: `cd backend; .\pocketbase.exe migrate up --dir <data-dir>`.
- Useful read-only tools: `scripts/inspect_db.py`, `scripts/inspect_rules.py`,
  `scripts/inspect_views.py`, `scripts/dump_view_sql.py`, `scripts/verify_live.py`,
  `scripts/perf_baseline.py`, `scripts/perf_http.py`, `scripts/bench_pagination.py`.
- PocketBase view gotchas learned the hard way (both cost a migration iteration):
  a view **must** expose an `id` column (`(ROW_NUMBER() OVER())` works) and PocketBase's
  view parser only accepts a **single function call or plain identifier** per selected
  column — wrap arithmetic in `printf(...)`, as the other views in this project do.
