---
type: Checkpoint
status: Superseded
belongs_to:
  - "[[TrailBase Backend]]"
work_session:
  - "[[Work Session — TrailBase E2E Test — 2026-09-26]]"
works_on:
  - "[[TB-0008 Serve report results from the page host instead of whole views]]"
supersedes:
  - "[[Checkpoint — Portable Page-Host Compute — 2026-09-25]]"
superseded_by:
  - "[[Checkpoint — TB-0008 Benchmarked and Closed — 2026-09-26]]"
created: 2026-09-26T00:00:00.000Z
updated: 2026-09-26T00:00:00.000Z
---

# Checkpoint — Three-Server E2E Test — 2026-09-26

## Objective

End-to-end test of the recent commits across all three servers: wipe TrailBase and re-import the live
PocketBase dataset through **Import from v1** in a real browser, then open every report and confirm it
renders, and check row/total parity between the legacy routes and the page host.

## Active tasks

- [[TB-0008 Serve report results from the page host instead of whole views]] — In Progress. Correctness
  and parity now verified on live data; the **live performance remeasurement is still outstanding**.
- [[TB-0009 Retire the legacy report routes in favour of the page host]] — Blocked on TB-0008.

## Completed since previous checkpoint

- Started all three servers and verified health: PocketBase `127.0.0.1:8090` (v0.22.55),
  TrailBase `127.0.0.1:4000` (v0.33.22), frontend-ssr `127.0.0.1:3100`.
- Logged in to the frontend UI and ran **Import from v1** with *Clear existing TrailBase data first*:
  wiped the depot and copied the live PocketBase dataset — **60,245 / 60,245 rows, 0 failures**, every
  per-collection read count equal to the created count.
- Verified the result at the database: TrailBase total **60,254** rows = 60,245 base + 9 vocabulary
  rows, with **207** items (the 2 known extra `elb` items are gone after the wipe).
- Opened every route in Chrome: `/dashboard`, the reports and ledgers hubs, all **14 legacy reports**,
  `/plugins`, and all **14 declarative pages**. All rendered with data, no console errors and no failed
  requests.
- Ran a **parity test** on live data: for each report, read the page's applied filters, replayed them on
  the legacy route, and compared rows and totals — **14/14 identical**.
- Recorded a pre-existing divergence between the two paths when no query is supplied:
  [[Issue — Legacy report routes ignore their declared date defaults]].

## Current verified state

- Snapshot on the frontend reached **build 12, 60,254 rows** and rebuilt the affected reports after the
  import; the top-bar indicator reported `idle`.
- Legacy routes, live, bare GET: payments 26,526 · salesreport 8,648 · paymentsbycompany 32,562 ·
  itemsales 21,815 · profit 21,815 · stockreport 207 · difference 207 · dailysale 8,606 · outstanding
  602 · productsale 205 · ledgers/area 909 · ledgers/general 26,614; party/booker prompt for a selection.
- Page host, live: payments 26,526 · itemsales 21,815 · salesreport 8,648 · paymentsbycompany 11,760 ·
  stock 207 · profit 21,815 · difference 207 · outstanding 602 · productsale 205 · dailysale 19 ·
  ledgers/area 909 · ledgers/general 10,404; party/booker prompt for a selection.
- Parity with matched filters (rows **and** totals identical on both paths): payments, salesreport,
  paymentsbycompany, itemsales, profit, stockreport, difference, dailysale, outstanding, productsale,
  ledgers/area, ledgers/general, ledgers/party, ledgers/booker — 14/14.
- Both services' logs were clean; no server-side errors were logged.

## Files and artifacts changed

- No product source changed; this session verified the existing (partly uncommitted) working tree.
- New workspace test scaffolding, outside the vault: `e2e-logs/` (CDP driver, counts/parity scripts,
  server logs, screenshots).
- Vault: this checkpoint, [[Work Session — TrailBase E2E Test — 2026-09-26]],
  [[Issue — Legacy report routes ignore their declared date defaults]], new links in
  [[TB-0008 Serve report results from the page host instead of whole views]].

## Decisions and assumptions that affect next steps

- The page host is **numerically correct and at parity** with the server-rendered route on live data;
  the remaining TB-0008 condition is the live **performance** comparison, not correctness.
- The date-default divergence is pre-existing (`8dc815f`) and belongs to the TB-0009 cleanup, not to the
  page-host change — see [[Issue — Legacy report routes ignore their declared date defaults]].
- The `chrome-devtools` MCP tools were not exposed in the agent toolset this session; the same running
  Chrome was driven over the DevTools Protocol on port 9222 instead. Chrome 153 no longer serves the
  legacy `/json/*` HTTP API, so the browser websocket from `DevToolsActivePort` was used.

## Blockers and unresolved questions

- The live 60k-row page-host **timings** have still not been re-measured, so
  [[TB-0008 Serve report results from the page host instead of whole views]] cannot be marked Done and
  [[TB-0009 Retire the legacy report routes in favour of the page host]] stays blocked.
- `npm run smoke` was not run this session; the last recorded result is 59/59.

## Exact next action

Start TrailBase and the frontend against the live dataset, measure the ten page-host reports listed in
[[Issue — Declarative pages ship whole views and are slower than server rendering]] using
`window.__page`, compare each result with the recorded baseline, then update that issue and
[[TB-0008 Serve report results from the page host instead of whole views]] from the evidence.

## Verification still required

- Re-measure payload sizes and end-to-end timings for all ten live page-host reports.
- Re-run `npm run smoke` and `python scripts/kb_check.py vault`.
- Optionally re-run the E2E parity sweep after the TB-0008 status change.

## Resume procedure

1. Read [[TrailBase Backend]] and this checkpoint.
2. Read [[TB-0008 Serve report results from the page host instead of whole views]] and both performance
   / defaults issues.
3. Inspect `frontend-ssr/src/routes/pages.js` and `frontend-ssr/public/js/runtime/page.js`.
4. Perform the exact live-performance measurement above before changing task status.
