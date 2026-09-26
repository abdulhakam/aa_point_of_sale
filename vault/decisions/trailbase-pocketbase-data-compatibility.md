---
title: Keep the PocketBase data contract (timestamps, table names, money type)
type: decision
status: accepted
decided_on: 2026-09-24
created: 2026-09-26
tags: [trailbase, compatibility, timestamps, migration]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[data-model]]", "[[backend]]"]
---

# Keep the PocketBase data contract (timestamps, table names, money type)

## Context

The TrailBase schema could have been designed freely: `UNIXEPOCH()` integers for timestamps,
whatever table and column names read best, integer cents for money. But data has to move out of
a live PocketBase instance into it ([[pos-0027-migrate-production-data-to-trailbase]]), and the
legacy frontend ([[frontend]]) keeps running alongside during the transition.

TrailBase's own idiom for time is an 8-byte `UNIXEPOCH()` integer, which is smaller and sorts
faster than text.

## Decision

Three parts of the old data contract are kept **on purpose**:

### 1. Timestamp format is byte-compatible with PocketBase

`created` / `updated` are `TEXT` in PocketBase's exact `'%Y-%m-%d %H:%M:%fZ'` format, e.g.
`2026-09-24 16:17:32.436Z`:

```sql
"created" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ','now')) CHECK (datetime("created") IS NOT NULL)
```

### 2. Table and column names stay as PocketBase had them

`order_bookers`, `invoiceNo`, `box_size_qty`, the `*_types` vocabulary tables — and, notably,
**`'recieving'` keeps its misspelling**, because PocketBase, the old views and the ledger logic
all used that spelling. The migration carries a comment saying so.

### 3. Money stays `REAL`

`cost_price`, `sale_price`, `amount`, `price`, `discount_1`, `discount_2`, `discount_rs`,
`box_size_qty` are `REAL NOT NULL DEFAULT 0`.

## Rationale

- A 24-byte text timestamp costs more than an 8-byte integer, **but at this row count the
  difference is irrelevant**, while breaking the existing filters and export format would not
  be. The legacy frontend filters ranges with `created >= '…'` string comparisons; those must
  keep working against exported and re-imported data.
- Kept names mean the migration is a *value* translation, not a rename plus a value
  translation, and every legacy screen keeps referring to the same fields.
- `REAL` was kept for the same reason — compatibility, not correctness. That is explicitly
  acknowledged as a debt rather than a preference (see below).

## Consequences

**Accepted**

- Exported PocketBase data stays lexicographically comparable with newly inserted TrailBase
  rows.
- `frontend-ssr`'s probe works partly *because* of this: ids are time-sortable UUIDv7 and
  `updated` is a comparable string, so `{count, newest updated}` is a usable fingerprint
  ([[trailbase-incremental-report-refresh]]).
- The migration is a straight value translation — the table in [[data-model]] — which the
  `import-from-v1` plugin already implements.

**Debt this creates**

- **Money as `REAL` means binary float drift**, which every old view hid by wrapping amounts in
  `printf("%.2f")`. `trailbase/README.md` records the follow-up: "Moving prices and amounts to
  `INTEGER` cents is both more correct and faster, and is a mechanical change while the database
  is still empty." Tracked as [[tb-0015-integer-cents-for-money]] — this decision is the reason
  that task is small, and it is the reason to do it before the migration rather than after.
- `'recieving'` propagates. Any cleanup has to change PocketBase, the old views, the ledger
  arithmetic, the TrailBase migration and both frontends at once, or none of them
  ([[glossary]]).
- `invoiceNo` is `REAL`, not `INTEGER`, purely for compatibility, so it sorts numerically but is
  not an integer type.

## Evidence

- `trailbase/traildepot/migrations/main/U1790208000__create_base_tables.sql` — the `created` /
  `updated` defaults on all 17 tables; the `'recieving'` comment ("spelled the way PocketBase
  spelled it; the frontend, the old views and the ledger logic all used that spelling"); every
  `REAL` money column.
- `trailbase/README.md` § *Design decisions* → "**Timestamp format is byte-compatible with
  PocketBase.**" and § *Follow-ups* item 4 on integer cents.
- `frontend/src/app/api/useAPI.ts` / `providers.tsx` — the legacy range filters this protects.
