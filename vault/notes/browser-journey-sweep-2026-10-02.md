---
title: Browser journey sweep of the whole app, 2026-10-02
type: note
status: active
created: 2026-10-02
tags: [runtime-js, browser, devtools, reports, filters, verification, journey]
related_to: ["[[browser-page-and-filter-sweep-2026-10-01]]", "[[imported-invoices-are-all-drafts-so-every-report-is-empty]]", "[[runtime-js-guest-platform]]", "[[route-map]]", "[[serve-the-app-on-all-interfaces]]", "[[report-render-row-cap]]"]
---

# Browser journey sweep of the whole app, 2026-10-02

> **Update, later the same day.** [[no-draft-invoices-published-on-save]] removed the draft lifecycle
> that caused the empty reports, and they are now populated. The "Verdict per surface" table below
> records what the sweep found **before** that change and is kept as the evidence for it; the
> after-state is in [[imported-invoices-are-all-drafts-so-every-report-is-empty]].

A full pass over the guest frontend driven through DevTools MCP against the production depot served
on `http://192.168.86.164:4000` — i.e. over the LAN address, not loopback
([[serve-the-app-on-all-interfaces]]) — with every report opened for the range the user asked for,
**1 Jan 2026 to today (2 Oct 2026)**, skipping date fields on the global reports.

The headline is not a set of small defects: **[[imported-invoices-are-all-drafts-so-every-report-is-empty]]**
— the whole imported ledger is out of the books, so every report and every invoice list renders empty.

## Method

- Logged in through the real form (`/login` → `admin@localhost`), then walked the nav.
- Each report was driven the way a user does it: the real `<form class="filters">` GETs
  `/p/reports/<slug>` with `from`/`to`, and the rendered HTML was read back for `Rows: N`, the
  row count, the totals block and the empty-state text.
- The declarative `/p/<slug>/data` endpoints were used as the cross-check, since they return the
  same report as JSON (`result.rows`, `result.totals`) with no HTML parsing involved.
- Non-report pages were walked over HTTP with the session cookie, counting `<tr>`, `<form>` and the
  totals text; two full-page screenshots were taken for the record.

## Verdict per surface

| Surface | Result |
|---|---|
| Login → dashboard | Works; cookie is host-only, so it works from the LAN address too |
| **All 10 reports** | **Empty** — `Rows: 0`, "No data for the selected filters.", every total `0.00`, for *every* range tried |
| **All 4 ledgers** | **Empty** — same |
| **Invoice grid** `/invoices` | **Empty** — "Invoices (0)", 0.00 billed/paid/balance. Works with `?drafts=1` |
| Invoice detail `/invoices/<id>` | Renders — "Invoice #8606", 11 rows, real totals |
| Invoice / payment entry forms | Render (`/invoices/new`, `/payments/new`) |
| Dashboard tiles | Master data correct; **invoice and payment tiles read 0.0** |
| `/payments` | **Works** — 300 rows (page cap), amounts populated |
| `/inventory` | **Works** — 208 rows |
| `/cashmemo` hub, `/vouchers`, `/da` | Render |
| `/cashmemo/expenses` | **Works** — 89 rows, amounts populated |
| `/print` queue | Renders (empty queue) |
| `/management` + 6 entity lists | **All work** — sections 10, areas 59, companies 15, parties 943, bookers 4, items 207 |
| `/p` declarative index | Renders |
| `/plugins`, `/plugins/import-from-v1/` | Render |
| `/healthz` | 200 |

The split is the tell: anything that reads **base tables directly** is correct; anything that goes
through the committed-invoice snapshot is empty. That is the filter in `app/lib/data.js`, not a
per-page bug — which is why the fix is one predicate, not fourteen pages.

## Every date range tried on the payments report

| Range | Rows |
|---|---|
| no parameters (defaults `2026-10-01`→`2026-10-02`) | 0 |
| `2026-01-01` → `2026-10-02` (the requested window) | 0 |
| `2020-01-01` → `2030-12-31` (all time) | 0 — **26,099 rows on 2026-10-01** |
| `2026-04-01` → `2026-04-11` (where the invoices actually are) | 0 |
| `2026-04-11` → `2026-04-11` (single day) | 0 |
| `2025-01-01` → `2025-12-31` | 0 |

The data in the requested window is real: 1,763 invoices have `dated` in 2026, the newest is
`2026-04-11`, and 26,526 payments exist. The empty result is not "no data in that period" — it is
the filter described in the linked issue.

Note what this **does** confirm as working: the date plumbing itself is fine. The form round-trips
the range (`Date From 01/01/2026`, `Date To 02/10/2026` in the screenshot), the meta line echoes it,
and every report accepted and echoed the parameters. [[report-routes-ignore-date-defaults]] is a
separate, older defect; it is not what is happening here.

## What the user cannot do

- No report, ledger or invoice list shows any business data, so the app cannot be used to answer a
  single business question.
- **"Reload report data" does not help.** `POST /reports/refresh?full=1` returns `200` and rebuilds
  nothing (`lastRefresh: {changed: [], rebuilt: []}`), because the persisted snapshot's fingerprint
  matches the live data and it is empty for a *correct* reason.
- `/reports/status` reports `ready: true` with `tables: 12`, `views: 10`, `rows: 1300`. The 1,300
  rows are the six small master tables; it is not reporting that the report inputs are missing. The
  status endpoint is not a health signal for this failure.

## Also noticed

- **Overview counts render as `10.0`, `59.0`, `943.0`** — counts formatted through a money/float
  formatter. Cosmetic, but it is on the landing page.
- **`/ahscripts/init directory not found`** on every page load, and a stream of
  `bridge error: Open no-entry (error 20)` / `not-directory (error 24)` in the server log per page
  render. Pages still render, so it is not user-visible, but it is unbounded log noise on a
  per-request path.
- No console errors in the browser on any page visited.

## Not covered

- **No writes.** No invoice, payment, expense, DA or voucher was created or edited, and no
  management record was written — the depot is production data. Forms were confirmed to render with
  the right `action=`, not submitted. (Entry forms were verified on a throw-away depot by the
  earlier work; see [[guest-invoice-lifecycle]].)
- Money rounding was not re-checked; with every report empty there is nothing to round.
- Print output was not rendered — the queue was empty, so there was no job to open.

## Related

- [[imported-invoices-are-all-drafts-so-every-report-is-empty]] — the cause of the empty reports.
- [[browser-page-and-filter-sweep-2026-10-01]] — the same sweep yesterday; the delta is this issue.
- [[route-map]] — the route inventory, itself stale on the invoice and cash-memo rows.