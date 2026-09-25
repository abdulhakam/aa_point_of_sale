---
type: Reference
status: Active
created: 2026-09-19
updated: 2026-09-19
belongs_to:
  - "[[AA Point of Sale]]"
related_to:
  - "[[Backend — PocketBase Data Service]]"
  - "[[Data Model]]"
  - "[[Route Map]]"
tags:
  - reports
  - ledgers
  - sql
  - views
  - backend
---

# Reports & Ledgers

How every report is computed. The logic lives in PocketBase **view collections** (SQL),
not in frontend code. Full SQL is stored in the live database and in
`backend/pb_migrations/*.js`; the formulas below are the authoritative summary.

This documents the **PocketBase** model. In the TrailBase rebuild, report fields named `company` must
source an item's company from `companies` rather than `items.category` — see
[[Decision — Company replaces category in the TrailBase model]].

Legend: `d1`/`d2` are percentage discounts (0–100), `drs` is a flat discount in currency,
`scheme` is free quantity, `qty` is billed quantity.

## Line and invoice totals

### `transaction_view` — per invoice line
- `total` = `(price × qty) × (1 − d1/100) × (1 − d2/100) − drs`
- `net_amount` = `total × (1 − inv_d1/100) × (1 − inv_d2/100)` (adds invoice-level discounts)
- `profit` = `cost_price × qty` — **note: this is total cost, not margin**, despite the name
- Copies invoice discount fields into `inv_d1`, `inv_d2`, `inv_drs`; carries `type`,
  `party_type`, `area`, `section`, `invoiceNo`.

### `invoice_view` — per invoice
- `total` = `Σ transaction_view.total`
- `unrounded_total` = `Σtotal − Σtotal×invoice.discount_1/100 − (that)×invoice.discount_2/100`
- `final_total` = `unrounded_total` less the flat `discount_rs`
- `dated` = `invoices.dated` when set, else `invoices.created`

### `net_price` — per transaction
- `net_price` = `price × qty × (1 − d1/100) × (1 − d2/100) × (1 − inv_d1/100) × (1 − inv_d2/100) ÷ (qty + scheme)`
- `company` = the item's `category`. Used to reason about effective unit selling price
  (note the denominator includes `scheme`, so it is a per-delivered-unit price).

## Report views

### `transactions_report` — sales/profit/unified item reports
`transaction_view` joined to `items` (for `company`) and `invoice_view` (for `booker`):
- `final_amount` = `net_amount − (inv_drs × net_amount ÷ invoice_view.unrounded_total)`
  (proportionally allocates the invoice's flat discount to each line)
- `profit` = `final_amount − (cost_price × qty)` — **this** is the real per-line margin.

Feeds the Sales Report (`/app/reports/salesreport`), the "Item Sales Report"
(`/app/reports/transactions/unified`), and the Profit Report (`/app/reports/profit`).

### `items_report` — stock report
Per item, sum of signed quantity across all its transactions:
- `sale` → `−(qty + scheme)`
- `purchase` / other → `+(qty + scheme)`
- `difference` → `+(qty + scheme)`
- `return`: customer → `+(qty + scheme)`; supplier → `−(qty + scheme)`

Feeds the Stock Report (`/app/reports/stockreport`).

### `items_difference_report` — difference report
Per item, `Σ(qty + scheme)` restricted to transactions whose invoice `type = 'difference'`.
Feeds `/app/reports/difference`.

## Payment views

### `payments_view`
Payments joined to `invoice_view`, `parties`, `areas`, `sections`, `order_bookers`, and
`invoices_return_reference`:
- `payment_date` = `payments.payment_date` when set, else `payments.created`
- `amount` = `payments.amount` when non-zero, else the invoice's `final_total`
  (so an unset amount falls back to the full invoice value)
- exposes `party_type`, `area`, `section`, `booker`, `company`, and `original_invoices`.

### `payments_invoices_report` — company-split payments
Splits a single payment across the item **companies** on the invoice, by revenue share:
- `ratio` = `Σ transactions_report.net_amount` for that company and invoice
  ÷ `invoice_view.unrounded_total`
- `amount` = `ratio × payments_view.amount`
- `type` mapping: `sending → purchase`, `recieving → sale`, `return → return`

Feeds the Unified Payments Report (`/app/reports/payments`), payments-by-area
(`/app/reports/payments/areawise`), and payments-by-company (`/app/reports/paymentsbycompany`).

## Ledger views

### `ledger_booker` — per-payment debit/credit
- `credit` = `recieving & paid → amount`; else `sending & unpaid → amount`; else 0
- `debit`  = `sending & paid → amount`; else `recieving & unpaid → amount`; else 0
- Row-level only (no running balance); ordered by `payment_date`.

### `ledger_party` — per-party ledger with running balance
Same `credit`/`debit` rules as `ledger_booker`, plus:
- `balance` = running `Σ(paid → −amount, unpaid → +amount)` over that party's payments
  with `payment_date ≤ current row` (formatted to 2 decimals).

### `ledger_area` — area-scoped ledger
Builds a per-party totals CTE (`credit` = paid amounts, `debit` = unpaid amounts) and emits
`credit`/`debit`/`balance` grouped by party, for area-level review.

### `ledger_journal` — general ledger / journal
Unions `payments_view` (transaction type `payment` when paid, else `invoice`; account type =
payment type) with `expenses` (type `expense`, account `cash`, always paid):
- `accounts_recievable` = `recieving → (paid ? −amount : amount)`; `return & customer → −amount`
- `accounts_payable`   = `sending → (paid ? −amount : amount)`; `return & supplier → −amount`
- `cash` = `paid → (recieving ? amount : −amount)`
- `stock` = **always 0** (stock accounting is not implemented here)

Feeds the General Ledger (`/app/reports/ledgers/general`).

## Dashboard

### `counts_for_row_numbers`
Single row of counts: areas, sections, categories, purchase/sale/return invoices, items,
order_bookers, parties, and recieving/sending payments.

## Known limitations (as implemented)

- `ledger_*` SQL contains explicit `-- return case missing` comments: return invoices are
  only partially handled in booker/area ledgers.
- `ledger_journal.stock` is hard-coded to 0.
- `transaction_view.profit` is total cost, not profit; use `transactions_report.profit`.
- Many computed fields are `printf("%.2f", …)` strings typed as `json`.
- View SQL does not consistently filter the soft-delete `deleted` flag.

## Related

- Field/relationship detail: [[Data Model]].
- Which page renders each report: [[Route Map]].
- Why logic sits in SQL: [[Backend — PocketBase Data Service]].
