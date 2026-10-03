---
title: Route map
type: reference
status: active
system: both
created: 2026-09-26
updated: 2026-10-03
tags: [pos, routes, frontend, guest, nextjs, wasm]
related_to: ["[[frontend]]", "[[runtime-js-guest-platform]]", "[[cutover-is-guest-only]]", "[[route-snapshot-was-snapshotting-redirects]]"]
---

# Route map

Every route in the workspace: the legacy UI ([[frontend]], a **compiled** Next.js App Router bundle
whose source was deleted from git on 2026-09-29) against the guest
([[runtime-js-guest-platform]]), which TrailBase serves itself on **`:4000`**.

> **Corrected 2026-10-03, in three places.** This note previously opened by saying the guest runs
> "normally on `:4003`" — **wrong**: the guest is a component of the single TrailBase server and is
> served from `:4000`; `:4003` is only a harness convention (a default `GUEST_BASE`). It also listed
> all 15 invoice and cash-memo routes as "❌ not built", which stopped being true when
> [[guest-invoice-lifecycle]] built them. And the whole Legacy column is now a **historical** record:
> those routes cannot be exercised, because `legacyforparity/standalone/` has no `src/` and no build.
> See [[cutover-is-guest-only]].
>
> **The guest column below was re-verified on 2026-10-03** by
> `node trailbase/tools/route-snapshot.mjs` against a live server — 49 routes, every report and
> ledger answering 200. The tool had a login bug that made it snapshot redirects instead; it is
> fixed and recorded in [[route-snapshot-was-snapshotting-redirects]]. **A route marked ✅ below is
> one the harness actually observed rendering, not one that merely appears in a folder listing.**

## Side by side

| Screen | Legacy (Next.js, frozen) | Guest | Parity |
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
| Stock Report | `/app/reports/stockreport` | `/reports/stockreport` | ✅ (same slug, not `/stock`) |
| Item transactions report | `/app/reports/stockreport/itemTransactionsReport` | — | ❌ dropped |
| Difference Report | `/app/reports/difference` | `/reports/difference` | ✅ |
| Outstanding Payments | `/app/reports/outstanding` | `/reports/outstanding` | ✅ — ⚠️ it **hung in production** (stuck on `Loading...`, verified after 30 s); the guest answers 200 |
| Product Sale Report | `/app/reports/productsale` | `/reports/productsale` | ✅ |
| Daily Sale Report | `/app/reports/dailysale` | `/reports/dailysale` | ✅ |
| Ledgers index | `/app/reports/ledgers` | `/reports/ledgers` | ✅ |
| Party Ledger | `/app/reports/ledgers/party` | `/reports/ledgers/party` | ✅ |
| Booker Ledger | `/app/reports/ledgers/booker` | `/reports/ledgers/booker` | ✅ |
| Area Ledger | `/app/reports/ledgers/area` | `/reports/ledgers/area` | ✅ |
| General Ledger | `/app/reports/ledgers/general` | `/reports/ledgers/general` | ✅ |

**CORRECTION 2026-09-29 — the three "no legacy route" rows above were wrong.** An earlier revision
of this table recorded `outstanding`, `productsale` and `dailysale` as having no production route.
The claim came from counting route **folders** under `frontend/src/app/app/reports/` without opening
them. Driving the real browser showed all three routes existed, the nav rendered links to all three,
and each returned 200. `productsale` and `dailysale` rendered normally. `outstanding` returned 200
but stayed on `Loading...` — a **production hang**, not a missing route. Timings in
[[browser-benchmark-2026-09-29]]. (⚠️ Those sources are deleted from git now; the folder-counting
error is itself the worked example behind [[settle-structural-claims-with-the-owning-artifact]].)

| Management hub | `/app/management` | `/management` | ✅ |
| Sections | `/app/management/sections` | `/management/sections` | ✅ |
| Areas | `/app/management/areas` | `/management/areas` | ✅ |
| Item Companies | `/app/management/categories` | `/management/categories` | ✅ |
| Companies | — | `/management/companies` | ➕ guest-only |
| Parties | `/app/management/parties` | `/management/parties` | ✅ |
| Order Bookers | `/app/management/bookers` | `/management/bookers` | ✅ |
| Items | `/app/management/items` | `/management/items` | ✅ |
| Invoices index | `/app/invoices` | `/invoices` | ✅ |
| Purchase invoices | `/app/invoices/purchase` | `/invoices/new?type=0` | ✅ |
| Sale invoices | `/app/invoices/sale` | `/invoices/new?type=1` | ✅ |
| Return invoices | `/app/invoices/return` | — | ❌ not built |
| Difference invoices | `/app/invoices/difference` | — | ❌ not built |
| Orders | `/app/invoices/orders` | — | ❌ dropped with the draft lifecycle |
| Invoice print | `/app/invoices/print`, `/printinvoice`, `/printinvoice/queue` | `/print` | ✅ print queue rebuilt |
| Cash memo hub | `/app/cashmemo` | `/cashmemo` | ✅ |
| Payment / receive vouchers | `/app/cashmemo/cash_payment_vouchers`, `/cash_recieve_vouchers` | `/cashmemo/vouchers` | ✅ |
| DA entry | `/app/cashmemo/da_entry` | `/cashmemo/da` | ✅ |
| Expenses | `/app/cashmemo/expenses` | `/cashmemo/expenses` | ✅ |
| Inventory (live stock, item edit) | — | `/inventory` | ➕ guest-only |
| Payments | `/app/cashmemo/payments` | `/payments`, `/payments/new` | ✅ |

**CORRECTION 2026-10-03 — the fifteen "❌ not built" rows above are no longer true.** An earlier
revision recorded every invoice and cash-memo route as "❌ not built" on the guest. [[guest-invoice-lifecycle]]
built them: `/invoices`, `/invoices/new?type=0` (purchase) and `?type=1` (sale), `/payments`,
`/payments/new`, `/cashmemo`, `/cashmemo/vouchers`, `/cashmemo/da`, `/cashmemo/expenses`,
`/inventory` and `/print` all answer **200** in the 2026-10-03 snapshot. What genuinely remains
unbuilt is **return** and **difference** invoice entry, and **orders**.

⚠️ **Orders were withdrawn, not deferred.** The legacy app had `/app/invoices/orders`; the draft
lifecycle was withdrawn on 2026-10-02 and orders went with it ([[no-draft-invoices-published-on-save]]).
There is no plan to rebuild them, so this row is a permanent divergence, not a gap.

## Guest-only routes

Verified present on 2026-10-03:

| Route | Purpose |
|---|---|
| `GET /reports/status` | JSON state of the background refresh job (feeds the top-bar indicator) |
| `POST /reports/refresh` | manual refresh; `?full=1` re-reads every table; answers JSON or redirects back |
| `GET /p` | index of declarative pages discovered under `pages/` |
| `GET /p/<slug>` | a declarative page, rendered from its `meta.json` + template |
| `GET /p/<slug>/data` | that page's data: `{version, slug, filters, result, meta, tables}`, ETagged |
| `GET /invoice-doc`, `/invoice-doc/verify`, `/invoice-doc/list` | the materialised invoice documents (TB-0027) — the read API exists and **still nothing in the UI reads it** |
| `GET /bench/reportkeys` | report key list |
| `GET /plugins` | plugin hub, reading each `plugins/<slug>/meta.md` |
| `GET /plugins/<slug>/` | a plugin page (static file, behind the login) |
| `GET /healthz` | `{ok: true, workers: …}` |
| `GET /static/*` | static assets, `maxAge: 0` (revalidate every load) |
| `GET /compute/*` | the shared compute modules, behind auth |

## Legacy-only route families

These exist **only in the frozen compiled bundle**. They can be run but not changed, and the source
is recoverable only from git history at `c167d311^`.

- `/app/reports/payments/areawise` — a copy of the Unified Payments Report no tile linked to.
- `/app/reports/stockreport/itemTransactionsReport` — no guest equivalent.
- `/views/invoice` — a standalone invoice view; the guest's equivalent is `/invoice-doc`.
- `/app/invoices/return`, `/app/invoices/difference`, `/app/invoices/orders` — no guest equivalent.
- Storybook on `:6006` — a dev route, and ⚠️ **unreachable**: it needs `npm run storybook` in
  `frontend/`, which no longer exists.

## Notes on the mapping

- The legacy Item Sales Report lives at `reports/transactions/unified` while the guest version
  is `reports/itemsales`; the *title* is the same ("Item Sales Report"). Do not assume route
  path equality when comparing.
- **CORRECTION 2026-09-29 — the claim below was wrong on both counts.** The guest management hub
  does **not** additionally expose Companies, and the legacy app is **not** without a screen for it.
  The legacy had `frontend/src/app/app/management/categories/` and its nav entry was
  `{ text: "companies", path: "management/categories" }` — the label is "companies", the route is
  "categories". And the legacy had **no `companies` collection at all**: PocketBase has 12 base
  collections and 13 views, and `companies` is in neither. What legacy stores in a collection named
  `categories` is the **company** list, which is why every user-facing surface calls it "companies".
  See [[categories-is-the-company-list]].
- ⚠️ **The guest now has a real `/management/companies`**, which the legacy never had — so the
  2026-09-29 "does not additionally expose Companies" line above describes the guest *as it was on
  2026-09-29*, not as it is. `/management/companies` answers 200 in the 2026-10-03 snapshot. The
  two collections (`categories` vs `companies`) are still distinct; see
  [[tb-0014-point-company-fields-at-companies]].
- Both apps use the same *labels* for the report tiles, so the tiles were copied deliberately
  rather than reinvented — the direct-shift mandate is [[guest-ui-is-a-direct-shift-of-legacy]].
- **Ports: the guest has none of its own.** Legacy frontend `:3000`, PocketBase `:8090`,
  TrailBase **and** guest `:4000`. `:4003` is a harness default, not a server. Full detail in
  [[environment]].

## Related

- [[guest-frontend-feature-parity-gaps]] — what the ❌ rows cost.
- [[legacy-ui-reference-captures]] — the captured legacy screens, the parity reference.
- [[route-snapshot-was-snapshotting-redirects]] — the harness that verified the guest column, and
  the bug that made it a false pass until 2026-10-03.
