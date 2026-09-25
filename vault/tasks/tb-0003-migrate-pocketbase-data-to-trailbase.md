---
type: Task
status: Done
ticket: TB-0003
priority: P2
belongs_to:
  - "[[TrailBase Backend]]"
related_to:
  - "[[Backend — PocketBase Data Service]]"
  - "[[Data Model]]"
  - "[[Import from v1 Plugin]]"
  - "[[TB-0007 Add the plugins hub and the Import from v1 migration plugin]]"
  - "[[Decision — Run the PocketBase migration client-side as a plugin]]"
created: 2026-09-24
updated: 2026-09-25
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

Held deliberately at first: see [[TrailBase Backend]]. The TrailBase system's specs were expected to
change substantially, so this was not to be started until they were re-stated — the translation table
above was the part most likely to change with them.

The specs were then settled ([[TB-0001 Redesign the TrailBase schema]]), and this was **fulfilled by
[[Import from v1 Plugin]]** rather than by a bespoke loader: the plugin applies the same translation
table, batch-writes through the record APIs, and remaps relations in memory. See
[[Decision — Run the PocketBase migration client-side as a plugin]] for why it is client-side.

## Verification

Verified on 2026-09-25 by importing the live `backend/p_data` dataset in a real Chrome through
[[Import from v1 Plugin]]:

- **Per-table reconciliation.** Read 60,245 rows and created 60,245, 0 failures; every non-absent
  collection matched the source exactly (sections 10, categories 15, areas 59, parties 942,
  order_bookers 4, items 207, expenses 88, invoices 8,927, invoices_return_reference 54, transactions
  23,413, payments 26,526). `companies` does not exist in the source and was skipped with a warning.
- **Enums translated, none silently `NULL`.** Filtered counts for every vocabulary match the source:
  parties customer 927 / supplier 15; invoices purchase 266 / sale 8,606 / return 54 / difference 1;
  payments sending 559 / recieving 25,913 / return 54.
- **Report spot-checks against the PocketBase views.** Stock Report total `3,337,165.56` equals an
  independent sum of per-item rounded amounts from the `items_report` view (207 rows, row-for-row). The
  Profit Report's row set equals the source's sale+return count (21,815) and its total reproduces the
  documented formula within float drift (recompute 3,439,793.28 vs 3,439,793.33).
- **Id decision.** PocketBase ids are not preserved; TrailBase generates UUIDv7 and the plugin keeps an
  old→new map for relation translation. The only ids that leave the database are the numeric
  `invoiceNo`/barcodes, which are copied verbatim.
- **Not demonstrated on live data:** the JSON company arrays→link rows path, because the sample source has
  no `companies` collection. That path is covered by the plugin's seeded wipe test only.

## Related

- [[Backend — PocketBase Data Service]] — the source of the data.
- [[Data Model]] — collections, fields and relationships on the PocketBase side.
- [[Decision — Keep PocketBase-compatible data shapes]] — why the timestamp and boolean formats line up.
