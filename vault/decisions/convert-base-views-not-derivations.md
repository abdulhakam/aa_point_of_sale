---
title: Convert the base views to SQL; keep the report-level derivations in JS
type: decision
status: superseded
decided_on: 2026-09-27
created: 2026-09-27
updated: 2026-10-02
superseded_by: "[[all-14-reports-run-in-sqlite-rows-reach-the-renderer-by-kv-handle-never-quickjs]]"
superseded_on: 2026-09-28
tags: [reports, sql, strategy, parity, no-build]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[tb-0022-move-reports-to-sql]]", "[[legacy-sql-views-differ-from-js-views]]", "[[report-logic-stays-runtime-file-based]]", "[[guest-report-performance-options]]", "[[tb-0032-manifest-first-refactor]]", "[[legacy-parity-checks-waived]]"]
---

# Convert the base views to SQL; keep the report-level derivations in JS

> **SUPERSEDED 2026-09-28 by [[all-14-reports-run-in-sqlite-rows-reach-the-renderer-by-kv-handle-never-quickjs]].**
> The split below — *base views in SQL, report-level derivations in JS* — never shipped. **All 14
> reports ended up in SQL**, because the derivations are where the money arithmetic lives and doing
> them in SQL is what made the whole statement one query. Two of its three premises are now dead:
>
> - *"The JS is the parity reference, so keeping it removes the drift risk"* — parity is **waived**
>   ([[legacy-parity-checks-waived]]), and `app/compute/reports.js` was deleted on 2026-10-01.
> - *"`sql+js` where a column cannot be expressed in SQL"* — the `strategy` field and its three values
>   no longer exist.
>
> Its diagnosis still holds and is why the reversal was safe: the derivations were **wrong** in the
> legacy SQL relative to the JS, and re-deriving the correct policy in SQL was the point. The live
> successor is [[tb-0032-manifest-first-refactor]], which retires the remaining JS view builders so
> the `.sql` files become the single source.

## What the equivalence gate taught us

Comparing the ported legacy SQL with the JS views that serve the reports
([[legacy-sql-views-differ-from-js-views]]) showed the two are not interchangeable — but it also
showed **where** they diverge, and that split is the strategy:

- The **base views** carry the expensive work — the full-table scans, the five-way joins, the
  per-line arithmetic. `transaction_view` and `invoice_view` are now **byte-identical** to the JS
  after the rounding/literal/alias fixes (23,413 and 8,927 rows).
- The **derived views** carry report-specific *policy*, not scan volume: proportional discount
  allocation (`transactions_report`), credit/debit derivation (`ledger_*`), the outstanding
  threshold, the payments/company split, item `qty` units. They are wrong in the legacy SQL
  relative to the JS, and matching them means re-deriving the JS's policy in SQL for no real
  speed-up — and each is another place to drift.

## Decision

1. **SQL for the base views** — `transaction_view`, `invoice_view`, `net_price` (and the raw
   payment rows) — because that is where the cost is and where parity has been proven.
2. **JS for the report-level derivations** — `transactionsReport`, `paymentsInvoicesReport`,
   `ledger_*`, `outstanding`, `counts`, `refs` — consuming the SQL base views. The JS is the parity
   reference ([[reports-and-ledgers]]' pinned numbers), so keeping it removes the drift risk.
3. **`sql+js` where a column cannot be expressed in SQL** — `paymentsView.company` is an **array**
   of company ids in the JS (SQL can return only a scalar); the JS attaches it from the link table.
4. This is the per-report `strategy` field already designed
   ([[report-logic-stays-runtime-file-based]]): `sql` for base views, `sql+js` for reports whose
   last mile is JS, `js` where no SQL view exists.

## Why this is still a large win

The expensive parts were the full-table reads (`SELECT *` of 26,526 payments + 23,413 transactions
+ 8,927 invoices) and the joins, not the derivations. Moving the base views into SQLite (C) and
keeping the derivations as cheap passes over the already-joined rows is where the time goes.

## What we deliberately stop chasing

- Exact SQL reproduction of `items_report.qty` units, `ledger_*` credit/debit, `outstanding`
  threshold, `payments_invoices_report` row split — those stay JS.
- The last 2 of 23,413 rows in `transactions_report` that differ by a cent, because they come from
  the `unrounded_total` sum accumulating in a different order across engines. The `sql+js` form
  removes this: JS keeps its own rounding.

## Evidence

- `trailbase/tools/view-equivalence.mjs` (deleted 2026-10-02 with the legacy view layer) —
  `transactionView` and `invoiceView` identical;
  `transactionsReport` down to 2/23,413 rows after a zero-denominator guard.
- [[legacy-sql-views-differ-from-js-views]] — the per-view difference map this resolves.

## Related

- [[tb-0022-move-reports-to-sql]] — the task this directs.
- [[report-logic-stays-runtime-file-based]] — the strategy field it employs.
