---
type: Task
status: Done
ticket: POS-0018
priority: P1
belongs_to:
  - "[[AA Point of Sale]]"
related_to:
  - "[[POS-0005 Baseline performance metrics]]"
  - "[[Reports & Ledgers]]"
affects:
  - "[[Frontend — Next.js Application]]"
  - "[[Backend — PocketBase Data Service]]"
blocked_by:
  - "[[POS-0015 Trim expands + adopt pagination in report pages]]"
  - "[[POS-0017 Invoice entry pages: paginate + trim expands]]"
created: 2026-09-20
updated: 2026-09-20
tags:
  - testing
  - performance
  - regression
---

# POS-0018 Regression-test performance suite

## Goal

A repeatable end-to-end check that the whole optimization actually sped things up and
didn't break correctness — comparing against the [[POS-0005 Baseline performance metrics]] baseline.

## Done when

- A script/checklist measures (after all optimizations) and compares to baseline:
  - fetch time + row count for the previously-heavy report queries,
  - time to open the Sale invoice page and the Party ledger report,
  - the heavy reports now return dozens of summary rows (not tens of thousands).
- Consolidates the per-change tests: [[POS-0008 Index verification test]],
  [[POS-0010 Cache behavior test]], [[POS-0012 Pagination test]],
  [[POS-0014 SQL aggregation equivalence test]], [[POS-0016 Report pages render test]].
- Pass/fail summary recorded in the WorkSession; the Improvement is documented.

## Related

- Capstone verification; must pass before [[POS-0019 Upgrade PocketBase v0.22.9 → v0.22.55]]
  and [[POS-0021 Materialize hot report views into tables]].

## Work log

- 2026-09-20 — Wrote `scripts/perf_regression.py` (measures the app's real request shapes over
  HTTP and compares against [[Performance Baseline]]) and `scripts/tests/run_all.py` (runs every
  per-change test companion in one command and summarises; skips server-side suites when
  PocketBase is down). Both are stdlib-only.

## Verification

`python scripts/tests/run_all.py` — **7/7 suites PASS** (server reachable):

| Suite | Result |
|---|---|
| POS-0008 index verification | PASS |
| POS-0014 report SQL equivalence | PASS |
| POS-0018 summary-totals equivalence | PASS |
| POS-0012 pagination behaviour | PASS |
| POS-0010 cache config + write/read | PASS |
| POS-0016 expand-trim equivalence | PASS |
| POS-0018 performance regression | PASS |

`python scripts/perf_regression.py` — before → after:

| Shape | Baseline | Now |
|---|---|---|
| `transactions_report` perPage 500 (deep expand → none) | 1,021.6 KB / 2.49 s | **309.3 KB (−70.1%)** / 1.80 s |
| `payments_view` perPage 500 (expand 6 → none) | 1,089 KB | **274.8 KB (−74.8%)** |
| `ledger_party` (one party) | ABORTED after 180 s | **0.95 s** |
| `invoice_view` to open the Sale page | 26.00 s (full pagination) | **0.97 s** for 50 rows; whole page's API work 2.01 s / 414 KB |
| `payments_summary` for one day | — | **1 group** |
| `outstanding_summary` | — | 602 party rows |

All five Done-when bullets are met: fetch time + row counts compared to baseline; Sale invoice
page and party ledger timed; heavy reports now read summary rows; the per-change tests are
consolidated into one runner; results recorded here and in the WorkSession. Note:
`outstanding_summary` still takes ~4.2 s (the view recomputes its aggregate per request) —
the candidate for [[POS-0021 Materialize hot report views into tables]].
