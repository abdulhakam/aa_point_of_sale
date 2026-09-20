---
type: Task
status: Done
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

## Work log

- 2026-09-20 — `backend/pb_migrations/1789890300_ledger_party_window_function.js`:
  replaced the O(n²) correlated subquery with
  `SUM(...) OVER (PARTITION BY party ORDER BY payment_date RANGE UNBOUNDED PRECEDING)`.
  `RANGE` (not `ROWS`) preserves the original `<=` peer semantics. Columns unchanged →
  no schema edit needed.
- 2026-09-20 — `backend/pb_migrations/1789890310_payments_summary_view.js`: new
  `payments_summary` view, `GROUP BY day, party, area, section, booker, party_type,
  type, paid`, exposing the 8 category sums the reports previously computed in JS.
  Two iterations were required: PB's view parser rejects bare arithmetic columns
  (wrap derived values in a single function call) and PB requires an `id` column
  (added `(ROW_NUMBER() OVER())` in a subquery wrapper, per the
  counts_for_row_numbers pattern).
- 2026-09-20 — Applied to the scratch copy, then the live DB; `scripts/verify_live.py`
  confirms both views live.
- 2026-09-20 — Measured: party-ledger request >180s (old) → ~4.4s (new). The view still
  re-materializes per request; further gains via the cache (POS-0009) and
  [[POS-0021 Materialize hot report views into tables]].

## Verification

- `python scripts/tests/test_report_sql.py backend/pb_data_bench/data.db` →
  `RESULT: PASS`: window balance identical for all 26,526 rows (0 mismatches); summary
  totals match the JS calculator for all-rows, date-range, and single-party filters.
