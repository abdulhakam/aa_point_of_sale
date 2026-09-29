---
title: Route map
type: reference
status: active
system: both
created: 2026-09-26
updated: 2026-09-27
tags: [pos, routes, frontend, guest, nextjs, wasm]
related_to: ["[[frontend]]", "[[runtime-js-guest-platform]]"]
---

# Route map

Every user-visible route in the workspace, legacy ([[frontend]], Next.js App Router on
`:3000`) against the new frontend ([[runtime-js-guest-platform]], served by TrailBase itself,
normally on `:4003`).

## Side by side

| Screen | Legacy (Next.js) | New (guest) | Parity |
|---|---|---|---|
| Login | `/auth` | `/login` | ✅ |
| Root / redirect | `/` | `/` → dashboard | ✅ |
| Dashboard | `/app/dashboard` | `/dashboard` | ✅ (look differs — [[tb-0023-direct-shift-legacy-ui-to-guest]]) |
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
| Outstanding Payments | `/app/reports/outstanding` | `/reports/outstanding` | ⚠️ **route exists but hangs** — see below |
| Product Sale Report | `/app/reports/productsale` | `/reports/productsale` | ✅ (guest-only, renders 879 ms) |
| Daily Sale Report | `/app/reports/dailysale` | `/reports/dailysale` | ✅ (guest-only, renders 1,406 ms) |
| Ledgers index | `/app/reports/ledgers` | `/reports/ledgers` | ✅ |
| Party Ledger | `/app/reports/ledgers/party` | `/reports/ledgers/party` | ✅ |
| Booker Ledger | `/app/reports/ledgers/booker` | `/reports/ledgers/booker` | ✅ |
| General Ledger | `/app/reports/ledgers/general` | `/reports/ledgers/general` | ✅ |

**CORRECTION 2026-09-29 — the three "no legacy route" rows above were wrong.** An earlier revision
of this table recorded `outstanding`, `productsale` and `dailysale` as having no production route.
The claim came from counting route **folders** under `frontend/src/app/app/reports/` without opening
them. Driving the real browser shows all three routes exist, the nav renders links to all three, and
each returns 200. `productsale` and `dailysale` render normally. `outstanding` returns 200 but stays
on `Loading...` with no table — verified again after 30 s — so it is a **production hang**, not a
missing route. Timings in [[browser-benchmark-2026-09-29]].

| Management hub | `/app/management` | `/management` | ✅ |
| Sections | `/app/management/sections` | `/management/sections` | ✅ |
| Areas | `/app/management/areas` | `/management/areas` | ✅ |
| Item Companies | `/app/management/categories` | `/management/categories` | ✅ |
| Companies | — | `/management/companies` | ➕ new |
| Parties | `/app/management/parties` | `/management/parties` | ✅ |
| Order Bookers | `/app/management/bookers` | `/management/bookers` | ✅ |
| Items | `/app/management/items` | `/management/items` | ✅ |
| Invoices index | `/app/invoices` | — | ❌ not built |
| Purchase invoices | `/app/invoices/purchase` | — | ❌ not built |
| Sale invoices | `/app/invoices/sale` | — | ❌ not built |
| Return invoices | `/app/invoices/return` | — | ❌ not built |
| Difference invoices | `/app/invoices/difference` | — | ❌ not built |
| Orders | `/app/invoices/orders` | — | ❌ not built |
| Invoice print | `/app/invoices/print`, `/printinvoice`, `/printinvoice/queue` | — | ❌ not built |
| Invoice view (public-ish) | `/views/invoice` | — | ❌ |
| Cash memo hub | `/app/cashmemo` | — | ❌ not built |
| Payment vouchers | `/app/cashmemo/cash_payment_vouchers` | — | ❌ not built |
| Receive vouchers | `/app/cashmemo/cash_recieve_vouchers` | — | ❌ not built |
| DA entry | `/app/cashmemo/da_entry` | — | ❌ not built |
| Expenses | `/app/cashmemo/expenses` | — | ❌ not built |
| Cash-memo payments | `/app/cashmemo/payments` | — | ❌ not built |

The ❌ rows are the parity work in [[guest-frontend-feature-parity-gaps]] and
[[tb-0023-direct-shift-legacy-ui-to-guest]].

## Guest-only routes

| Route | Purpose |
|---|---|
| `GET /reports/status` | JSON state of the background refresh job (feeds the top-bar indicator) |
| `POST /reports/refresh` | manual refresh; `?full=1` re-reads every table; answers JSON or redirects back |
| `GET /p` | index of declarative pages discovered under `pages/` |
| `GET /p/<slug>` | a declarative page, rendered from its `meta.json` + template |
| `GET /p/<slug>/data` | that page's data: `{version, slug, filters, result, meta}`, ETagged (no gzip in the guest) |
| `GET /plugins` | plugin hub, reading each `plugins/<slug>/meta.md` |
| `GET /plugins/<slug>/` | a plugin page (static file, behind the login) |
| `GET /healthz` | `{ok: true, workers: …}` |
| `GET /static/*` | static assets, `maxAge: 0` (revalidate every load) |
| `GET /compute/*` | the shared compute modules, behind auth |

## Legacy-only route families

- `/app/invoices/**` — the whole invoice cycle plus the print queue.
- `/app/cashmemo/**` — vouchers, DA entry, expenses, payments.
- `/views/invoice` — a standalone invoice view.
- Storybook on `:6006` (`npm run storybook`), which is a dev route, not an app route.

## Notes on the mapping

- The legacy Item Sales Report lives at `reports/transactions/unified` while the guest version
  is `reports/itemsales`; the *title* is the same ("Item Sales Report"). Do not assume route
  path equality when comparing.
- **CORRECTION 2026-09-29 — the claim below was wrong on both counts.** The guest management hub
  does **not** additionally expose Companies, and the legacy app is **not** without a screen for it.
  The legacy has `frontend/src/app/app/management/categories/` and its nav entry is
  `{ text: "companies", path: "management/categories" }` — the label is "companies", the route is
  "categories". And the legacy has **no `companies` collection at all**: PocketBase has 12 base
  collections and 13 views, and `companies` is in neither. What legacy stores in a collection named
  `categories` is the **company** list, which is why every user-facing surface calls it "companies".
  See [[categories-is-the-company-list]].
- Both apps use the same *labels* for the report tiles, so the tiles were copied deliberately
  rather than reinvented — the direct-shift mandate is [[guest-ui-is-a-direct-shift-of-legacy]].
- Ports: legacy frontend `:3000`, PocketBase `:8090`, TrailBase `:4000`, guest frontend
  `:4003`. Full detail in [[environment]].

## Related

- [[guest-frontend-feature-parity-gaps]] — what the ❌ rows cost.
- [[legacy-ui-reference-captures]] — the captured legacy screens.
