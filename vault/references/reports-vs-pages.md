---
type: Reference
status: Active
created: 2026-09-26T00:00:00.000Z
updated: 2026-09-26T00:00:00.000Z
belongs_to:
  - "[[TrailBase Backend]]"
related_to:
  - "[[Frontend — TrailBase Server-Rendered App]]"
  - "[[TB-0008 Serve report results from the page host instead of whole views]]"
  - "[[TB-0009 Retire the legacy report routes in favour of the page host]]"
  - "[[Decision — Declarative pages: a folder is a page, the server is a generic host]]"
  - "[[Decision — Refresh the report snapshot incrementally from table fingerprints]]"
  - "[[Issue — Legacy report routes ignore their declared date defaults]]"
tags:
  - trailbase
  - frontend
  - reports
  - pages
  - performance
  - reference
---

# Reports vs Pages — Implementation and Performance

Two implementations of the same 14 reports currently ship in parallel:
`/reports/<report>` (server-rendered) and `/p/<slug>` (declarative page host). This note is the
side-by-side reference: how each works and how they compare on the live dataset. Diagrams live in
`docs/diagrams/` (see [[TrailBase Frontend System Diagrams]]).

## What each path is

- **`/reports/<report>`** — the original screen. `src/routes/reports.js` holds a `REPORT_PAGES` entry
  per report (fields, columns, totals) and renders a MiniJinja template with the finished table. Every
  request re-derives nothing new but re-renders the whole table to HTML.
- **`/p/<slug>`** — the declarative host added by
  [[Decision — Declarative pages: a folder is a page, the server is a generic host]]. A page is a folder
  under `pages/` (`meta.json` + `page.html`); Node knows nothing page-specific. `compute.report` names a
  trusted entry in `compute/reports.js`.

## UI flow

Both paths are entered from a tile (reports hub, ledgers hub or the pages index) and both show a filter
form and a table with totals.

| step | `/reports/<report>` | `/p/<slug>` |
|---|---|---|
| open | `GET /reports/<report>` → full HTML page | `GET /p/<slug>` → shell + manifest JSON |
| filters | GET reloads the page with query params | form submit → `GET /p/<slug>/data?<filters>` |
| result | rows already in the HTML | rows inserted into `tbody[data-page-rows]` |
| reset | link to the bare path | `[data-page-reset]` → rebuild with defaults |
| totals | server-rendered `<table class="totals-table">` | `[data-total-key]` values from the payload |

## Processing and rendering

**Shared:** a background job keeps an in-memory snapshot of the 17 base tables and the derived views,
refreshed incrementally from per-table fingerprints (`row count + newest updated`):
probe → fetch only changed tables → rebuild only the views they feed → re-render only the reports that
read one. Phases are reported on `/reports/status` and shown as the top-bar indicator.
See [[Decision — Refresh the report snapshot incrementally from table fingerprints]].

**`/reports`:** `parseFilters` → `reports.getViews` (warm snapshot) → `reports.run` (aggregation on a
`worker_threads` pool) → MiniJinja renders the **whole table** to HTML → sent **uncompressed**.

**`/pages`:** `src/lib/pages.js` discovers folders; `/p/<slug>/data` resolves the manifest's
`compute.report` name → `reports.run` against the same warm snapshot → returns
`{version, filters, result, meta}` plus only the select-source tables, **gzipped**, with an `ETag`
(snapshot build + filters) so an unchanged filter revalidates `304`. The browser runtime
(`public/js/runtime/page.js`) only fills selects and rows — `window.__page.computeMs` is `0`.

The key asymmetry: `/reports` pays the template render per request; `/pages` pays only the report
aggregation (already on the snapshot) and lets the browser render.

## Performance difference — measured 2026-09-26

Live dataset (60,254 rows, snapshot v12), same machine. **Server** = median of 5 `GET`s with a session
cookie and `Accept-Encoding: gzip` (the legacy HTML is *not* compressed by the app). **Wire** = bytes
actually transferred. **e2e** = in-page time-to-ready in Chrome with the cache disabled, median of 2.

| report | server `/reports` | server `/pages` | server speed-up | wire `/reports` | wire `/pages` | wire ratio | e2e `/reports` | e2e `/pages` |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| payments | 1,269 ms | 248 ms | 5.1× | 6.52 MB | 838 KB | 8.0× | 17.4 s | **11.5 s** (−34%) |
| salesreport | 505 ms | 101 ms | 5.0× | 2.13 MB | 329 KB | 6.5× | 3.66 s | 4.03 s (+10%) |
| paymentsbycompany | 833 ms | 133 ms | 6.3× | 3.27 MB | 335 KB | 9.8× | 7.3 s | **5.0 s** (−32%) |
| itemsales | 2,220 ms | 379 ms | 5.9× | 7.88 MB | 1.04 MB | 7.6× | 31.4 s | **11.1 s** (−65%) |
| profit | 2,277 ms | 376 ms | 6.1× | 8.50 MB | 1.04 MB | 8.2× | 22.4 s | **16.1 s** (−28%) |
| stock | 34 ms | 7 ms | 5.1× | 45 KB | 9 KB | 5.0× | 896 ms | **773 ms** |
| difference | 13 ms | 7 ms | 2.0× | 33 KB | 6 KB | 5.5× | 944 ms | **858 ms** |
| dailysale | 6 ms | 4 ms | 1.5× | 10 KB | 2 KB | 5.0× | 137 ms | 139 ms |
| outstanding | 21 ms | 10 ms | 2.2× | 117 KB | 32 KB | 3.7× | 377 ms | 374 ms |
| productsale | 8 ms | 5 ms | 1.5× | 33 KB | 8 KB | 4.1× | 244 ms | **223 ms** |
| ledgers/area | 30 ms | 11 ms | 2.7× | 136 KB | 33 KB | 4.1× | 418 ms | **397 ms** |
| ledgers/general | 540 ms | 76 ms | 7.1× | 2.45 MB | 215 KB | 11.4× | 5.8 s | **4.9 s** (−16%) |
| **median** | **270 ms** | **44 ms** | **≈6×** | **1.13 MB** | **124 KB** | **≈9×** | — | — |

**Reading it:** the page host is ~6× cheaper server-side and ~9× smaller on the wire, and faster
end-to-end on 10 of 12 reports (the two exceptions are within noise: `salesreport` +0.37 s, `dailysale`
+2 ms).

**Caveat:** *decoded* JSON is larger than *decoded* HTML (JSON is verbose — `payments` 7.6 MB vs 6.5 MB),
but it gzips far better and the legacy HTML is not compressed at all, so the transferred bytes are
5–11× smaller for every report.

Correctness is identical: all 14 reports match between the two paths on rows and totals — unfiltered,
filtered, and after RESET. See
[[Issue — Declarative pages ship whole views and are slower than server rendering]] (Resolved) for the
original defect, its measurement method and the full evidence.

The one behavioural difference is the default filter window: a bare `GET /reports/<report>` drops its
declared date defaults and shows all-time, while the page applies the manifest default —
[[Issue — Legacy report routes ignore their declared date defaults]].

## Manual refresh

The pipeline runs on the `REFRESH_INTERVAL_SECONDS` timer, on a management write (`invalidate`), lazily
when the snapshot is not ready, and **on demand**: the top-bar state indicator is a button that POSTs
`/reports/refresh` (probe → re-read what changed → rebuild views → re-render reports, then reload the
page). Add `?full=1` to re-read every table. The endpoint answers JSON when asked and otherwise redirects
back, so it works without JavaScript. See
[[Issue — No manual trigger for the report snapshot refresh]] (Resolved).

## Related

- [[Frontend — TrailBase Server-Rendered App]] — the subsystem these paths live in.
- [[Backend — TrailBase Server]] — the API both paths read.
- [[TB-0008 Serve report results from the page host instead of whole views]] — made `/pages` faster.
- [[TB-0009 Retire the legacy report routes in favour of the page host]] — the pending consolidation.
- [[TrailBase Frontend System Diagrams]] — the visual companion to this note.
