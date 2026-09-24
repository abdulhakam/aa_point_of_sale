---
type: Decision
status: Accepted
created: 2026-09-24
updated: 2026-09-24
belongs_to:
  - "[[TrailBase Backend]]"
related_to:
  - "[[Backend — TrailBase Server]]"
  - "[[Reports & Ledgers]]"
affects:
  - "[[TrailBase Backend]]"
tags:
  - trailbase
  - schema
  - views
  - reports
---

# Decision — Drop SQL views; aggregate reports client-side

## Status

Accepted (2026-09-24). In force in the TrailBase schema.

## Context

PocketBase carries the report and ledger arithmetic in **view collections** (15 of them), which is why
"where is X computed" answers live in view SQL — see [[Decision — Use PocketBase and Next.js]]. The
earlier TrailBase scaffold ported 14 of those views, and against TrailBase's rules four of them could
not be exposed through a record API at all (`ledger_journal` needs `UNION ALL`, `payments_summary` and
`payments_invoices_report` have no base-table key matching their grain, `counts_for_row_numbers` is a
single synthetic row).

## Decision

The TrailBase schema has **no views**. It exposes base tables plus indexes, and report/ledger
aggregation is done by the client from those tables. The existing view SQL is retained as the
specification of the arithmetic, not as a deployed object.

## Consequences

- No recomputed-on-read scans: every report query is now a direct, indexable base-table query
  (`transactions` by `invoice`/`item`, `invoices` by `party`/`booker`/`type`/`date`, ...).
- The frontend loses the view endpoints it used (`transaction_view`, `invoice_view`, `items_report`,
  `items_difference_report`, `net_price`, `payments_view`, `ledger_*`, `transactions_report`,
  `outstanding_summary`) and must aggregate itself. This is the largest part of the frontend rework
  in [[TB-0002 Wire a frontend to the TrailBase server]].
- Money arithmetic that previously had one SQL definition can now be written in more than one place,
  which is a real regression risk: the SQL in `full_database_schema.sql` and
  `../dltbl/views_from_pb/U1776088644__create_views.sql` is the reference that keeps the client honest.
- Fewer moving parts: no view SQL to keep consistent with the schema on every migration.

## Alternatives considered

- **Keep the views unexposed** (SQLite views usable only from the admin query tool / SQL) — still
  recomputed on every read and still not indexable, so it pays the cost without the API benefit.
- **Materialise the hot views into tables** maintained by triggers — write-time cost and staleness;
  this was the PocketBase-side plan ([[POS-0021 Materialize hot report views into tables]]) and it
  only ever paid off where a specific report was still too slow *after* indexing.
- **A WASM custom handler running the old view SQL** — the most faithful port, but it adds a build
  artifact and a runtime to maintain. Kept as the first escalation if client aggregation proves too slow.

## Evidence

- The four unexposable views and the type-inference rules are recorded in
  [[Issue — TrailBase view type-inference limits]].
- The view SQL is preserved verbatim in `full_database_schema.sql` and `../dltbl/views_from_pb/`.
- The TrailBase schema ships zero `CREATE VIEW` statements (single migration,
  `traildepot/migrations/main/U1790208000__create_base_tables.sql`), and the server boots with all
  record APIs resolving.

## Revisit when

- A report measured on real data is too slow for client aggregation. Escalate in order: a WASM handler
  running the preserved SQL, then a materialised table with a refresh trigger.
- Report correctness drifts between the client implementation and the preserved SQL (then centralise).

## Related

- [[Issue — TrailBase view type-inference limits]]
- [[Reports & Ledgers]] — what each report computed, from the live view SQL.
- [[Backend — TrailBase Server]]
