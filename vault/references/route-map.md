---
type: Reference
status: Active
created: 2026-09-19
updated: 2026-09-19
belongs_to:
  - "[[AA Point of Sale]]"
related_to:
  - "[[Frontend — Next.js Application]]"
  - "[[Reports & Ledgers]]"
tags:
  - routes
  - navigation
  - frontend
  - reports
---

# Route Map

Every route compiled into the Next.js App Router build (41 entries). Source lives under
`frontend/src/app/`. `layout.tsx` wraps the whole app; `routeProtector.tsx` gates it.

## Entry and auth

| Route | Purpose |
|---|---|
| `/` | Redirector: sends authed users to `/app/dashboard`, others to `/auth`. |
| `/auth` | Login form (PocketBase `users` password auth). |
| `/_not-found` | Next.js default not-found page. |
| `/favicon.ico` | Static asset route. |

## App shell

| Route | Purpose |
|---|---|
| `/app/dashboard` | Landing dashboard; uses `counts_for_row_numbers` for tile counts. |
| `/app/*` | Shared shell with `NavbarMinimal.tsx` navigation. |

## Invoices

| Route | Purpose |
|---|---|
| `/app/invoices` | Invoice hub. |
| `/app/invoices/purchase` | Create/list purchase invoices. |
| `/app/invoices/sale` | Create/list sale invoices. |
| `/app/invoices/return` | Create return invoices (references original invoices). |
| `/app/invoices/difference` | Difference/stock-adjustment invoices. |
| `/app/invoices/orders` | Order bookers' orders. |
| `/app/invoices/print` | Invoice printing. |
| `/app/invoices/printinvoice` | Print a specific invoice. |
| `/app/invoices/printinvoice/queue` | Print queue. |
| `/views/invoice` | Standalone invoice view/print surface. |

## Cash memo

| Route | Purpose |
|---|---|
| `/app/cashmemo` | Cash memo hub (expenses and payments live here). |
| `/app/cashmemo/payments` | Record/list payments. |
| `/app/cashmemo/expenses` | Record/list expenses. |
| `/app/cashmemo/cash_payment_vouchers` | Cash payment vouchers. |
| `/app/cashmemo/cash_recieve_vouchers` | Cash receipt vouchers (spelling as in code). |
| `/app/cashmemo/da_entry` | DA (daily allowance) entry. |

## Management

| Route | Purpose | Collection |
|---|---|---|
| `/app/management` | Management hub. | — |
| `/app/management/items` | Items catalog. | `items` |
| `/app/management/categories` | Categories (used as item company). | `categories` |
| `/app/management/parties` | Customers/suppliers. | `parties` |
| `/app/management/areas` | Areas within sections. | `areas` |
| `/app/management/sections` | Sections. | `sections` |
| `/app/management/bookers` | Order bookers. | `order_bookers` |

## Reports

| Route | Purpose | Backing view |
|---|---|---|
| `/app/reports` | Reports index (8 tiles). | — |
| `/app/reports/salesreport` | Sales report. | `transactions_report` |
| `/app/reports/transactions/unified` | "Item Sales Report". | `transactions_report` |
| `/app/reports/payments` | "Unified Payments Report". | `payments_view` / `payments_invoices_report` |
| `/app/reports/payments/areawise` | Payments by area. | `payments_invoices_report` |
| `/app/reports/paymentsbycompany` | Payments split by item company. | `payments_invoices_report` |
| `/app/reports/ledgers` | Ledger hub. | — |
| `/app/reports/ledgers/party` | Party ledger. | `ledger_party` |
| `/app/reports/ledgers/booker` | Booker ledger. | `ledger_booker` |
| `/app/reports/ledgers/area` | Area ledger. | `ledger_area` |
| `/app/reports/ledgers/general` | General ledger (journal). | `ledger_journal` |
| `/app/reports/stockreport` | Stock report. | `items_report` |
| `/app/reports/stockreport/itemTransactionsReport` | Per-item transactions. | `transaction_view` |
| `/app/reports/difference` | Difference report. | `items_difference_report` |
| `/app/reports/profit` | Profit report. | `transactions_report` |

Note: the reports index tile list is defined inline in
`frontend/src/app/app/reports/page.tsx`; the `paymentsbycompany` page is a `.jsx` file
while the rest are `.tsx`.

## Related

- Which views feed which report and what they compute: [[Reports & Ledgers]].
- Collection/field detail: [[Data Model]].
