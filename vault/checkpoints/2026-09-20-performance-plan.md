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
The **frontend adoption** phase (POS-0015 → POS-0017) and the **PocketBase upgrade**
(POS-0019) are **not started**.

## Active tasks

- [[POS-0010 Cache behavior test]] — Ready (next)
- [[POS-0012 Pagination test]] — Ready (next; its script does not exist yet)
- [[POS-0015 Trim expands + adopt pagination in report pages]] — Ready (biggest remaining win)
- [[POS-0016 Report pages render test]] — Ready
- [[POS-0017 Invoice entry pages: paginate + trim expands]] — Ready
- [[POS-0018 Regression-test performance suite]] — Ready (final re-measure)
- [[POS-0019 Upgrade PocketBase v0.22.9 → v0.22.55]] — Ready
- [[POS-0020 PocketBase v0.22.55 regression test]] — Ready
- [[POS-0021 Materialize hot report views into tables]] — Ready (conditional on POS-0018)
- [[POS-0022 Upgrade PocketBase to v0.40.4]] — Backlog (deferred, separate migration)
- [[POS-0023 PocketBase v0.40.4 migration test]] — Backlog
- [[POS-0024 Record performance optimization decisions]] — Ready

## Completed since previous checkpoint

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

**Uncommitted working tree** (intended):
`frontend/src/app/api/useAPI.ts`, `.gitignore`,
`vault/checkpoints/…`, `vault/references/performance-baseline.md`,
`vault/tasks/pos-0009…`, `pos-0011…`, `pos-0012…`, `vault/work-sessions/…`.
(Also pre-existing/unrelated: `.commandcode/taste/taste.md`, `.mcp.json`.)

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

- **The main user-visible win is still outstanding.** The backend is fast now, but the app
  still fetches whole lists: `invoice_view` full list ~26 s, `transactions_report` ~107 s,
  `payments_view` ~111 s, and the Unified/Profit reports still request the 1 MB-per-500-rows
  deep expand. That is [[POS-0015 Trim expands + adopt pagination in report pages]] +
  [[POS-0017 Invoice entry pages: paginate + trim expands]].
- **Nobody has verified the cache behaviour at runtime** ([[POS-0010 Cache behavior test]])
  or the pagination behaviour ([[POS-0012 Pagination test]]) yet.
- **`payments_summary` is built but unused.** No page reads it yet; wiring it into the
  payment/sales report totals is part of [[POS-0015 Trim expands + adopt pagination in report pages]].
- **`scripts/tests/test_pagination.py` does not exist** — an earlier note in this session
  wrongly claimed it did; corrected in [[POS-0012 Pagination test]].
- **Repo hygiene debt:** `4ac911c` committed the scratch bench DB (~18 MB) plus stray
  `*.err.txt`/`pb_bench*`/`pb_live_smoke*` logs. `.gitignore` now covers them, but they need
  `git rm --cached` in a deliberate commit.
- Open question: does `usePagedList`'s 60 s `staleTime` interact acceptably with the invoice
  picker UX (a stale picker could hide a just-created invoice until invalidation)? Confirm
  during [[POS-0010 Cache behavior test]] / [[POS-0017 Invoice entry pages: paginate + trim expands]].

## Exact next action

1. Write `scripts/tests/test_pagination.py` against the live API and run it → close
   [[POS-0012 Pagination test]].
2. Run [[POS-0010 Cache behavior test]] (no re-fetch inside `staleTime`; correct refresh
   after a write).
3. Then start [[POS-0015 Trim expands + adopt pagination in report pages]].

## Verification still required

- Final `python scripts/kb_check.py vault` after the last edits:
  **RESULT: PASS** — quality 100/100, 470 resolved links / 0 unresolved, 0 orphans,
  tasks 24 (8 Done, 8 of those verified), 25 dependency edges, 55 distinct tags.
- Re-run `scripts/tests/test_indexes.py` / `verify_live.py` / `test_report_sql.py` if the
  live DB or migrations change again.

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
