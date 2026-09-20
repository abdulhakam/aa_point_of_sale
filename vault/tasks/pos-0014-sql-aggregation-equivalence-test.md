---
type: Task
status: Ready
ticket: POS-0014
priority: P0
belongs_to:
  - "[[AA Point of Sale]]"
related_to:
  - "[[POS-0013 SQL aggregation views]]"
  - "[[Reports & Ledgers]]"
affects:
  - "[[Backend — PocketBase Data Service]]"
blocked_by:
  - "[[POS-0013 SQL aggregation views]]"
created: 2026-09-20
updated: 2026-09-20
tags:
  - testing
  - sql
  - reports
---

# POS-0014 SQL aggregation equivalence test

## Goal

Prove the new SQL aggregation returns the **same numbers** the current client-side code
computes, before any page is rewired to use it.

## Done when

- For each new/changed view from [[POS-0013 SQL aggregation views]], a check compares, on the same date range:
  - `ledger_party`: window-function running balance == old correlated-subquery balance
    (row-by-row on a sample of parties).
  - Sales/profit summary `SUM(profit)`/`SUM(net_amount)` == the current `calculator()`
    output in `profit/page.tsx` / `salesreport` for identical filters.
  - Payments summary totals == `PaymentsView` `calculator()` output.
- Comparison script (e.g. `scripts/tests/test_report_sql.py`) runs against the migrated DB
  copy and prints PASS/FAIL per metric.

## Notes

- This is the safety net that lets [[POS-0015 Trim expands + adopt pagination in report pages]] swap data sources with confidence.
- Extends the existing backlog intent of [[Add automated tests for report SQL views]].

## Related

- Test companion to [[POS-0013 SQL aggregation views]].
