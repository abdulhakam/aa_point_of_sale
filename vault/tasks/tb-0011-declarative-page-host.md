---
type: Task
status: Done
ticket: TB-0011
priority: P1
belongs_to:
  - "[[TrailBase Backend]]"
related_to:
  - "[[Frontend — TrailBase Server-Rendered App]]"
  - "[[TB-0010 Refresh report views incrementally with a background job and an indicator]]"
  - "[[TB-0008 Serve report results from the page host instead of whole views]]"
created: 2026-09-25T00:00:00.000Z
updated: 2026-09-25T00:00:00.000Z
tags:
  - trailbase
  - frontend
  - pages
  - architecture
---

# TB-0011 Add the declarative page host and migrate the reports to it

## Goal

Make adding a page a matter of adding a folder — no change to Node — and move the reports onto that host.

## Done when

- A page is `pages/<slug>/meta.json` + a Jinja template (+ optionally a browser module).
- Node exposes only generic routes: `/p` (list), `/p/<slug>` (render), `/p/<slug>/data` (data), `/compute/*`
  (shared compute modules).
- The compute layer is shared verbatim between Node and the browser.
- Adding a page requires no Node change and no restart.
- Every existing report renders the same totals and rows as its server-rendered counterpart.

## Context

Node held a page definition per report plus a report function per report; the owner's goal is to replace Node
with a Go/Rust or WASI service, which needs the page surface to be declarative. See
[[Decision — Declarative pages: a folder is a page, the server is a generic host]].

## Verification

- **14 pages** (12 reports, 2 ledgers) plus the profit and stock pages; `/p` lists them with their derived
  table/view counts.
- The **Stock page was added mid-session with zero Node change** — `meta.json` + a two-line template, served on
  the next request without a restart.
- On a seeded throwaway depot: profit `400.00` (1 row, 13 columns) and stock `-600.00` — **identical** to the
  server-rendered routes; filters flow through (`invoice=999999` → 0 rows / `0.00`; RESET restores).
- Workers were observed loading `/compute/reports.js`, `views.js`, `format.js`, `ids.js` — Node's own files.
- `npm run smoke` **55/55** after the `compute/` extraction.
- Real-data measurement of all 10 remaining reports found the page host **slower than server rendering**
  (median ≈ 5×) — recorded as [[Issue — Declarative pages ship whole views and are slower than server rendering]],
  which is why [[TB-0008 Serve report results from the page host instead of whole views]] exists.

## Related

- [[Decision — Declarative pages: a folder is a page, the server is a generic host]]
- [[Issue — Declarative pages ship whole views and are slower than server rendering]]
- [[TB-0009 Retire the legacy report routes in favour of the page host]]
