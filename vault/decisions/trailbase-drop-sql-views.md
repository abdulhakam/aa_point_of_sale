---
title: Drop SQL views and aggregate reports client-side
type: decision
status: accepted
decided_on: 2026-09-24
created: 2026-09-26
tags: [trailbase, views, reports, aggregation]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[reports-and-ledgers]]", "[[backend]]"]
---

# Drop SQL views and aggregate reports client-side

## Context

The PocketBase backend expresses report arithmetic as SQL views — `payments_view`,
`invoice_view`, `transaction_view`, `transactions_report`, `items_report`,
`items_difference_report`, `payments_invoices_report`, `ledger_journal`, `ledger_party`,
`ledger_booker`, `ledger_area`, `net_price`, `outstanding_summary`, `counts_for_row_numbers`
([[backend]]). They are consumed as if they were tables: `pocketbase-types.ts` has one generated
record type per view, and report screens fetch whole views.

TrailBase cannot expose most of them. A view can only be exposed when **every output column is
statically typeable**, which rules out `WITH`, `UNION`, reading from another view, and any grain
whose `id` is not a base-table primary key that is also the grouping key. Under those rules four
views could not be exposed at all, and the remaining ones only ever produced rows the client
re-filtered and re-summed anyway.

## Decision

**TrailBase has no views.** The schema is 17 base tables only. Report arithmetic moves into
JavaScript, in `frontend-ssr/compute/views.js` and `compute/reports.js`, where it is written to
reproduce the old view SQL exactly — including its known quirks — so that output can be compared
for the same rows.

## Why not the alternatives

| Alternative | Why not |
|---|---|
| Materialised tables maintained by triggers | Correct but much more schema to own, and the arithmetic still has to be written somewhere; deferred, not rejected — `trailbase/README.md` keeps it as the option for later |
| A TrailBase WASM handler | Would keep the arithmetic server-side and is explicitly named as a future option in `trailbase/README.md`; too much machinery for the first cut |
| Rewrite the views so they satisfy TrailBase's typing rules | That means rewriting them into grains nobody asked for (per-day, per-party) — the report screens filter and total per request, so their shape would have to change too |
| Keep PocketBase | The whole point of the workstream ([[aa-point-of-sale]]); the views are also the main performance problem ([[performance-and-caching]]) |

## Consequences

**Accepted**

- `frontend-ssr/compute/views.js` rebuilds all 14 derived views plus `refs` and `counts`
  ([[reports-and-ledgers]] lists the builders).
- The arithmetic is **one implementation, two runtimes**: the files are served at `/compute/*`
  (behind auth) as the same bytes Node imports, so the browser can run them in a worker with no
  drift.
- Because the rebuild is pure and incremental, only the views a changed table feeds are
  recomputed (`viewsAffectedBy`), and the results are cached — see
  [[trailbase-incremental-report-refresh]].
- Report screens must total in the client, which is what they already did; the change is that
  the *row set* is now a base-table slice rather than a view.

**Given up**

- No server-side aggregation on the new side. A very large `transactions` table is read whole
  into the snapshot. This is the same trade PocketBase's later migrations attacked from the SQL
  side (`payments_summary`, `add_performance_indexes`), so it is a genuine regression in that
  specific dimension — mitigated by the warm snapshot being read once per change rather than per
  request, and by the indexes in [[data-model]].
- The old SQL is now a *specification*, not executable code. It is preserved verbatim in the
  PocketBase migrations and in the parent-directory artefacts
  (`full_database_schema.sql`, `dltbl/views_from_pb/…`), which is also the reference for anyone
  adding a WASM handler later. See [[stale-schema-sql-paths]].
- The legacy frontend's view-shaped endpoints have no TrailBase equivalent, which is a real
  migration cost: [[tb-0013-rework-report-screens-without-views]].

## Evidence

- `trailbase/README.md` § *Design decisions* → "**No views.**" with the typing rules spelled out,
  and § *Known TrailBase limitations* which records this as measured against `v0.33.15` and
  re-checked on `v0.33.22`.
- `frontend-ssr/compute/views.js` — 22,926 bytes, `buildView` / `viewsAffectedBy` / `viewClosure`
  / `tablesForViews` / `buildViews` / `buildSelectedViews`.
- `frontend-ssr/src/lib/reports/worker.js` — runs `buildViews` and `runReport` off the request
  thread.
- The `refs` pseudo-view, which is not from the old SQL at all but exists so a view-based page
  can also receive the reference maps its filters need.
