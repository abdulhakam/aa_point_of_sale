---
title: Guest vs legacy report performance (measured 2026-09-27)
type: note
status: active
created: 2026-09-27
tags: [performance, reports, benchmarks, guest, legacy, pocketbase, trailbase]
related_to: ["[[guest-vs-node-performance]]", "[[reports-and-ledgers]]", "[[runtime-js-guest-platform]]", "[[frontend]]", "[[backend]]", "[[guest-depot-created-is-import-time]]"]
---

# Guest vs legacy report performance (measured 2026-09-27)

A first pass at comparing the guest reports ([[runtime-js-guest-platform]]) with the legacy Next.js
reports ([[frontend]] / [[backend]]), on the same production-sized data (8,927 invoices / 23,413
transactions / 26,526 payments / 207 items). Both stacks were run locally: PocketBase v0.22.55
(`:8090`, `backend/pb_data`), Next.js production `next build` + `next start` (`:3000`), and the
guest served by `trail v0.33.22` (`:4000`) against a copy of `trailbase/traildepot`.

## How the two are measured differently (important)

The two frontends do the work in different places, so the numbers are **not directly symmetric**:

- **Guest** is server-rendered: the report is computed and the HTML table rendered on the server, so
  the HTTP response time is the whole cost the user waits for. Measured by timing `GET /reports/<x>`
  (1 warm + 3, median).
- **Legacy** is client-rendered: the page ships, then the browser pages through PocketBase
  (`?page=N&perPage=500`) and renders every row in React (non-virtualised). Measured end-to-end in
  a browser (navigation → rows visible), which includes fetch **and** client render.

## Guest — all fourteen report/ledger pages (warm)

| report | rows | warm ms | HTML KB | notes |
|---|---|---|---|---|
| payments | 26,526 | **2,743** | 6,368 | |
| itemsales | 21,815 | **4,080** | 7,701 | |
| salesreport | 8,648 | **863** | 2,085 | |
| paymentsbycompany | 32,561 | **3,978** | 8,734 | |
| stockreport | 207 | **48** | 47 | |
| profit | 21,815 | **4,278** | 8,307 | |
| difference | 207 | **42** | 35 | |
| outstanding | 609 | **72** | 118 | |
| productsale | 205 | **56** | 35 | |
| dailysale | 8,606 | **616** | 1,348 | |
| ledgers/general | 26,613 | **2,996** | 6,010 | |
| ledgers/area | 6 | **44** | 11 | |
| ledgers/booker | 11,141 | **924** | 1,654 | |
| ledgers/party | 32 | **63** | 73 | |

Two things to note:

- **A ~60 s poller spike.** The big reports also show samples of **11–18 s** (e.g. payments 2.4/2.7/3.3 s
  but 3.3 s typical; itemsales/profit/paymentsbycompany/general show one sample of 11–18 s). This is
  the fingerprint refresh rebuilding a materialised view on the request path — the cost the
  [[guest-report-performance-options]] note is about.
- Compute is cheap for small/aggregated reports (≤ 72 ms); the cost is serialising and rendering the
  large row sets.

## Legacy — measured, and why the large ones did not finish

| report | rows | end-to-end ms | PocketBase calls | notes |
|---|---|---|---|---|
| stockreport | 209 | **1,384** | 2 (20 + 800 ms) | all items, no date filter |
| difference | 209 | **992** | 2 (26 + 589 ms) | all items, no date filter |
| profit (full range) | 21,815 | **not completed (> 30 s)** | 44+ pages | exceeded the measurement budget |
| ...other heavy reports | — | not completed | — | same mechanism |

The legacy cost is dominated by **sequential PocketBase paging at 500 rows per request, ~1.0–1.6 s
per page** — observed directly (e.g. `invoice_view` pages at 948–1,515 ms,
`transactions_report` at 1,644–1,668 ms). A 21,815-row profit report therefore needs ≈44 sequential
pages, i.e. **tens of seconds of fetching alone**, before React renders 21,815 table rows
client-side. The report did not reach "rows visible" inside the 30 s measurement window.

## What can be said

- On equal row counts, the guest is far faster end-to-end: **stockreport 48 ms vs 1,384 ms (~29×)**,
  **difference 42 ms vs 992 ms (~24×)**.
- The heavy legacy reports are worse than an order of magnitude slower; their floor is the 500-row
  paging (~1.0–1.6 s/page), which the guest does not pay because it reads the depot SQLite directly
  and computes views in-process.
- The guest's own weak spot is the on-request view rebuild (~11–18 s spikes), not the per-request
  render, matching [[guest-vs-node-performance]].

## Caveats

- **Not row-equivalent for date-filtered reports.** The depot's `created` is the import timestamp,
  not the business date, so the guest and legacy cannot be filtered to the same rows
  ([[guest-depot-created-is-import-time]]). The guest figures above use a wide 2020–2026 range that
  returns its full dataset; the legacy full-range run could not be completed. Fixing `created` is a
  prerequisite for an exact per-report comparison.
- Single machine, single run; treat as orders of magnitude. Guest numbers were taken with the
  harness's normal warm-up; legacy includes React render in a headless browser.
- The legacy browser run repeatedly logged React hydration errors (#418/#423) on the report pages;
  they recover by client render, so they did not stop the pages, but they are noted.

## Follow-ups

- Fix `created` in the import, rebuild the depot, then re-run this comparison for the heavy reports
  with matching row counts ([[guest-depot-created-is-import-time]]).
- Optionally capture the full legacy render with a headed DevTools performance trace
  (`performance_start_trace`) rather than waiting on the page, to get its true end-to-end time.

## Related

- [[reports-parity-and-e2e-2026-09-29]] — re-measured on a fresh UI-driven import, range
  1-Jan-2024 → today: guest cold/warm for all 14 reports, v1 stockreport 1,253 ms and difference
  1,103 ms (same 209 rows), and **exact** per-column data parity. This note's v1 heavy-report
  numbers are still the 2026-09-27 ones; they could not be re-captured.
- [[guest-vs-node-performance]] — the earlier guest-vs-Node baseline.
- [[guest-report-performance-options]] — the levers for the guest's on-request rebuild.
- [[reports-and-ledgers]] — what the reports compute.
- [[guest-depot-created-is-import-time]] — the data mismatch that limits this comparison.
