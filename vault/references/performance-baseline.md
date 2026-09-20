---
type: Reference
status: Active
created: 2026-09-20
updated: 2026-09-20
belongs_to:
  - "[[AA Point of Sale]]"
related_to:
  - "[[Reports & Ledgers]]"
  - "[[Data Model]]"
  - "[[Frontend — Next.js Application]]"
tags:
  - performance
  - baseline
  - measurement
---

# Performance Baseline

Captured 2026-09-20 by [[POS-0005 Baseline performance metrics]] before any optimization.
Sources: `scripts/perf_baseline.py` (SQL, `scripts/baseline_sql_full.txt`) and
`scripts/perf_http.py` (HTTP against a scratch copy). Host: the production Windows machine.

## Dataset

| Table | Rows | | View | Rows |
|---|---|---|---|---|
| transactions | 23,413 | | `transactions_report` | 23,413 |
| payments | 26,526 | | `payments_view` | 26,526 |
| invoices | 8,927 | | `payments_invoices_report` | 33,556 |
| parties | 942 | | `invoice_view` | 8,927 |
| items | 207 | | `ledger_journal` | 26,614 |
| areas / sections / categories / bookers | 59 / 10 / 15 / 4 | | `ledger_area` | 924 |

## SQL-level: full view scan (what `getFullList` ultimately pulls)

| View | Rows | Time |
|---|---|---|
| `invoice_view` | 8,927 | 1.26 s |
| `transaction_view` | 23,413 | 1.12 s |
| `transactions_report` | 23,413 | 2.32 s |
| `payments_view` | 26,526 | 1.76 s |
| `payments_invoices_report` | 33,556 | 6.63 s |
| `items_report` | 207 | 0.81 s |
| `items_difference_report` | 207 | 1.60 s |
| `ledger_booker` | 26,526 | 2.35 s |
| `ledger_journal` | 26,614 | 2.60 s |
| `ledger_party` | 26,526 | **ABORTED after 180 s** (guard) |
| `ledger_area` | 924 | 2.50 s |

## HTTP-level: PocketBase REST (perPage 500, scratch server)

| Request | Rows | Payload | Time |
|---|---|---|---|
| `invoice_view` first page (perPage 30) | 30 | 15.1 KB | 1.37 s |
| `transactions_report` first page (perPage 30) | 30 | 17.9 KB | 1.68 s |
| `transactions_report` + deep expand, perPage 500 | 500 | **1,021.6 KB** | 2.49 s |
| `payments_view` + expand 5, perPage 30 | 30 | 56.7 KB | 1.46 s |
| `ledger_party` + expand, perPage 30 | 30 | 32.3 KB | 1.87 s |
| `ledger_journal` perPage 30 | 30 | 9.7 KB | 1.17 s |
| `counts_for_row_numbers/1` | 1 | 0.3 KB | 0.03 s |
| **`invoice_view` full pagination (all pages)** | 8,927 | — | **26.00 s** |

## Query plans (SCAN = no usable index)

- `invoice_view`: `SCAN transactions`, `SCAN payments`, `CORRELATED SCALAR SUBQUERY`,
  `MATERIALIZE`, `USE TEMP B-TREE FOR ORDER BY` — every join uses an *automatic* index at
  best; no declared secondary index on `transactions(invoice)`, `invoices(party/type/dated)`,
  `payments(party/paid/type/invoice)`.
- Only `sqlite_autoindex_*_1` (primary keys) exist on base tables.

## Conclusions that drive the plan

1. **`ledger_party` is the worst offender** (O(n²) correlated subquery; >180 s) →
   [[POS-0013 SQL aggregation views]] rewrites it with a window function.
2. **Full-list fetches dominate** (~26 s for `invoice_view`; worse for 23k/26k views) →
   [[POS-0011 Paginated list plumbing]] + [[POS-0015 Trim expands + adopt pagination in report pages]].
3. **Deep expands explode the payload** (1 MB / 500 rows) →
   [[POS-0015 Trim expands + adopt pagination in report pages]].
4. **No secondary indexes** → [[POS-0007 Add indexes via migration]].
5. **0.5 s staleTime + refetchOnMount** → [[POS-0009 Fix React Query cache config]].

## Re-measure

- After the backend changes (POS-0007 + POS-0013): `python scripts/perf_http.py http://127.0.0.1:8095 500`
  captured `scripts/after_indexes_http.txt`. Same perPage=500 scratch server.
  - Per-page times essentially unchanged (index scans don't help a full page scan):
    `invoice_view` first page 1.92s (was 1.37s), `transactions_report` 1.81s (was 1.68s),
    `payments_view` 1.10s (was 1.46s).
  - Deep expand still 1,021.6 KB for 500 rows — unchanged (this is the payload, not an
    index win) → addressed by [[POS-0015 Trim expands + adopt pagination in report pages]].
  - `payments_summary` (new) returns 23,790 grouped rows for all payments (vs 26,526 raw);
    filtered reports will read dozens of summary rows instead of tens of thousands.
- After-the-fact party-ledger measurement (live DB, filtered to one party):
  >180 s → ~4.4 s — a ~40× improvement from the window function + index.
- A comparison `bench_pagination.py` run showed a ~38s `invoice_view` full-list time for the
  indexed copy vs ~21.6s for the pristine copy; that run was contaminated by a concurrent
  server and discarded, so it is **not** counted as evidence. Whole-list pagination speed is
  dominated by scanning + ordering the whole view, which indexes do not materially shorten —
  the real fix is switching list pages to pagination + the summary views
  ([[POS-0015 Trim expands + adopt pagination in report pages]]).
- Found latent frontend bug: `payments_view.amount` can be a string (falls back to the
  printf-formatted `invoice_view.final_total`); the old JS `calculator()` `+=` concatenated
  those strings. Aborted as part of the redesign — no new bug introduced.

## Related
## Related

- [[Reports & Ledgers]], [[Data Model]].
