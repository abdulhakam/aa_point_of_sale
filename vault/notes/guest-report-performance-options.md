---
title: Guest report performance options, ranked
type: note
status: active
created: 2026-09-27
tags: [trailbase, wasm, rquickjs, performance, reports, sql, caching]
related_to: ["[[guest-vs-node-performance]]", "[[guest-app-host-port]]", "[[guest-fingerprint-refresh]]", "[[guest-report-result-cache]]", "[[dispatcher-transpiled-per-request]]", "[[trailbase-guest-cpu-js-limits]]"]
---

# Guest report performance options, ranked

Where the time goes today (measured, [[guest-vs-node-performance]]), and what to do about it.

| Cost | Evidence |
|---|---|
| **Per-request transpile + eval of the dispatcher** | `run_route` reads and `compile_ts`s `_app/route.ts` on every request ([[dispatcher-transpiled-per-request]]) — the ~20–30 ms baseline |
| **View build in the JS interpreter** | cold profit report **18.7 s** (21,815 rows) vs Node 4.2 s; ~1×10⁶ ops/s ([[trailbase-guest-cpu-js-limits]]) |
| **JS↔Rust JSON of large payloads** | warm profit render **4.6 s** (result stringified in QuickJS, parsed by Rust for minijinja); `/p` data warm **3.3 s** (ships select tables) |
| **Reading whole tables** | `readTable` is `SELECT <cols> FROM t ORDER BY id DESC` — no `WHERE`, so every report reads ~60k rows |

Indexes are **not** the problem: the depot carries the legacy performance indexes
(`idx_transactions_invoice`, `idx_payments_party_paid_type`, `idx_invoices_type_created`, …),
verified in `trailbase/traildepot/migrations/main`.

## Progress

- **Option 1 — DONE (2026-09-27).** `runtime.rs` caches the processed (transpiled) route source by
  content hash; the file is still read per request so edits stay live. Small requests dropped
  ~30–40 % (`/healthz` 28→19 ms warm, `/reports/status` 24→15 ms, `/management/items` 73→60 ms);
  report warm times barely moved (profit 4577→3932 ms), as expected. Details:
  [[dispatcher-transpiled-per-request]].
- **Option 2 — IN PROGRESS (2026-09-27).** All 15 legacy report/ledger views extracted **verbatim**
  from `backend/p_data/data.db` into `runtime-js/site/app/reports/sql/views/` (the migrations only
  carry some), with two documented adaptations: PocketBase's double-quoted string literals
  normalised to single quotes, and `payments_view`'s `order_bookers.company` re-pointed at the
  `order_booker_companies` link table. A composer inlines dependencies as CTEs; **15/15 now run
  against the depot** with row counts matching PocketBase where comparable
  ([[legacy-report-sql-uses-company-columns]]). An equivalence gate
  (`runtime-js/tools/view-equivalence.mjs`) then showed **0/13 views identical**: the legacy SQL is
  not equivalent to the JS views serving the reports (formatting, columns, and genuine math
  differences). The parity reference is the **JS**, so each view is reconciled against it
  ([[legacy-sql-views-differ-from-js-views]]). Converting `printf` to numbers collapsed the
  formatting differences (`transactionView` 46,826 → 34 differing rows of 23,413), leaving a
  **rounding residue** — SQLite `round()` ≠ JS `round2()`. Emitting a JS-faithful rounding
  expression (`Math.round((x+EPSILON)*100)/100`, `COALESCE` for `num()`), leaving the fields the JS
  keeps raw unrounded, and ignoring float-representation noise in the comparator, made
  **`transactionView` (23,413) and `invoiceView` (8,927) byte-identical**, and `transactionsReport`
  down to 2/23,413 rows. The gate's split became the strategy: **SQL for the base views (the
  expensive scans/joins), JS for the report-level derivations (the policy)** —
  [[convert-base-views-not-derivations]]. **Enabled (2026-09-27)** once the owner's **2 dp money
  rule** ([[money-is-2dp-everywhere]]) removed the float flake: differential **14/14 on three
  consecutive runs** with the SQL path on, smoke 71/71. Measured: profit cold 16.6 → **13.9 s**,
  dashboard cold 2.3 s → **0.26 s**, `/p` data 2.7 → 2.4 s; warm profit unchanged (~4 s — the
  JS↔Rust payload, which option 3 targets). Task: [[tb-0022-move-reports-to-sql]].

## Ranked options

1. **Cache the compiled dispatcher** (host) — **done** (see Progress).
2. **Push filtering and aggregation into SQL** (biggest CPU win). Do the `WHERE`, `GROUP BY` and
   totals in SQLite — in C — and return only final rows/totals. The filter set
   (`from`/`to`/party/area/section/booker/type/item/invoice) maps straight to SQL predicates. The
   legacy already had this arithmetic as **SQL views** (preserved in the repo and vault,
   [[trailbase-drop-sql-views]]); recreating them as TrailBase views removes the JS passes and the
   20 s-cliff risk. The pure-SQL reports are the ledgers, item sales, differences, outstanding,
   stock and product/daily sales. **This does not cost the no-build authoring goal** — the SQL
   lives under `app/` and is executed at runtime ([[report-logic-stays-runtime-file-based]]).
3. **Render reports in Rust, not JS — MEASURED, and the premise was wrong.** The theory was that
   the warm render (profit ~4 s) is dominated by moving 21,815 rows from QuickJS into Rust. Tested
   by shipping the rows **columnar** (`{__columns, rows: [[…]]}`) and expanding them back in Rust:
   **no gain — warm profit 4.00 → 4.32 s, `/p` data 2.42 → 2.82 s** (reverted). So the cost is not
   the JSON crossing the boundary; it is **`minijinja` rendering ~21.8k rows into HTML** (and, for
   `/p` data, the JS `JSON.stringify` of the payload itself). The real lever is therefore to
   **render fewer rows** — paginate/limit report pages, or make the large reports
   client-rendered from `/p/<slug>/data` — not to change the transport. That is a product decision
   (does a report page need all 21k rows at once?), so it is left open rather than guessed.
4. **Precompute off the request path with the queue.** The durable queue (with worker fan-out
   across the runtime threads) can rebuild the heavy views or the common filtered results after
   writes (debounced) or on a schedule, storing them in KV/materialised tables, so a request is a
   KV hit. This removes the cold build (18.7 s) from the request path entirely.
5. **Materialise the derived views as SQLite tables.** The plan's Phase 5 option
   ([[guest-fingerprint-refresh]]): keep the fingerprint machinery for *when* to rebuild, but the
   rebuild writes tables and reads are plain `SELECT`s.
6. **Shrink the `/p/<slug>/data` payload.** Ship only what a screen needs (or paginate rows)
   instead of whole select tables — cuts the 3.3 s warm cost. gzip helps the network half.
7. **Make the KV cache durable across restarts.** The report cache key includes a per-process
   nonce ([[guest-report-result-cache]]), so a restart always misses. Keying on a data fingerprint
   instead would let the cache survive restarts; add eviction/TTL at the same time.
8. **Build independent views in parallel** via the existing worker fan-out when a cold build is
   unavoidable (each view is independent; the runtime has 4 threads).

## Suggested order

1 → 2 → 3 → 4, with 6/7/8 as cheap follow-ups. Steps 1 and 2 are independent of the invoice work
and reduce the risk there too (invoice entry will make the data bigger).

## The deeper point

The Node service does the same computation **off the request path** in `worker_threads`; the guest
cannot, because its JS is a single interpreter with a 20 s call deadline. So the durable answer is
to stop computing reports in JS **by default**: **SQL for the arithmetic, Rust for the render, the
queue for the warmth.** JS keeps the authoring surface (the `app/` logic), not the hot path.

That is a default, not a straitjacket: a report that is genuinely too much for SQL can declare
`strategy: "js"` (or `.ts`) and still be edited as a runtime file with no rebuild
([[report-logic-stays-runtime-file-based]]).

## Related

- [[guest-vs-node-performance]] — the measurements.
- [[guest-report-result-cache]] — the cache that exists today.
- [[dispatcher-transpiled-per-request]] — option 1.
