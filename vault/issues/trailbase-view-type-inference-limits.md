---
title: TrailBase can only expose a view whose output columns are all statically typeable
type: issue
status: known-limitation
severity: medium
created: 2026-09-26
tags: [trailbase, views, upstream, limitations]
related_to: ["[[trailbase-drop-sql-views]]", "[[reports-and-ledgers]]"]
---

# TrailBase can only expose a view whose output columns are all statically typeable

## The limitation

A SQLite view can be exposed as a record API only when every output column is statically
typeable. In practice that rules out:

- `WITH` (common table expressions),
- `UNION`,
- reading from another view,
- any grain whose `id` is not a **base-table primary key that is also the grouping key**.

Determined empirically against `trail v0.33.15` and re-checked on `v0.33.22`. The releases in
between (`v0.33.16`–`v0.33.22`) changed WASM guests, the admin UI, schema-name parsing and batch
error propagation — none of which touch this path.

## What it cost

Four of the legacy views could not be exposed **at all**:

| View | Why it fails |
|---|---|
| `ledger_journal` | grain is not a base-table primary key (and it aggregates across sources) |
| `payments_summary` | grouped by day + dimensions; `id` is not a base-table PK that is also the grouping key |
| `payments_invoices_report` | joins/aggregates beyond a single base table's PK |
| `counts_for_row_numbers` | a set of independent counts, not a row keyed by a base PK |

The remaining views *could* in principle be exposed, but they only ever produced report rows that
the frontend filtered and summed again — so exposing them would have bought nothing except the
ability to keep view-shaped endpoints.

Because of this, the TrailBase schema has **no views at all**; report arithmetic moved into
JavaScript ([[trailbase-drop-sql-views]]), and the whole design follows from that
([[reports-and-ledgers]]).

## What is still possible

This is a *view* limitation, not a general one. The preserved SQL can be brought back
server-side in at least two ways that were explicitly left open in `trailbase/README.md`:

1. **A materialised table** maintained by triggers — a real table with a real primary key, so it
   is exposable, and the query result is indexable.
2. **A TrailBase WASM handler** — arbitrary code server-side, which is also the natural home for
   the aggregation if it is ever wanted off the client.

Neither is started. The option matters because the current JavaScript aggregation reads whole base
tables into the snapshot ([[performance-and-caching]]), so a materialised `payments_summary`-style
table is the obvious answer if the data grows.

The SQL for both is preserved in the PocketBase migrations —
`1789890300_ledger_party_window_function.js`, `1789890310_payments_summary_view.js` — and in the
parent-directory artefacts `full_database_schema.sql` /
`dltbl/views_from_pb/U1776088644__create_views.sql`. ⚠️ The READMEs' path to those artefacts is
wrong; see [[stale-schema-sql-paths]].

## Secondary effects

- `pocketbase-types.ts` still carries a record type per view (`PaymentsViewRecord`,
  `InvoiceViewRecord`, …). Those types can never be generated from a TrailBase server, so any
  frontend that keeps them must keep them by hand — a permanent source of drift until
  [[tb-0013-rework-report-screens-without-views]].
- `counts_for_row_numbers` is used by the dashboard in both frontends. On the TrailBase side it is
  `buildCounts(base)` in `compute/views.js`, i.e. a client-side computation, not a `COUNT(*)` — the
  dashboard therefore depends on the snapshot being warm ([[trailbase-incremental-report-refresh]]).

## Evidence

- `trailbase/README.md` § *Design decisions* → "**No views.**" with the typing rules spelled out,
  and § *Known TrailBase limitations* → the first bullet, verbatim, naming `WITH`, `UNION`,
  reading from another view, and the PK/grouping-key rule.
- `trailbase/README.md` § *No views* in *Design decisions* — naming the four views that "could not
  be exposed at all" and stating that the rest "only ever produced report rows that the frontend
  filtered and summed again anyway".
- `trailbase/traildepot/migrations/main/U1790208000__create_base_tables.sql` — 17 `CREATE TABLE`
  statements and **zero `CREATE VIEW`**.
- The prior vault recorded this as `issues/trailbase-view-type-inference-limits.md`; see
  [[previous-vault-recovery]].
