---
title: The legacy SQL views are not equivalent to the JS views serving the reports
type: issue
status: verified
severity: high
created: 2026-09-27
tags: [reports, sql, parity, migration, drift]
related_to: ["[[tb-0022-move-reports-to-sql]]", "[[report-logic-stays-runtime-file-based]]", "[[guest-report-performance-options]]", "[[reports-and-ledgers]]"]
---

# The legacy SQL views are not equivalent to the JS views serving the reports

## What was tested

`runtime-js/tools/view-equivalence.mjs` reads the depot's base tables exactly as the guest's data
layer does, builds every view with `frontend-ssr/compute/views.js` (the code that produces the
current 14/14 report parity), runs the composed legacy SQL for the same view, and diffs the rows.

## Result: 0/13 views are identical

Row counts usually match (`transactionView` 23,413 = 23,413; `paymentsView` 26,526 = 26,526;
`invoiceView` 8,927 = 8,927; ledgers 26,526), but the rows differ — in three distinct ways, which
matters because it means a **verbatim SQL swap is not drop-in**.

**1. Formatting: the legacy SQL `printf`s numbers to strings; the JS keeps numbers.**
```text
net_amount: js=90     sql="90.00"
profit:     js=76.5   sql="76.50"
total:      js=540    sql="540.00"
balance:    js=-4750  sql="-4750.00"
```
Roughly every row differs on these, which is what drives `differing = 2 × rowCount`. Fix: strip the
`printf(...)` formatting from the ported views and return raw numbers (the template/JS formats).

**2. The JS views have extra or omitted columns.**
```text
ledgerBooker / ledgerParty: js-only [booker]
ledgerArea:                 sql-only [description, updated, dated, invoice, type, paid]
```

**3. Genuine arithmetic/row differences.**
```text
itemsReport.qty                    js=756                        sql=3276
ledgerJournal.accounts_recievable  js=-540                       sql=0
ledgerJournal.cash                 js=540                        sql=-540
ledgerBooker.credit                js=540                        sql=0
outstanding rows                   js=602                        sql=0
paymentsInvoicesReport rows        js=33129                      sql=29984
```

## Why this matters

The conversion plan assumed the legacy SQL could be dropped in **verbatim** (owner decision) and
would reproduce the JS. It does not: the JS views were *ported and adapted* — they add columns
(`booker`), drop others, keep numbers unformatted, and in several places compute differently
(`ledger_*` credit/debit, `items_report` qty units, `outstanding` which ignores the legacy
threshold view). **The parity reference is the JS (`frontend-ssr`), not the legacy SQL.**

## Consequences for the plan

- Each view is reconciled **against the JS**, not against PocketBase: the SQL must produce the same
  values the JS does (or the report stays `sql+js` and the JS keeps the last mile).
- Two mechanical changes are certain: **drop `printf`** (return numbers) and **add/remove columns**
  to match the JS field sets.
- Three views need a semantic decision, because the JS and the legacy SQL genuinely disagree:
  `ledger_*` (credit/debit derivation), `items_report` (qty units), `outstanding` (threshold and
  row set), `payments_invoices_report` (row count).
- `strategy` per report is doing real work: some views will convert cleanly (`transaction_view`,
  `invoice_view`, `net_price`), others likely stay `sql+js` or `js`.

## Evidence

- `runtime-js/tools/view-equivalence.mjs` — output above (0/13 identical; field-level diffs).
- `runtime-js/site/app/reports/sql/views/*.sql` vs `frontend-ssr/compute/views.js`.

## Related

- [[tb-0022-move-reports-to-sql]] — the task this constrains.
- [[report-logic-stays-runtime-file-based]] — the per-report strategy that absorbs this.
- [[reports-and-ledgers]] — the pinned numbers that must not move.
