---
type: Reference
status: Active
created: 2026-09-19
updated: 2026-09-19
belongs_to:
  - "[[AA Point of Sale]]"
related_to:
  - "[[Data Model]]"
  - "[[Reports & Ledgers]]"
tags:
  - glossary
  - terminology
  - reference
---

# Glossary

Project vocabulary. Where a term maps to a schema field, the field is named.

## Business entities

- **Party** — a customer or supplier. `parties.type` ∈ {`supplier`, `customer`}.
- **Customer** — a party you sell to.
- **Supplier** — a party you buy from.
- **Booker** / **Order Booker** — a sales agent who takes orders; `order_bookers`.
- **Company** — in the PocketBase app, the *category* of an item (`categories`); "Company" and
  "category" were the same collection there, and report fields named `company` reference it. **In the
  TrailBase system they are two different things**: `items.category` is vestigial and `company` carries
  this meaning — see [[Decision — Company replaces category in the TrailBase model]].
- **Category** — see Company.
- **Area** — a territory, belonging to a section (`areas`).
- **Section** — a grouping of areas (`sections`).
- **Item** — a product (`items`) with cost price, sale price, carton size, and a category; see
  **Company** for how TrailBase differs.
- **Scheme** — free/extra quantity given on a line beyond billed `qty` (`transactions.scheme`).

## Invoices and lines

- **Invoice type** — `purchase`, `sale`, `return`, or `difference`.
- **Difference invoice** — an adjustment used to reconcile stock; only type counted by the
  Difference Report.
- **Return invoice** — reverses a prior invoice; linked via `invoices_return_reference`.
- **Transaction** — one invoice line (`transactions`): item, price, qty, scheme, discounts.
- **InvoiceNo** — human-facing invoice number (`invoices.invoiceNo`).
- **Dated** — the business date of an invoice; falls back to `created` when unset.
- **Discount_1 / Discount_2** — successive percentage discounts.
- **Discount_rs** — flat currency discount (`discount_rs`).

## Money and totals

- **total** — line total after line discounts.
- **unrounded_total** — invoice total after invoice-level percentage discounts, before flat
  discount.
- **final_total** — invoice total after the flat `discount_rs`.
- **net_amount** — line total after both line and invoice percentage discounts.
- **final_amount** — `net_amount` less the line's proportional share of the invoice flat
  discount (report-level).
- **profit** — margin. Caution: in `transaction_view` the field named `profit` is actually
  total **cost**; the real margin is in `transactions_report.profit`.
- **net_price** — effective per-delivered-unit price after all discounts (`net_price` view).

## Payments

- **Payment type** — `sending` (outgoing), `recieving` (incoming; note the spelling),
  or `return`.
- **paid** — whether the payment has cleared (`payments.paid`).
- **paid_to** — the booker a payment is attributed to.
- **Cash memo** — the section of the app holding payments, expenses, and vouchers.

## Reports and ledgers

- **Ledger** — running debit/credit account, per party, booker, or area.
- **General ledger / journal** — double-entry-style view (`ledger_journal`) with
  `accounts_recievable`, `accounts_payable`, `cash`, `stock` columns.
- **Credit / Debit** — ledger columns derived from payment type and `paid` state.
- **DA entry** — daily-allowance entry screen under cash memo.
- **Difference Report** — stock quantity from difference invoices only.
- **Stock Report** — running item quantity across all invoice types (`items_report`).

## Platform

- **PocketBase (PB)** — the single-binary backend (HTTP API + SQLite + auth).
- **View collection** — a read-only PocketBase collection backed by a SQL query.
- **Tauri** — wrapper used to build a desktop app (`aa_pos`, `com.abdulhakam.aapos`).
- **Standalone** — the prebuilt Next.js `output: "standalone"` server under `standalone/`.

## Related

- Schema detail: [[Data Model]].
- Formula detail: [[Reports & Ledgers]].
- Screen/route names for the report terms above: [[Route Map]].
- Terms used across the subsystems: [[Frontend — Next.js Application]],
  [[Backend — PocketBase Data Service]], [[Desktop & Deployment]].
