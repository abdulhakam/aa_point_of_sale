---
type: Issue
status: Open
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
  - views
  - limitation
  - reports
---

# Issue — TrailBase view type-inference limits

## Summary

TrailBase can only expose a `VIEW` as a record API when **every** output column has a statically
inferable type, and the exposed `id` must be a base-table primary-key column that is also the grouping
key. PocketBase's 15 report/ledger view collections were built without those constraints, so a faithful
port is not exposable.

## Evidence

Recorded while porting the PocketBase views in this directory (measured against `trail v0.33.15` at the
time, by probing which view definitions the server would accept). **Not re-measured on 2026-09-24**,
because the views were removed rather than fixed; treat this as the prior empirical result, not as a
fresh observation.

Constructs that are **not** supported:

| Construct | Consequence |
|---|---|
| Reading from another `VIEW` (PocketBase layered `payments_view` → `invoice_view` → `transaction_view`) | Each view had to be flattened to recompute invoice totals from `transactions`. |
| Common table expressions (`WITH …`) | `ledger_area`'s `WITH balances` had to become aggregates in the same `GROUP BY`. |
| `UNION` / `UNION ALL` | `ledger_journal` merges payment and expense rows, so it cannot be exposed at all. |
| A synthetic or expression primary key (`ROW_NUMBER() OVER ()`, a literal, `CAST(1 AS INTEGER)`) | The exposed `id` must be a base-table PK reference that is also the grouping key. |
| `GROUP BY` on a non-key while exposing a different `id` | Same rule. |

Supported: a direct base-table column reference; an aggregate/`GROUP BY`/window function **over base
tables** wrapped in a top-level `CAST(...)`; a scalar subquery or `CASE` wrapped in `CAST(...)`.

Consequently four views could never be exposed: `ledger_journal` (needs `UNION ALL`), `payments_summary`
and `payments_invoices_report` (no base key matches their grain), and `counts_for_row_numbers` (one
synthetic row).

## Impact

- Report and ledger logic cannot live in the database the way it does in PocketBase, which removes the
  "one SQL definition of money math" property the PocketBase decision relied on — see
  [[Decision — Use PocketBase and Next.js]] and [[Decision — Drop SQL views; aggregate reports client-side]].
- It also means a `VIEW` cannot be used as a cheap compatibility shim for a shape the API cannot express
  directly, so schema changes land in the client instead.

## Options

1. Aggregate in the client from indexed base tables (current choice; see the drop-views decision).
2. A WASM custom handler that runs the preserved SQL and returns the rows, bypassing record-API typing.
3. Materialise the hot results into real tables maintained by triggers, then expose the table.
4. Re-check on upgrade — the rules are version-specific and may loosen.

## Workaround

The original SQL is preserved verbatim in `../full_database_schema.sql` and
`../dltbl/views_from_pb/U1776088644__create_views.sql`, and remains runnable through the admin query
tool or a WASM handler, so the arithmetic itself is not lost.

## Related

- [[Decision — Drop SQL views; aggregate reports client-side]]
- [[Reports & Ledgers]] — what each view computed.
- [[Issue — TrailBase rejects scalar JSON-schema columns]] — the other empirically-found limitation.
