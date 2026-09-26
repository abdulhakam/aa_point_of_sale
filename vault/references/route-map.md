---
title: Route map
type: reference
status: active
system: both
created: 2026-09-26
tags: [pos, routes, frontend, frontend-ssr, nextjs, express]
related_to: ["[[frontend]]", "[[frontend-ssr]]"]
---

# Route map

Every user-visible route in the workspace, legacy ([[frontend]], Next.js App Router on
`:3000`) against new ([[frontend-ssr]], Express on `:3100`).

## Side by side

| Screen | Legacy (Next.js) | New (SSR) | Parity |
|---|---|---|---|
| Login | `/auth` | `/auth/login` | ✅ |
| Root / redirect | `/` | `/` → dashboard | ✅ |
| Dashboard | `/app/dashboard` | `/dashboard` | ✅ |
| Reports index | `/app/reports` | `/reports` | ✅ |
| Unified Payments Report | `/app/reports/payments` | `/reports/payments` | ✅ |
| Payments, area-wise | `/app/reports/payments/areawise` | — | ❌ omitted on purpose |
| Sales Report | `/app/reports/salesreport` | `/reports/salesreport` | ✅ |
| Payments By Company | `/app/reports/paymentsbycompany` | `/reports/paymentsbycompany` | ✅ |
| Item Sales Report | `/app/reports/transactions/unified` | `/reports/itemsales` | ✅ (renamed) |
| Profit Report | `/app/reports/profit` | `/reports/profit` | ✅ |
| Stock Report | `/app/reports/stockreport` | `/reports/stock` | ✅ |
| Item transactions report | `/app/reports/stockreport/itemTransactionsReport` | — | ❌ |
| Difference Report | `/app/reports/difference` | `/reports/difference` | ✅ |
| Outstanding Payments | `/app/reports/outstanding` | `/reports/outstanding` | ✅ |
| Product Sale Report | `/app/reports/productsale` | `/reports/productsale` | ✅ |
| Daily Sale Report | `/app/reports/dailysale` | `/reports/dailysale` | ✅ |
| Ledgers index | `/app/reports/ledgers` | `/reports/ledgers` | ✅ |
| Party Ledger | `/app/reports/ledgers/party` | `/reports/ledgers/party` | ✅ |
| Booker Ledger | `/app/reports/ledgers/booker` | `/reports/ledgers/booker` | ✅ |
| Area Ledger | `/app/reports/ledgers/area` | `/reports/ledgers/area` | ✅ |
| General Ledger | `/app/reports/ledgers/general` | `/reports/ledgers/general` | ✅ |
| Management hub | `/app/management` | `/management` | ✅ |
| Sections | `/app/management/sections` | `/management/sections` | ✅ |
| Areas | `/app/management/areas` | `/management/areas` | ✅ |
| Item Companies | `/app/management/categories` | `/management/categories` | ✅ |
| Companies | — | `/management/companies` | ➕ new |
| Parties | `/app/management/parties` | `/management/parties` | ✅ |
| Order Bookers | `/app/management/bookers` | `/management/bookers` | ✅ |
| Items | `/app/management/items` | `/management/items` | ✅ |
| Invoices index | `/app/invoices` | — | ❌ out of scope |
| Purchase invoices | `/app/invoices/purchase` | — | ❌ out of scope |
| Sale invoices | `/app/invoices/sale` | — | ❌ out of scope |
| Return invoices | `/app/invoices/return` | — | ❌ out of scope |
| Difference invoices | `/app/invoices/difference` | — | ❌ out of scope |
| Orders | `/app/invoices/orders` | — | ❌ out of scope |
| Invoice print | `/app/invoices/print`, `/printinvoice`, `/printinvoice/queue` | — | ❌ out of scope |
| Invoice view (public-ish) | `/views/invoice` | — | ❌ |
| Cash memo hub | `/app/cashmemo` | — | ❌ out of scope |
| Payment vouchers | `/app/cashmemo/cash_payment_vouchers` | — | ❌ out of scope |
| Receive vouchers | `/app/cashmemo/cash_recieve_vouchers` | — | ❌ out of scope |
| DA entry | `/app/cashmemo/da_entry` | — | ❌ out of scope |
| Expenses | `/app/cashmemo/expenses` | — | ❌ out of scope |
| Cash-memo payments | `/app/cashmemo/payments` | — | ❌ out of scope |

## SSR-only routes

| Route | Purpose |
|---|---|
| `GET /reports/status` | JSON state of the background refresh job (feeds the top-bar indicator) |
| `POST /reports/refresh` | manual refresh; `?full=1` re-reads every table; answers JSON or redirects back |
| `GET /p` | index of declarative pages discovered under `pages/` |
| `GET /p/<slug>` | a declarative page, rendered from its `meta.json` + template |
| `GET /p/<slug>/data` | that page's data: `{version, slug, filters, result, meta}`, ETagged and gzip-capable |
| `GET /plugins` | plugin hub, reading each `plugins/<slug>/meta.md` |
| `GET /plugins/<slug>/` | a plugin page (static file, behind the login) |
| `GET /healthz` | `{ok: true, workers: …}` |
| `GET /static/*` | static assets, `maxAge: 0` (revalidate every load) |
| `GET /compute/*` | the shared compute modules, **behind `requireAuth`** |

## Legacy-only route families

- `/app/invoices/**` — the whole invoice cycle plus the print queue.
- `/app/cashmemo/**` — vouchers, DA entry, expenses, payments.
- `/views/invoice` — a standalone invoice view.
- Storybook on `:6006` (`npm run storybook`), which is a dev route, not an app route.

## Notes on the mapping

- The legacy Item Sales Report lives at `reports/transactions/unified` while the SSR version
  is `reports/itemsales`; the *title* is the same ("Item Sales Report"). Do not assume route
  path equality when comparing.
- The SSR management hub additionally exposes **Companies**, which the legacy app has no
  screen for even though the `companies` collection exists. This is part of the open naming
  question in [[tb-0014-point-company-fields-at-companies]].
- Both apps use the same *labels* for the report tiles (the SSR `REPORT_INDEX` comments say
  so explicitly), so the tiles were copied deliberately rather than reinvented.
- Ports: legacy frontend `:3000`, PocketBase `:8090`, TrailBase `:4000`, SSR frontend
  `:3100`. Full detail in [[environment]].
