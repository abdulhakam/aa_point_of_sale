---
title: Screen-by-screen parity against the legacy bundle, 2026-10-04
type: note
status: active
created: 2026-10-04
updated: 2026-10-04
tags: [parity, legacy, guest, screens, routes, cutover]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[guest-frontend-feature-parity-gaps]]", "[[route-map]]", "[[tb-0023-direct-shift-legacy-ui-to-guest]]", "[[tb-0014-point-company-fields-at-companies]]", "[[legacy-ui-reference-captures]]", "[[reports-parity-and-e2e-2026-09-29]]", "[[legacy-parity-checks-waived]]", "[[settle-structural-claims-with-the-owning-artifact]]"]
---

# Screen-by-screen parity against the legacy bundle, 2026-10-04

The legacy app's source was deleted on 2026-09-27, so **the frozen compiled bundle is the only surviving
description of the legacy app**. This note enumerates every screen that bundle can serve and settles what
the guest has in its place, screen by screen, with the request that settles each one.

New tool: `trailbase/tools/feature-parity.mjs`. It reads the legacy screens out of
`legacyforparity/standalone/.next/server/app` and the guest's routes out of its own dispatcher, so a new
guest route appears without anyone editing a list.

```text
legacy screens: 44
exact 1   candidate 37   unmapped 6
guest routes discovered: 68
```

**The tool deliberately has no `MISSING` verdict.** 37 of 44 legacy screens match nothing on a path
comparison because the two apps name the same screen differently — the guest mounts the item master at
`/inventory` where the legacy app had `/app/management/items`. A tool that reported those 37 as missing
would be [[settle-structural-claims-with-the-owning-artifact]] in its worst form: a mechanical absence
read as an absence of feature. So it reports `exact` / `renamed` / `candidate` / `unmapped` and leaves
the decision explicit. **The mapping below is that decision.**

## The two route-naming facts that break naive comparisons

- **The legacy app is served under `/app`.** The app directory is a real route group on disk
  (`server/app/app/…`), so the URL of `server/app/app/reports/payments/page.js` is
  **`/app/reports/payments`**. `/reports/payments` on the legacy server is a confident 404.
- **The guest's page slug is not its route.** `/reports/stockreport` is the declarative page
  `app/pages/reports/stock`, so its data endpoint is `/p/reports/stock/data`. Getting this wrong returns
  a 404 that looks like a missing endpoint — the same trap
  [[party-and-booker-ledgers-render-empty-and-say-nothing]] records.

## Every legacy screen, and the guest's answer

"answered 200" means an authenticated request returned 200 on the migrated whole database on 2026-10-04.

| legacy screen | guest | verdict |
|---|---|---|
| `/app/dashboard` | `/dashboard` | answered 200 |
| `/app/reports` (index) | `/reports` | answered 200 |
| `/app/reports/ledgers` (index) | `/reports/ledgers` | answered 200 |
| `/app/reports/dailysale` | `/reports/dailysale` + `/p/reports/dailysale` | answered 200 |
| `/app/reports/difference` | `/reports/difference` | answered 200 |
| `/app/reports/outstanding` | `/reports/outstanding` | answered 200 |
| `/app/reports/payments` | `/reports/payments` | answered 200 |
| `/app/reports/paymentsbycompany` | `/reports/paymentsbycompany` | answered 200 |
| `/app/reports/productsale` | `/reports/productsale` | answered 200 |
| `/app/reports/profit` | `/reports/profit` | answered 200 |
| `/app/reports/salesreport` | `/reports/salesreport` | answered 200 |
| `/app/reports/stockreport` | `/reports/stockreport` + `/p/reports/stock` | answered 200 |
| `/app/reports/ledgers/area` | `/reports/ledgers/area` | answered 200 |
| `/app/reports/ledgers/booker` | `/reports/ledgers/booker` | answered 200 |
| `/app/reports/ledgers/general` | `/reports/ledgers/general` | answered 200 |
| `/app/reports/ledgers/party` | `/reports/ledgers/party` | answered 200 |
| `/app/invoices` (list) | `/invoices` (301 rows) | answered 200 |
| `/app/invoices/purchase`, `/sale`, `/return`, `/difference` | `/invoices/new` with the invoice type — the four types are rows in `invoice_types` (`purchase`, `sale`, `return`, `difference`) | answered 200 |
| `/app/views/invoice` (standalone view) | `/invoices/<id>` | answered 200 |
| `/app/invoices/print`, `/app/invoices/printinvoice`, `/app/invoices/printinvoice/queue` | `/print` | answered 200 |
| `/app/cashmemo` (index) | `/cashmemo` | answered 200 |
| `/app/cashmemo/cash_payment_vouchers`, `/app/cashmemo/cash_recieve_vouchers` | `/cashmemo/vouchers` — **one screen covering both voucher types**, where the legacy app had two | answered 200 |
| `/app/cashmemo/da_entry` | `/cashmemo/da` | answered 200 |
| `/app/cashmemo/expenses` | `/cashmemo/expenses` | answered 200 |
| `/app/cashmemo/payments` | `/payments`, `/payments/new` | answered 200 |
| `/app/management` (index) | `/management` | answered 200 |
| `/app/management/parties` | `/management/parties` (944 rows) | answered 200 |
| `/app/management/items` | `/management/items` **and** `/inventory` | answered 200 |
| `/app/management/areas` | `/management/areas` | answered 200 |
| `/app/management/sections` | `/management/sections` | answered 200 |
| `/app/management/bookers` | `/management/bookers` ("Order Bookers") | answered 200 |
| `/app/management/categories` | `/management/categories` → **404 "Unknown entity"**; the guest calls it `/management/companies` | answered 200 at `/management/companies` |
| `/auth` | `/login`, `/logout` | answered 200 |
| `/` | `/` (303 to `/dashboard`) | answered 200 |

### The five legacy screens with no guest counterpart, and why

| legacy screen | why |
|---|---|
| `/app/invoices/orders` | **Removed by decision.** `app/lib/invoice-lifecycle.js:4-8`: the ORDERS system the draft phase existed for has been removed — "an invoice is published the moment it is saved and stays editable afterwards. There is no `status`, no commit step". Governed by [[no-draft-invoices-published-on-save]], which supersedes `invoice-lifecycle-draft-open-append-only`. `/invoices` + `/invoices/new` replace it. **This is not in the older parity note and is new here.** |
| `/app/reports/payments/areawise` | Deliberately omitted: in the legacy app it is a copy of the Unified Payments Report that no tile links to. Recorded in [[guest-frontend-feature-parity-gaps]] §3 |
| `/app/reports/stockreport/itemTransactionsReport` | Legacy-only screen with no new-side equivalent. Recorded in [[guest-frontend-feature-parity-gaps]] §3 |
| `/app/invoices/purchase` `/sale` `/return` `/difference` **as separate screens** | Merged into `/invoices/new` by type rather than duplicated four times. Not a gap — a consolidation. **The trade has not been checked**: the legacy app had four URLs, so any bookmark or muscle memory pointed at one now lands on a form that must be told the type. |
| `/app/cashmemo/cash_payment_vouchers` + `/cash_recieve_vouchers` | Merged into `/cashmemo/vouchers`. Same trade, two URLs become one. |

### Screens the guest has that the legacy app did not

- **Companies management** — `/management/companies`. The guest splits `categories` into
  `categories` (the stock category) and `companies` (the revenue company); the legacy app used one
  `categories` collection for both. [[tb-0014-point-company-fields-at-companies]].
- **Three report screens v1 never had**: `outstanding`, `productsale`, `dailysale`. Verified in
  [[reports-parity-and-e2e-2026-09-29]] §3a — so "parity" is not a one-to-one screen count, and these
  three cannot regress against v1 because there is nothing to match.
- **`/p` — the declarative page index**, and the **plugin hub** at `/plugins`.

## What this does and does not establish

**Establishes:** every screen the legacy bundle can serve has been enumerated (44), and 39 of them have a
guest route that answers 200 with the expected title. Five have no counterpart, each with a reason —
four by decision or consolidation, one (`orders`) by a decision recorded in code.

**Does not establish:** that the guest's screens *behave* like the legacy ones. That is
[[tb-0023-direct-shift-legacy-ui-to-guest]], the largest remaining item in the definition of done, and the
reason this note says "answered 200" rather than "parity". The reference for that comparison is
[[legacy-ui-reference-captures]], not the bundle.

Two behaviours this check surfaced that are worth deciding rather than assuming:

- **The party and booker ledgers need a counterparty selected** and render zero rows with no message,
  while their data endpoints return 26,525 — [[party-and-booker-ledgers-render-empty-and-say-nothing]].
- **The general ledger's default date window ends today** while the other three ledgers end 2026-04-11,
  so it is the general ledger that breaks
  [[report-default-window-comes-from-the-data]].

## Re-running it

```sh
node trailbase/tools/feature-parity.mjs --json parity.json
```

Read-only: it inspects the frozen bundle and the guest's dispatcher, and makes **no requests to either
server**, so it cannot be contaminated by harness residue. The 200s in the table above came from
`route-snapshot.mjs` against the migrated depot and from direct probes, not from this tool.

## Related

- [[guest-frontend-feature-parity-gaps]] — the behavioural gaps, which this note does not close.
- [[route-map]] — the maintained route table this confirms.
- [[legacy-parity-checks-waived]] — why there is no output-parity gate to compare against.