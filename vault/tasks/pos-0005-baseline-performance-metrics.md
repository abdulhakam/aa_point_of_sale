---
type: Task
status: Done
ticket: POS-0005
priority: P0
belongs_to:
  - "[[AA Point of Sale]]"
related_to:
  - "[[Reports & Ledgers]]"
  - "[[Data Model]]"
affects:
  - "[[Backend — PocketBase Data Service]]"
  - "[[Frontend — Next.js Application]]"
created: 2026-09-20
updated: 2026-09-20
tags:
  - performance
  - baseline
  - measurement
---

# POS-0005 Baseline performance metrics

## Goal

Capture "before" timings and query plans so every optimization is measurable against a
recorded baseline.

## Done when

- A baseline doc records: (a) wall-clock fetch time + row/byte count for the heaviest
  queries (`transactions_report`, `payments_view`, `invoice_view`, `ledger_party`,
  `ledger_journal`), and (b) `EXPLAIN QUERY PLAN` output for `invoice_view`,
  `transaction_view`, and `ledger_party`, and (c) browser timing for opening the Sale
  invoice page and the Party ledger report.

## Approach

- Use `scripts/inspect_db.py` / `scripts/inspect_views.py` (already written) for SQL.
- Time representative `getFullList` calls in the browser devtools Network tab.
- Store results as a new Reference note in `vault/references/` (e.g. `performance-baseline.md`),
  linked from [[Reports & Ledgers]].

## Related

- Feeds [[POS-0018 Regression-test performance suite]].

## Work log

- 2026-09-20 — Wrote `scripts/perf_baseline.py` (SQL timings + EXPLAIN QUERY PLAN) and
  `scripts/perf_http.py` (REST timings incl. a getFullList-style pagination loop), plus
  `scripts/bench_pagination.py` for A/B checks.
- 2026-09-20 — Captured SQL baseline (`scripts/baseline_sql_full.txt`) and HTTP baseline
  (`scripts/baseline_http.txt`) against a scratch copy (`pb_data_bench`).

## Verification

- Results recorded in [[Performance Baseline]]. Headlines: `ledger_party` full scan
  ABORTED at 180s; `invoice_view` full list 26s HTTP / 21.6s SQL; `transactions_report`
  107s; `payments_view` 111s; deep expand 1,021 KB per 500 rows; only PK auto-indexes
  existed; every hot plan was a full SCAN.
