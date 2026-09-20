---
type: Task
status: Ready
ticket: POS-0013
priority: P0
belongs_to:
  - "[[AA Point of Sale]]"
related_to:
  - "[[Reports & Ledgers]]"
  - "[[Data Model]]"
affects:
  - "[[Backend — PocketBase Data Service]]"
blocked_by:
  - "[[POS-0005 Baseline performance metrics]]"
  - "[[POS-0006 Backup database and repo snapshot]]"
created: 2026-09-20
updated: 2026-09-20
tags:
  - performance
  - sql
  - reports
  - migration
---

# POS-0013 SQL aggregation views

## Goal

The single biggest report win: reports return **dozens of summary rows**, not tens of
thousands of raw rows. Move the client-side `reduce`/`SUM`/running-balance into SQL.

## Scope

1. **Rewrite `ledger_party`** — replace the per-row correlated `SUM()` subquery
   (`balance = (SELECT SUM(...) WHERE p2.party=p1.party AND p2.payment_date<=...)`, O(n²))
   with a window function: `SUM(signed_amount) OVER (PARTITION BY party ORDER BY
   payment_date ROWS UNBOUNDED PRECEDING)`. SQLite 3.50 supports window functions.
2. **Add summary view(s)** for the heaviest reports so they aggregate server-side:
   - a sales/profit summary that `GROUP BY` the report's grouping keys (e.g. date, booker,
     party, company, area, section, item) with `SUM(qty)`, `SUM(net_amount)`,
     `SUM(profit)` — instead of returning all 23k `transactions_report` rows.
   - payments summary totals (paid/unpaid, sending/recieving, returns) so the
     `calculator()` loops in `PaymentsView` move into SQL.
3. Keep the existing detail views intact for detail/print pages; add summary views
   alongside rather than breaking current consumers.

## Method

- New/updated view collections via `pb_migrations` (v0.22 API), matching existing style.
- Preserve the documented formulas in [[Reports & Ledgers]] exactly — this changes *where*
  aggregation happens, not the numbers.

## Done when

- New/updated views apply cleanly via migration on a DB copy.
- The summary views return correct totals that match the current client-side computation
  on the same filter range (validated in [[POS-0014 SQL aggregation equivalence test]]).

## Related

- Verified by [[POS-0014 SQL aggregation equivalence test]].
- Consumed by [[POS-0015 Trim expands + adopt pagination in report pages]].
- If a heavy report is still slow after indexing, materialize it: [[POS-0021 Materialize hot report views into tables]].
