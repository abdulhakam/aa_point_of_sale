---
title: Payments and Sales report totals were computed from display rows, not raw rows
type: issue
status: fixed
severity: high
created: 2026-09-28
updated: 2026-09-28
tags: [reports, payments, bug, parity, guest]
related_to: ["[[reports-and-ledgers]]", "[[guest-vs-legacy-report-performance]]", "[[new-system-report-timings]]", "[[money-is-2dp-everywhere]]", "[[frontend]]"]
---

# Payments and Sales report totals were computed from display rows, not raw rows

## Finding (2026-09-28)

On the production dataset (26,526 payments), the guest's **Unified Payments Report** and **Sales
Report** totals were nonsense:

| total | before the fix |
|---|---|
| Sales Amount (recieving) | 0.00 |
| Recieved Amount | 0.00 |
| Recieving Returns | 0.00 |
| Recivable Amount | 0.00 |
| Purchase Amount (sending) | 0.00 |
| Paid Amount | 0.00 |
| Sending Returns | 108,057,580.14 (the sum of **all** amounts) |
| Payable Amount | -108,057,580.14 |

### Cause

`reportPayments` / `reportSalesPayments` (`trailbase/src/runtime/app/compute/reports.js`) mapped the
raw `paymentsView` rows to **display** rows with `paymentRow()`, then passed those display rows to
`paymentsTotals()` / `salesTotals()`. Those calculators are ports of the legacy
`PaymentsView.tsx` `calculator` and read the **raw** shape:

- `p.type` — numeric (`0`/`1`/`2`); the display row replaces it with a label string (`"Sale"`,
  `"Purchase Payment"`, …), so every `=== sending/recieving` test failed and every row fell into the
  `else` (returns) branch.
- `p.party_type` — dropped by `paymentRow()`, so the returns branch always took the `sendingReturns`
  side.
- `p.paid` — dropped, so `totalPaid`/`invoiceTotal` were both wrong.

A second, independent mismatch: the totals template
(`trailbase/src/runtime/app/lib/report-pages.js`, `paymentsTotalsGroups`) labelled `t.totalSending`
as **Payable Amount**, but the legacy UI prints `total` = `invoiceTotal - totalPaid`.

### Fix

- `reportPayments` / `reportSalesPayments` now compute totals from the **raw filtered rows** and only
  map to display rows for the table.
- The template's Payable Amount uses `t.total`.

## Verification (2026-09-28)

Guest totals after the fix, wide range (`2020-01-01 … 2030-12-31`) against the legacy
`payments_view` calculator (`frontend/src/app/app/reports/payments/PaymentsView.tsx:234`):

| total | legacy (raw sum) | guest (after fix) | Δ |
|---|---|---|---|
| Sales Amount | 29,745,282.80 | 29,745,282.82 | +0.02 |
| Recieved Amount | 25,947,307.69 | 25,947,307.69 | 0 |
| Recieving Returns | 99,765.11 | 99,765.11 | 0 |
| Recivable Amount | 3,698,210.00 | 3,698,210.02 | +0.02 |
| Purchase Amount | 29,607,927.86 | 29,607,927.86 | 0 |
| Paid Amount | 22,657,296.66 | 22,657,296.66 | 0 |
| Sending Returns | 0.00 | 0.00 | 0 |
| Payable Amount | 10,848,371.42 | 10,848,371.44 | +0.02 |

The ±0.02 is the intended 2 dp money backfill: the legacy view has two rows whose `amount` carries
more than two decimals, and the depot's values were rounded ([[money-is-2dp-everywhere]]); the sum
moves by exactly that residue. It is not a calculation error.

`trailbase/src/tools/guest-smoke.mjs` still passes **71/71**, including
`payments payable amount is 800.00` and `payments recivable amount is 150.00`.

## Evidence

- `trailbase/src/runtime/app/compute/reports.js` — `reportPayments`, `reportSalesPayments`,
  `paymentsTotals`, `salesTotals`.
- `trailbase/src/runtime/app/lib/report-pages.js` — `paymentsTotalsGroups`.
- `frontend/src/app/app/reports/payments/PaymentsView.tsx` — the legacy `calculator` the totals
  mirror, and `frontend/src/app/app/reports/salesreport/PaymentsView.tsx` (same shape).
- PocketBase `payments_view` (26,526 rows) + the legacy calculator ported to Node for the reference
  column; `trailbase/src/tools/guest-smoke.mjs` for the regression.

## Related

- [[reports-and-ledgers]] — the arithmetic.
- [[new-system-report-timings]] — the same run's timings.
- [[money-is-2dp-everywhere]] — why the ±0.02 is expected, not a defect.
