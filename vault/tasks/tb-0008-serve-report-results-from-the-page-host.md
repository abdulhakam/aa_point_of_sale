---
type: Task
status: Ready
ticket: TB-0008
priority: P1
belongs_to:
  - "[[TrailBase Backend]]"
related_to:
  - "[[Frontend — TrailBase Server-Rendered App]]"
  - "[[Decision — Declarative pages: a folder is a page, the server is a generic host]]"
  - "[[Decision — Refresh the report snapshot incrementally from table fingerprints]]"
  - "[[TB-0009 Retire the legacy report routes in favour of the page host]]"
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

- `/p/<slug>/data` runs the page's declared report server-side and ships `{version, rows, totals, meta}`.
- Payload for every measured report is no larger than the equivalent server-rendered HTML, and the page's
  end-to-end time is **at or below** the "before" column in
  [[Issue — Declarative pages ship whole views and are slower than server rendering]] — re-measured the same way.
- A page that must re-filter without a round trip can still ask for its views explicitly (a declared flag),
  so the views-on-the-wire mode stays available where it is genuinely wanted.
- Field options for `select` filters still arrive (from the declared source tables) so the form works without
  a second request, or the trade-off is stated explicitly.
- `npm run smoke` still 55/55 and every page's totals still match its server-rendered counterpart.
- Adding a page still requires no change to Node: the manifest is the only difference between pages.

## Context

The page host ships the page's **views** to the browser, which is why the first load is slower everywhere —
the payload is 11.7–58.2 MB decoded for reports showing as few as 19 rows. The server already holds those
views, built incrementally and cached
([[Decision — Refresh the report snapshot incrementally from table fingerprints]]); running the report there
is a lookup plus the same `runReport` the browser calls, with no template rendering and no view derivation.

The reason this is still "generic" is the manifest: `compute.report` is a name, and Node resolves it in
`compute/reports.js` exactly as the browser worker does. No page-specific code moves back into Node.

## Verification to beat

From [[Issue — Declarative pages ship whole views and are slower than server rendering]] (live data, warm
snapshot): payments `1,529 ms` server-rendered vs `2,413 ms` as a page; productsale `7 ms` vs `1,065 ms`.

## Related

- [[Issue — Declarative pages ship whole views and are slower than server rendering]] — the defect this fixes.
- [[TB-0009 Retire the legacy report routes in favour of the page host]] — blocked on this.
- [[Decision — Declarative pages: a folder is a page, the server is a generic host]]
