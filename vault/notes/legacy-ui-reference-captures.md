---
title: Legacy UI reference captures
type: note
status: active
created: 2026-09-27
tags: [legacy, frontend, ui, parity, screenshots, reference, nextjs]
related_to: ["[[guest-ui-is-a-direct-shift-of-legacy]]", "[[tb-0023-direct-shift-legacy-ui-to-guest]]", "[[frontend]]", "[[route-map]]"]
---

# Legacy UI reference captures

Screenshots and accessibility snapshots of the **legacy production UI** ([[frontend]], Next.js on
`:3000`) taken through Chrome DevTools. They are the visual reference for the direct-shift parity
work ([[guest-ui-is-a-direct-shift-of-legacy]],
[[tb-0023-direct-shift-legacy-ui-to-guest]]).

Files live in `vault/attachments/legacy-ui/` and are linked as `[[file.ext]]`.

## Index

40 screens captured on **2026-09-27** at a 1600×900 viewport (viewport screenshots, not
full-page, to keep the images usable). Files are in `vault/attachments/legacy-ui/`; `.png` is the
screenshot and `.snapshot.yml` the accessibility/DOM snapshot where one was taken.

| # | Screen | Route | Capture |
|---|---|---|---|
| 01 | Login | `/auth` | `01-login.png` + `.snapshot.yml` |
| 02 | Dashboard | `/app/dashboard` | `02-dashboard.png` + `.snapshot.yml` |
| 03 | Reports index | `/app/reports` | `03-reports.png` |
| 04 | Unified payments | `/app/reports/payments` | `04-reports-payments.png` |
| 05 | Payments, area-wise | `/app/reports/payments/areawise` | `05-reports-payments-areawise.png` |
| 06 | Sales | `/app/reports/salesreport` | `06-reports-salesreport.png` |
| 07 | Payments by company | `/app/reports/paymentsbycompany` | `07-reports-paymentsbycompany.png` |
| 08 | Item sales | `/app/reports/transactions/unified` | `08-reports-itemsales.png` |
| 09 | Profit | `/app/reports/profit` | `09-reports-profit.png` |
| 10 | Stock | `/app/reports/stockreport` | `10-reports-stockreport.png` |
| 11 | Item transactions | `/app/reports/stockreport/itemTransactionsReport` | `11-reports-item-transactions.png` |
| 12 | Difference | `/app/reports/difference` | `12-reports-difference.png` |
| 13 | Outstanding | `/app/reports/outstanding` | `13-reports-outstanding.png` |
| 14 | Product sale | `/app/reports/productsale` | `14-reports-productsale.png` |
| 15 | Daily sale | `/app/reports/dailysale` | `15-reports-dailysale.png` |
| 16 | Ledgers index | `/app/reports/ledgers` | `16-reports-ledgers.png` |
| 17 | Party ledger | `/app/reports/ledgers/party` | `17-ledgers-party.png` |
| 18 | Booker ledger | `/app/reports/ledgers/booker` | `18-ledgers-booker.png` |
| 19 | Area ledger | `/app/reports/ledgers/area` | `19-ledgers-area.png` |
| 20 | General ledger | `/app/reports/ledgers/general` | `20-ledgers-general.png` |
| 21 | Management hub | `/app/management` | `21-management.png` |
| 22 | Sections | `/app/management/sections` | `22-management-sections.png` |
| 23 | Areas | `/app/management/areas` | `23-management-areas.png` |
| 24 | Categories (Item Companies) | `/app/management/categories` | `24-management-categories.png` |
| 25 | Parties | `/app/management/parties` | `25-management-parties.png` |
| 26 | Order bookers | `/app/management/bookers` | `26-management-bookers.png` |
| 27 | Items | `/app/management/items` | `27-management-items.png` |
| 28 | Invoices index | `/app/invoices` | `28-invoices.png` |
| 29 | Purchase invoices | `/app/invoices/purchase` | `29-invoices-purchase.png` |
| 30 | Sale invoices | `/app/invoices/sale` | `30-invoices-sale.png` + `.snapshot.yml` |
| 31 | Return invoices | `/app/invoices/return` | `31-invoices-return.png` |
| 32 | Difference invoices | `/app/invoices/difference` | `32-invoices-difference.png` |
| 33 | Orders | `/app/invoices/orders` | `33-invoices-orders.png` |
| 34 | Invoice print | `/app/invoices/print` | `34-invoices-print.png` |
| 35 | Cash memo hub | `/app/cashmemo` | `35-cashmemo.png` |
| 36 | Payment vouchers | `/app/cashmemo/cash_payment_vouchers` | `36-cashmemo-payment-vouchers.png` |
| 37 | Receive vouchers | `/app/cashmemo/cash_recieve_vouchers` | `37-cashmemo-receive-vouchers.png` |
| 38 | DA entry | `/app/cashmemo/da_entry` | `38-cashmemo-da-entry.png` |
| 39 | Expenses | `/app/cashmemo/expenses` | `39-cashmemo-expenses.png` |
| 40 | Cash-memo payments | `/app/cashmemo/payments` | `40-cashmemo-payments.png` |
| 41 | Standalone invoice view | `/views/invoice` | `41-views-invoice.png` |

## How the captures were taken

1. Started the legacy stack: `backend\pocketbase.exe serve --dev` (`:8090`) then `npm run dev`
   in `frontend/` (`:3000`) — see [[build-and-run]].
2. Signed in at `/auth` with the production app account ([[frontend]]); the browser
   session cookies then carried the captures.
3. Walked each route with Chrome DevTools (a Playwright/DevTools browser driven over MCP),
   waited for the tables to load, and saved one screenshot per route, plus an
   accessibility/DOM snapshot for login, dashboard and the sale-invoice entry screen.

## Caveats

- The screenshots are the **viewport**, not the full scrollable page, so long tables are cut
  off after the first screenful.
- Three report routes (`difference`, `outstanding`, `productsale`) aborted when navigated in a
  fast batch during Next.js dev-mode compilation; they were captured individually afterwards.
- Dev-mode pages log a number of console errors (the React Query/table warnings); they do not
  reflect production behaviour.

## Related

- [[frontend]] — the system captured.
- [[route-map]] — the full route inventory.
- [[guest-ui-is-a-direct-shift-of-legacy]] — why the captures exist.
