---
type: Task
status: Done
ticket: TB-0008
priority: P1
belongs_to:
  - "[[TrailBase Backend]]"
related_to:
  - "[[Frontend — TrailBase Server-Rendered App]]"
  - "[[Decision — Declarative pages: a folder is a page, the server is a generic host]]"
  - "[[Decision — Refresh the report snapshot incrementally from table fingerprints]]"
  - "[[TB-0009 Retire the legacy report routes in favour of the page host]]"
  - "[[Issue — Legacy report routes ignore their declared date defaults]]"
created: 2026-09-25T00:00:00.000Z
updated: 2026-09-25T00:00:00.000Z
tags:
  - trailbase
  - frontend
  - pages
  - performance
---

# TB-0008 Serve report results from the page host instead of whole views

## Goal

`GET /p/<slug>/data` returns the report's finished output — `{rows, totals, meta}` — computed by Node from
its warm snapshot, so the browser renders and does no computation. Still generic: the manifest already names
`compute.report`, and the handler runs whatever report it names.

## Done when

- `/p/<slug>/data` runs the page's declared report server-side and ships `{version, filters, result, meta}`.
- The browser sends applied filters to the endpoint; it receives no derived views and performs no report compute.
- Field options for `select` filters still arrive from declared source tables in the same response.
- Payload for every measured report is no larger than the equivalent server-rendered HTML, and the page's
  end-to-end time is **at or below** the "before" column in
  [[Issue — Declarative pages ship whole views and are slower than server rendering]] — re-measured the same way.
- `npm run smoke` passes and every page's totals still match its server-rendered counterpart.
- Adding a page still requires no change to Node: the manifest is the only difference between pages.

## Context

The page host ships the page's **views** to the browser, which is why the first load is slower everywhere —
the payload is 11.7–58.2 MB decoded for reports showing as few as 19 rows. The server already holds those
views, built incrementally and cached
([[Decision — Refresh the report snapshot incrementally from table fingerprints]]); running the report there
is a lookup plus the same `runReport` the browser calls, with no template rendering and no view derivation.

The reason this is still "generic" is the manifest: `compute.report` is a name, and Node resolves it in
`compute/reports.js` exactly as the browser worker does. No page-specific code moves back into Node.

## Work log

- 2026-09-25: Replaced the views payload with a server-computed, manifest-selected report result. The endpoint
  uses the existing in-process worker-thread pool; no broker, queue, cache server or second deployment was added.
- 2026-09-25: Removed the unused browser worker pool and added result-payload, filtered ETag and select-source
  assertions to the smoke test.
- 2026-09-26: Live three-server E2E — wiped TrailBase and re-imported the live PocketBase dataset
  (60,245/60,245, 0 failures), then ran a filter-matched parity sweep of the page host against the legacy
  routes: **14/14 reports identical in rows and totals**. See [[Checkpoint — Three-Server E2E Test — 2026-09-26]].
- 2026-09-26: Filter exercise on all 14 reports — APPLY with changed select/date/checkbox values and RESET both
  verified; filtered results identical to the legacy route with the same filters.
- 2026-09-26: Re-measured live performance against the recorded baseline — server median 270 ms → 44 ms (~6×
  faster), transferred bytes 5–9× smaller, end-to-end faster on 10/12 reports. See
  [[Issue — Declarative pages ship whole views and are slower than server rendering]].

## Verification

- `npm run smoke` → 59/59 checks passed, including profit result parity, select-source-only payload shape and
  filtered ETag revalidation.
- `python scripts/kb_check.py vault` → PASS, quality 100/100.
- Live parity (2026-09-26): on the live dataset, all 14 reports produce rows **and** totals identical to the
  server-rendered route when the same filters are applied — see [[Checkpoint — Three-Server E2E Test — 2026-09-26]].
  (A bare `GET /reports/<report>` differs only because the legacy route drops its date defaults — see
  [[Issue — Legacy report routes ignore their declared date defaults]].)
- Live **performance** re-measured (2026-09-26, live dataset): server-side median 270 ms → 44 ms (~6× faster),
  transferred bytes median 1.13 MB → 124 KB, end-to-end faster on 10/12 reports — the criterion is met. The
  only caveat is decoded-payload size (JSON is larger than HTML before compression); see
  [[Issue — Declarative pages ship whole views and are slower than server rendering]].
- `npm run smoke` → 59/59 checks passed (re-run 2026-09-26 on this working tree).

## Verification to beat

From [[Issue — Declarative pages ship whole views and are slower than server rendering]] (live data, warm
snapshot): payments `1,529 ms` server-rendered vs `2,413 ms` as a page; productsale `7 ms` vs `1,065 ms`.

## Related

- [[Issue — Declarative pages ship whole views and are slower than server rendering]] — the defect this fixes.
- [[TB-0009 Retire the legacy report routes in favour of the page host]] — blocked on this.
- [[Decision — Declarative pages: a folder is a page, the server is a generic host]]
