---
type: WorkSession
status: Completed
created: 2026-09-26T00:00:00.000Z
updated: 2026-09-26T00:00:00.000Z
belongs_to:
  - "[[TrailBase Backend]]"
works_on:
  - "[[TB-0008 Serve report results from the page host instead of whole views]]"
related_to:
  - "[[Frontend — TrailBase Server-Rendered App]]"
  - "[[Import from v1 Plugin]]"
tags:
  - trailbase
  - frontend
  - e2e
  - verification
---

# Work Session — TrailBase E2E Test — 2026-09-26

## Objective

End-to-end test of the recent commits across all three servers: wipe TrailBase and re-import the live
PocketBase dataset through **Import from v1** in a real browser, then open every report page and confirm
it renders.

## Starting state

- TrailBase depot present; before wipe: **60,256** rows across 17 base tables (209 `items`). PocketBase
  live dataset (`backend/pb_data/data.db`, v0.22.55): **60,245** base rows, 207 `items`. The 11-row gap
  is the 2 known extra `elb` items plus the 9 vocabulary rows.
- Servers started for this session: PocketBase `127.0.0.1:8090`, TrailBase `127.0.0.1:4000` (v0.33.22),
  frontend-ssr `127.0.0.1:3100`.
- The `chrome-devtools` MCP is configured with `--autoConnect` but its tools were **not exposed** in
  this session's toolset, so the same running Chrome was driven directly over the DevTools Protocol on
  port 9222 (browser websocket from `DevToolsActivePort`, flattened sessions). Chrome 153 no longer
  serves the legacy `/json/*` HTTP API.
- Login verified via API and UI using the scaffold credentials.

## Plan

1. Log in to the frontend and open `/plugins/import-from-v1/`.
2. Run the import with **Clear existing TrailBase data first** enabled (wipe + re-import).
3. Verify the resulting counts against PocketBase.
4. Wait for the report snapshot to refresh, then open all 14 reports and confirm they render.

## Activity log

- 2026-09-26: started all three servers; verified health; captured before/expected counts; logged in.
- 2026-09-26: ran Import from v1 with wipe; the wipe deleted 60,245 rows and the import copied
  **60,245 / 60,245, 0 failures**; database then held 60,254 rows (base + vocabulary) and 207 items.
- 2026-09-26: snapshot reached build 12 / 60,254 rows and rebuilt the affected reports.
- 2026-09-26: opened `/dashboard`, the reports and ledgers hubs, all 14 legacy reports, `/plugins`, and
  all 14 declarative pages — all rendered with data, no console errors, no failed requests.
- 2026-09-26: ran a filter-matched parity sweep of the legacy routes against the page host — 14/14
  identical in rows and totals.
- 2026-09-26: exercised the filters themselves on all 14 reports — APPLY with changed select/date/checkbox
  values and RESET on the page host, replayed on the legacy route: 14/14 pass.
- 2026-09-26: benchmarked old vs new on the live dataset (server-side median of 5, and end-to-end in Chrome)
  and re-ran `npm run smoke` (59/59); closed TB-0008 and moved TB-0009 to Ready.

## Changed artifacts

- No product source changed. Workspace test scaffolding in `e2e-logs/` (CDP driver, counts and parity
  scripts, server logs, screenshots).

## Verification

- Import: 60,245/60,245 rows created, 0 failures, every per-collection read count equal to created.
- Database: 60,254 total rows, 207 items (clean state).
- Render: 30 routes opened in Chrome with no `.flash.error`, no `Runtime.exceptionThrown`, no
  `Log` error entries.
- Parity (live data, matched filters): 14/14 reports identical rows and totals between `/reports/*` and
  `/p/*`.
- No server-side errors in the TrailBase or frontend logs.
- Filters: 14/14 reports pass APPLY-with-changes and RESET; filtered results match the legacy route.
- Benchmarks (live data): server median 270 ms → 44 ms, transferred bytes 1.13 MB → 124 KB, end-to-end faster
  on 10/12 reports. `npm run smoke` 59/59 on the current working tree.

## Findings

- [[Issue — Legacy report routes ignore their declared date defaults]]: on a bare GET the legacy route
  renders empty `from`/`to`, so it computes all-time while the page host applies the manifest default.
  Pre-existing (`8dc815f`), not a regression from the page-host commits.
- TB-0008 is complete: the page host is at row/total parity on live data and benchmarks faster than the legacy
  route — see the resolved [[Issue — Declarative pages ship whole views and are slower than server rendering]].

## Blockers and open questions

- The frontend's report snapshot lagged the browser-only import by up to one refresh tick (as expected,
  [[Issue — Report cache lag after a client-side import]]); it had refreshed by the time reports were
  opened. Not a new issue.
- Live page-host timings for TB-0008 are still outstanding.

## Exact next action

Start [[TB-0009 Retire the legacy report routes in favour of the page host]]: remove `/reports/*` and the
per-report definitions, point the hub/nav at `/p`, and settle the default-filter behaviour
([[Issue — Legacy report routes ignore their declared date defaults]]) in the same pass.
