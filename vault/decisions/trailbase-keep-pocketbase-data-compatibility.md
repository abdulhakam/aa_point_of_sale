---
type: Decision
status: Accepted
created: 2026-09-24
updated: 2026-09-24
belongs_to:
  - "[[TrailBase Backend]]"
related_to:
  - "[[Backend — PocketBase Data Service]]"
affects:
  - "[[TrailBase Backend]]"
tags:
  - trailbase
  - schema
  - migration
  - compatibility
---

# Decision — Keep PocketBase-compatible data shapes

## Status

Accepted (2026-09-24). In force in the TrailBase schema, and expected to be revisited when the
TrailBase specs settle.

## Context

The data still lives in PocketBase and the frontend still reads it through PocketBase-shaped filters
and exports. TrailBase is free to use its own conventions — its own `_user` table stores `created` as
an `INTEGER` `UNIXEPOCH()` value — and a fresh schema is the cheapest moment to adopt them.

## Decision

Where PocketBase and a "clean" design disagree, the TrailBase schema keeps the PocketBase-compatible
shape:

- `created` / `updated` are `TEXT` in PocketBase's exact `'%Y-%m-%d %H:%M:%fZ'` format
  (`2026-09-24 16:17:32.436Z`), maintained by an `AFTER UPDATE` trigger per table.
- Optional date columns keep the empty-string sentinel (`''`) with a `datetime()` check, because the
  frontend tests `= ''`.
- Booleans are `INTEGER` `0`/`1` and are returned as JSON integers, not `true`/`false`.
- Money and quantities stay `REAL`.
- The misspelling `recieving` is kept as a `payment_types` name and a documented code meaning, because
  the frontend and the ledger logic both used it.

## Consequences

- Rows exported from PocketBase stay lexicographically comparable with new rows, imports need no
  timestamp transformation, and existing `created >= '…'` range filters keep working.
- A 24-byte text timestamp costs more than TrailBase's 8-byte integer, and `''` is a weaker "unset"
  than `NULL`. At this row size the difference is not measurable; the compatibility is.
- `REAL` money carries binary float drift, which the old views hid by wrapping every amount in
  `printf("%.2f")`. Client-side aggregation now has to be equally careful, or the representation has to
  change.
- The API reports `0`/`1` where PocketBase reported `true`/`false`, so clients must not rely on JSON
  booleans.

## Alternatives considered

- **TrailBase-native shapes** (`UNIXEPOCH()` integers, `NULL` for unset dates): cleaner and slightly
  smaller, but it breaks export compatibility and every date filter for a gain that is not measurable
  at this row count. Nothing needed it yet.
- **Integer cents for money**: the correct fix for float drift and a mechanical change while the
  database is still empty — but it also changes every frontend amount, so it belongs with
  [[TB-0002 Wire a frontend to the TrailBase server]], not with the schema port.
- **A `VIEW` or `CAST` layer to present booleans as `true`/`false`**: adds a view, which
  [[Decision — Drop SQL views; aggregate reports client-side]] exists to avoid.

## Evidence

- `traildepot/migrations/main/U1790208000__create_base_tables.sql` uses PocketBase's timestamp
  expression (`strftime('%Y-%m-%d %H:%M:%fZ','now')`) and the `''` date sentinels.
- Live API reads return `"created":"2026-09-24 16:56:41.559Z"`, `"deleted":0`, `"paid":1`.
- The old views' `printf("%.2f", …)` wrapping is visible in `full_database_schema.sql`.

## Revisit when

- The PocketBase copy is retired as the data source — then TrailBase-native types are free.
- Money correctness becomes a topic (float drift in a report, or an audit) — then move to integer cents
  and regenerate the affected comparisons.
- The specs described here change wholesale, which is expected soon: re-decide each bullet rather than
  carrying it forward by default.

## Related

- [[TB-0003 Migrate PocketBase data into the TrailBase schema]] — the migration these shapes enable.
- [[Decision — Use PocketBase and Next.js]] — the system these shapes came from.
- [[Backend — TrailBase Server]]
