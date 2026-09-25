---
type: Task
status: Blocked
ticket: TB-0009
priority: P2
belongs_to:
  - "[[TrailBase Backend]]"
related_to:
  - "[[Frontend — TrailBase Server-Rendered App]]"
  - "[[TB-0008 Serve report results from the page host instead of whole views]]"
  - "[[Decision — Declarative pages: a folder is a page, the server is a generic host]]"
blocked_by:
  - "[[TB-0008 Serve report results from the page host instead of whole views]]"
created: 2026-09-25T00:00:00.000Z
updated: 2026-09-25T00:00:00.000Z
tags:
  - trailbase
  - frontend
  - pages
  - cleanup
---

# TB-0009 Retire the legacy report routes in favour of the page host

## Goal

Delete the per-report code from Node once the page host is at least as fast as the server-rendered route, so
`src/routes/reports.js` keeps no page definitions and no report has two implementations.

## Done when

- `/reports/*` and `/reports/ledgers/*` are removed; the reports hub, the ledger index and the nav point at
  `/p`.
- `REPORT_INDEX`, `LEDGER_INDEX` and `REPORT_PAGES` are gone from `src/routes/reports.js`; each report's
  filters, columns and totals live only in its `pages/<slug>/meta.json`.
- `views/reports/**` is reduced to whatever the pages still need (the generic body partial and the shared
  layout).
- Every report is reachable at `/p/...` with totals and rows identical to the old route's output on the live
  dataset.
- `npm run smoke` is updated for the new paths and still fully passes.
- No page-specific code remains anywhere in Node: the process keeps only page discovery, data serialisation,
  templates and auth.

## Context

All 14 reports already exist as pages ([[TB-0011 Add the declarative page host and migrate the reports to it]]),
but both implementations still ship, so the app has two sources of truth for filters, columns and totals — and
Node still carries the per-page definitions the architecture is meant to remove.

The blocker is performance, not correctness: the page host is currently slower than the route it would replace
([[Issue — Declarative pages ship whole views and are slower than server rendering]]).

## Related

- [[TB-0008 Serve report results from the page host instead of whole views]] — the blocker.
- [[Issue — Declarative pages ship whole views and are slower than server rendering]]
- [[Decision — Declarative pages: a folder is a page, the server is a generic host]]
