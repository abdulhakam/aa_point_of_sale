---
type: Task
status: Ready
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
