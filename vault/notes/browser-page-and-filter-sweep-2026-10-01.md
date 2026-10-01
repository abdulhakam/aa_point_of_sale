---
title: Browser sweep of every guest page and filter, 2026-10-01
type: note
status: active
created: 2026-10-01
tags: [runtime-js, reports, browser, devtools, filters, verification]
related_to: ["[[runtime-js-guest-platform]]", "[[report-routes-ignore-date-defaults]]", "[[payment-type-select-never-comes-back-selected]]", "[[id-filter-given-a-name-returns-500]]", "[[route-map]]", "[[guest-smoke-report-total-checks-fail-on-pristine-checkout]]"]
---

# Browser sweep of every guest page and filter, 2026-10-01

What a full pass over the guest frontend found, driving the real browser through DevTools MCP
against `trailbase/RUN.BAT` on `http://127.0.0.1:4000` with the production depot loaded
(8,204 sale invoices, 943 parties, 59 areas, 8 sections, 4 bookers, 15 companies, 207 items).

## Method

- One server; the guest frontend is served by TrailBase itself, so there is no second process
  ([[runtime-js-guest-platform]]).
- Routes were walked by `fetch` from inside the authenticated page — status, byte length, `<tr>`
  count, `selected`/`checked` state, and the `Showing first N of M` rowInfo — then spot-checked in
  the browser with screenshots.
- Filters were exercised by driving the real `<form class="filters">` (setting values and calling
  `requestSubmit`), not by hand-writing URLs, so what was measured is what a user gets.
- `guest-smoke.mjs` was run against the same depot for the suite-level check.

## Result: every page renders

All 58 routes probed return 200 with a real table or form:

| Group | Routes | Result |
|---|---|---|
| Dashboard | `/dashboard` | tiles + overview counts, all populated |
| Reports | `/reports` + 10 report tiles, `/reports/ledgers` + 4 ledger tiles | all render; slowest is `paymentsbycompany` at ~1.5 s |
| Invoices | `/invoices`, `/invoices/new`, `/invoices/<id>` | grid, entry form and detail all render |
| Payments | `/payments`, `/payments/new` | list and entry render |
| Inventory | `/inventory` | renders, live stock |
| Cash memo | `/cashmemo`, `/vouchers`, `/da`, `/expenses` | all render |
| Print | `/print`, `/jobs/<id>` | queue and job detail render |
| Management | `/management` + 6 entity lists | all render with per-row create/update/delete forms |
| Declarative pages | `/p` + 14 `/p/<slug>` + `/p/<slug>/data` | all render; each `data` endpoint returns versioned JSON |
| Plugins | `/plugins`, `/plugins/import-from-v1/` | render |

**No dead nav links.** Crawling every `href` from `/dashboard`, `/reports`, `/reports/ledgers`,
`/invoices`, `/management`, `/p`, `/cashmemo`, `/print` found no link to a 404. Five routes return
404 but nothing links to them and they are not part of the app: `/invoices/entry`,
`/management/categories` (the route is `/management/companies`), `/reports/stock` (it is
`/reports/stockreport`), `/cashmemo/voucher` (it is `/cashmemo/vouchers`), `/bench/spooled`.

## Result: filters work

Every declared filter on every report narrows the result, measured on the rendered page:

| Report | party | area | section | booker | company | item | dates | invoice # |
|---|---|---|---|---|---|---|---|---|
| payments | ✅ 26,099 → 39 | ✅ | ✅ | ✅ 1,610 | — | — | ✅ | ✅ → 11 rows |
| itemsales | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| profit / salesreport / paymentsbycompany | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| outstanding | — | ✅ | ✅ | ✅ 600 → 84 | — | — | n/a (no date fields) | — |
| stockreport / difference | — | — | — | — | ✅ | — | n/a | — |
| dailysale / productsale | — | ✅ | ✅ | ✅ | — | — | ✅ | — |
| ledgers party / booker / area | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | — |

Non-report forms work too: `/invoices` type + date range, `/payments` type + standalone, `/inventory`
free-text `q`, `/cashmemo/expenses` `q` + date range, `/cashmemo/vouchers` type,
`/cashmemo/da` date range. `applyDate` on `paymentsbycompany` round-trips as a checkbox.

**A caution about how this was first measured.** An initial pass concluded "several filters have no
effect" from comparing `<tr>` counts. That was wrong: `/reports/*` caps rendered rows at 1,000
([[report-render-row-cap]]), so any filter leaving more than 1,000 rows shows an identical `<tr>`
count while `Showing first 1,000 of N` shows the truth. The table above is built from `rowInfo`
totals. Counting rendered rows cannot detect a live filter.

## Three defects found

1. [[report-routes-ignore-date-defaults]] — already open. `/reports/*` ignores its declared date
   defaults and renders all-time figures: `dailysale` 8,204 rows on a bare GET where `/p/dailysale`
   defaults to today and returns 0. Confirmed unchanged.
2. [[payment-type-select-never-comes-back-selected]] — **new**. `?type=2` filters correctly
   (1,009 → 56 rows) but the Payment Type select renders no option `selected`, because
   `parseFilters` coerces it to `Number` and the template compares against string option values.
   Every other select round-trips, which is what isolates it.
3. [[id-filter-given-a-name-returns-500]] — **new, low**. Handing an id filter a *name* returns
   HTTP 500 with `blob: parameter is not valid URL-safe base64` instead of a 400 or an empty
   report. No shipped UI path produces it; only a hand-edited URL does.

## Suite status

`node trailbase/tools/guest-smoke.mjs` → **67/76**. The nine failures are the known
profit-margin, item-sale, payment-total and KV-cache checks already recorded in
[[guest-smoke-report-total-checks-fail-on-pristine-checkout]] — none is new, and none is a page or
filter failure.

## Not covered

Write paths were not exercised: no invoice, payment, expense, DA or voucher was created or edited,
and no management record was written. The forms were confirmed to render with the right
`action=` targets, not submitted. Money rounding was not re-checked — see
[[money-is-2dp-everywhere]].

## Related

- [[route-map]] — the route inventory this sweep walked.
- [[runtime-js-guest-platform]] — the system under test.
- [[trailbase-migration]] — the workstream this belongs to.