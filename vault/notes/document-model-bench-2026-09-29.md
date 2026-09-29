---
title: Document model benchmark — one JSON document per invoice, with indexed generated columns
type: note
status: active
created: 2026-09-29
system: new
tags: [benchmark, document-model, json, generated-columns, sql, reports, invoices]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[component-split-and-sql-materialised-tables]]", "[[reports-and-ledgers]]", "[[tb-0021-invoices-cashmemos-printing]]", "[[trailbase-guest-cpu-js-limits]]", "[[report-sql-filters-on-text-enums-returns-nothing]]", "[[guest-depot-created-is-import-time]]"]
---

# Document model benchmark — one JSON document per invoice, with indexed generated columns

Question asked 2026-09-29: should an invoice be **one self-contained JSON document** — lines,
payments, totals, remaining amount all nested inside it — rather than a header row plus a
`transactions` table plus a `payments` table?

Reproduce with `python trailbase/tools/document-model-bench.py`. It copies
`traildepot/data/main.db` to a scratch file, so the live depot is never written to. Every number
below comes from that file, on the production-size depot: 8,927 invoices, 23,413 transactions,
26,526 payments, 88 expenses.

## Result

**Yes for the invoice read path, no as a replacement for the line table.** With `STORED`
generated columns the document matches plain relational columns on every report scan except
line-level aggregation, and it is dramatically better for the single-invoice read.

| scan | VIRTUAL | **STORED** | plain columns |
|---|---|---|---|
| build (8,927 documents) | 293 ms | **203 ms** | 130 ms (header only) |
| outstanding: `GROUP BY party` | 34.7 ms | **7.1 ms** | 8 ms |
| one party's balance (index seek) | 0.0 ms | **0.0 ms** | <1 ms |
| invoices in a date range | 0.3 ms | **0.3 ms** | 3 ms |
| sale invoices not completed | 0.7 ms | **0.7 ms** | — |
| **item sales: `json_each` over nested lines** | 135.0 ms | **139.2 ms** | **26 ms** |
| **edit screen: one document by primary key** | 0.0 ms | **0.0 ms** | 36 ms (3-way join) |

Payload: **5.5 MB, 0.6 KB per invoice** — smaller than feared, because the lines are already
individually small.

## The three findings

### 1. `STORED` is not a detail, it is the whole answer

The only difference between the two columns is `VIRTUAL` versus `STORED` on

```sql
remaining REAL GENERATED ALWAYS AS (json_extract(doc,'$.remaining')) STORED
```

`VIRTUAL` recomputes `json_extract` on **every read**, so `GROUP BY party` costs 34.7 ms. `STORED`
computes it **once, at write time**, and the same scan is 7.1 ms — 4.9× faster, and marginally
*faster than the plain relational column* (8 ms), because the document is already in the row.

The document is written once per invoice and read thousands of times, so the stored form is the
only correct choice. This is the same argument as the materialised table, applied at the column
level.

### 2. Generated columns remove the drift objection outright

A generated column is computed by SQLite **from the document itself**. It is not a second formula
that could disagree — it is the same value, derived by the engine, stored in the same row. So the
indexed projections (`party`, `dated`, `completed`, `remaining`) **cannot** drift from the JSON,
which is a stronger guarantee than a hand-maintained trigger and a weaker one than not having two
representations at all.

This is the answer to "less chances of drift if SQL is proper": yes, and the mechanism is
`STORED` generated columns plus `json_valid()` on write, not discipline.

### 3. The one genuine loss is line-level aggregation

`itemsales` and `profit` group **every transaction line** by item. In a document those lines are
inside an array, so the scan must be `json_each(doc,'$.lines')` + `json_extract` per element:

- document: **139 ms**
- relational `GROUP BY item` over the real `transactions` table: **26 ms**

A 5.3× penalty, and it is structural — there is no way to index into a JSON array element.

**But 139 ms is still ~150× better than the ~20,000 ms cliff those two reports hit today**
([[trailbase-guest-cpu-js-limits]], [[report-performance-baseline]]). So the correct conclusion is
not "documents lose", it is "**line-level cross-invoice aggregation is the one job that must keep
reading the relational `transactions` table**". Everything scoped to a single invoice belongs in
the document.

## What this means for the invoice and cash-memo build

The shape the measurements support:

| data | home | why |
|---|---|---|
| `invoices` / `transactions` / `payments` | **relational, as now** | the write path, and line-level aggregation needs real columns |
| one self-contained invoice document | **`inv` table, `STORED` generated columns, indexed** | edit screen, print, and every per-invoice total in one row, one read, cannot drift |
| cross-invoice aggregates (`itemsales`, `profit`) | **relational `transactions` + indexes** | 26 ms vs 139 ms; the only place documents lose |

The invoice edit screen is the clearest win: **one primary-key read instead of a three-way join**,
and the totals it shows are the same values the document stores, so the client preview and the
authoritative figure come from one representation rather than two.

## Caveats

- **Trigger maintenance is now larger.** A line change must update the parent invoice's document
  inside the same transaction, and the document's `total` / `remaining` / `paid_total` with it.
  That is the F4 "totals race" fix arriving for free, but it makes the trigger a real piece of
  logic rather than a bump.
- **An abandoned invoice stays visible.** Documents make the in-progress invoice more present,
  not less, since its totals are now stored rather than derived on read. F1 is unchanged.
- **`json_object` cannot hold BLOB.** Every id must be `hex()`-ed on the way in and `unhex()`-ed
  on the way out. Verified directly: `JSON cannot hold BLOB values`. This is a real ergonomic tax
  on every query, and a reason to prefer a generated `readable_id` column over hex round-trips.
- **This is a shape comparison, not a parity result.** The money above is recomputed in Python to
  build the fixture. It says nothing about matching the legacy views, which is blocked on
  [[report-sql-filters-on-text-enums-returns-nothing]].

## A second document engine was considered and rejected

**PoloDB** (v5.3.0, Apache-2.0, ~1.2k stars) was proposed as a WASM component to hold the
materialised documents. It cannot be, for reasons in its own changelog and manifest:

- **v5.0.0 lists `Remove WASM support` as a breaking change.** WASM existed at v3.5.2
  ("Introduce WASM backend(WIP)") and v4.0.1 ("Implement IndexedDB backend(alpha)") — both
  browser-side, and both removed. There has been no WASM target since v4.
- **v5.0.0 also removed the memory backend** and made RocksDB mandatory.
  `polodb-librocksdb-sys` is a **non-optional** C/C++ dependency (needs Clang/libclang, builds
  from source, several minutes on first build), so there is no way to take `polodb_core` without it.
- **RocksDB does not build for `wasm32`** — it needs a filesystem, `mmap`, POSIX file locking and
  real threads, none of which TrailBase's wasmtime/WASI component model provides.
- **The decisive one: two engines cannot share a transaction.** The entire argument in §"Why not
  the alternatives" is that a tier-2 table commits in the same transaction as the base write. A
  separate store could not, which demotes it straight back to a cache — the failure this design
  exists to prevent.

Its useful idea — MongoDB-shaped documents with indexes over a document — is already delivered by
`STORED` generated columns at 7.1 ms, with no second engine, no second storage format, and no
second durability story to back up. Recorded in
[[component-split-and-sql-materialised-tables]].

## Related

- [[component-split-and-sql-materialised-tables]] — the tier model this refines.
- [[tb-0021-invoices-cashmemos-printing]] — the build this shapes.
- [[reports-and-ledgers]] — the arithmetic a document would have to reproduce exactly.
