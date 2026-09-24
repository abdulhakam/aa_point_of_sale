---
type: Task
status: Backlog
ticket: TB-0003
priority: P2
belongs_to:
  - "[[TrailBase Backend]]"
related_to:
  - "[[Backend — PocketBase Data Service]]"
  - "[[Data Model]]"
created: 2026-09-24
updated: 2026-09-24
tags:
  - trailbase
  - migration
  - data
---

# TB-0003 Migrate PocketBase data into the TrailBase schema

## Goal

Load the live PocketBase data into the TrailBase tables with equivalent meaning, so the TrailBase backend
can be exercised on real volumes instead of seeded rows.

## Done when

- Row counts reconcile per table against `backend/pb_data/data.db`.
- Enum values are translated, not dropped, and the JSON company arrays have become link rows.
- Spot-checked totals (invoice totals, item stock, party balances) match the PocketBase views for the
  same rows.
- Every id that escapes the database (printed invoice numbers, QR payloads) has a remapping decision.

## Context

This is the step that will expose real performance characteristics; the schema was validated on a few
seeded rows only. Value translations and the id caveat are documented in `trailbase/README.md`
(`## Data migration`):

| Old value | New value |
|---|---|
| `parties.type`: `''` / `customer` / `supplier` | `NULL` / `0` / `1` |
| `invoices.type`: `''` / `purchase` / `sale` / `return` / `difference` | `NULL` / `0` / `1` / `2` / `3` |
| `payments.type`: `''` / `sending` / `recieving` / `return` | `NULL` / `0` / `1` / `2` |
| `parties.company`, `order_bookers.company` (JSON id arrays) | one `party_companies` / `order_booker_companies` row per id |

Ids are regenerated as UUIDv7 unless the insert uses `uuid_parse('<uuid text>')`, which preserves them
(the loader must supply exactly 16 bytes with version 7, or `is_uuid_v7` rejects the row).

Held deliberately: see [[TrailBase Backend]]. The TrailBase system's specs are expected to change
substantially, so this should not be started until they are re-stated — the translation table above is
the part most likely to change with them.

## Verification

To be written when the task starts. It must include the per-table reconciliation query and the report
spot-checks against the PocketBase views, plus a check that no enum value silently became `NULL`
because it was missing from its vocabulary table.

## Related

- [[Backend — PocketBase Data Service]] — the source of the data.
- [[Data Model]] — collections, fields and relationships on the PocketBase side.
- [[Decision — Keep PocketBase-compatible data shapes]] — why the timestamp and boolean formats line up.
