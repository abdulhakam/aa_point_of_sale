---
type: Issue
status: Open
belongs_to:
  - "[[TrailBase Backend]]"
related_to:
  - "[[Decision — Declarative pages: a folder is a page, the server is a generic host]]"
  - "[[Decision — Refresh the report snapshot incrementally from table fingerprints]]"
  - "[[TB-0008 Serve report results from the page host instead of whole views]]"
affects:
  - "[[Frontend — TrailBase Server-Rendered App]]"
created: 2026-09-25T00:00:00.000Z
updated: 2026-09-25T00:00:00.000Z
tags:
  - trailbase
  - frontend
  - performance
  - pages
---

# Issue — Declarative pages ship whole views and are slower than server rendering

## Summary

The declarative page host ([[Decision — Declarative pages: a folder is a page, the server is a generic host]])
is **slower than the server-rendered route for every report measured**, on the live 60k-row dataset. The
browser has to receive and parse the page's whole derived view set before it can show anything, whereas the
server-rendered route ships only the finished result.

## How it was measured

Live data (TrailBase, 60,245 rows), snapshot warm, both sides on the same machine.

- **Before** — `GET /reports/<report>` from Node, median of 5 requests after a warm-up.
- **After** — the page loaded in Chrome; `navMs` is milliseconds from navigation start to rows on screen
  (published by the runtime as `window.__page`); `compute` is the worker's report time; `decode` is the
  decoded JSON payload.
- Server-rendered HTML is **not** compressed; the page payload **is** gzipped.

## Evidence

| report | rows | before: Node | after: first load | after: repeat | after: compute | payload (decoded) |
|---|---|---|---|---|---|---|
| `reports/payments` | 26,526 | **1,529 ms** | 2,413 ms | 1,627 ms | 1,026 ms | 28.1 MB |
| `reports/salesreport` | 8,648 | **487 ms** | 2,296 ms | 1,653 ms | 874 ms | 28.1 MB |
| `reports/paymentsbycompany` | 11,760 | **1,580 ms** | 3,757 ms | 2,533 ms | 1,155 ms | 58.2 MB |
| `reports/itemsales` | 21,815 | **1,856 ms** | 2,869 ms | 1,827 ms | 778 ms | 29.1 MB |
| `reports/difference` | 209 | **16 ms** | 877 ms | 510 ms | 298 ms | 11.7 MB |
| `reports/dailysale` | 19 | **206 ms** | 1,109 ms | 934 ms | 296 ms | 15.4 MB |
| `reports/outstanding` | 602 | **41 ms** | 1,868 ms | 1,390 ms | 431 ms | 27.8 MB |
| `reports/productsale` | 205 | **7 ms** | 1,065 ms | 715 ms | 451 ms | 11.7 MB |
| `ledgers/area` | 909 | **23 ms** | 1,863 ms | 1,096 ms | 478 ms | 27.9 MB |
| `ledgers/general` | 10,404 | **1,321 ms** | 3,696 ms | 1,466 ms | 1,228 ms | 33.9 MB |

Slowdown (before ÷ after, first load): **1.5–2.4×** on the large reports, **5–46×** on the mid-sized ones,
**154×** on `productsale`. Median ≈ **5×**.

On the wire it is mixed: for `payments` the page moves **2.3 MB gzipped vs 6.4 MB of uncompressed HTML**
(fewer bytes), while for `productsale` it moves **872 KB vs 32 KB** (27× more).

## Why

- The payload is the **view set**, not the result. `productsale` shows 205 rows but ships 11.7 MB.
- The dominant new cost is **`JSON.parse` + structured-clone**, not the report: client `compute` is
  178–1,228 ms, which is not cheaper than Node's *entire* response (7–1,856 ms).
- Repeat loads still cost 510–2,533 ms: nothing derived is cached in the browser, so the report is re-run
  every visit.
- Server rendering wins because the views are already built and resident — exactly what
  [[Decision — Refresh the report snapshot incrementally from table fingerprints]] optimised for.

## Impact

- The shape is not yet a candidate to replace the server-rendered routes
  ([[TB-0009 Retire the legacy report routes in favour of the page host]] is blocked on fixing this).
- The architecture's actual wins are server-side, not latency: Node runs no page logic, a repeat visit is a
  `304`, and the server pays the view build once per snapshot version instead of once per request.

## Mitigation

Not yet chosen. In impact order:

1. **Ship the result, not the views.** Let Node run the page's named report against its warm snapshot and
   return `{rows, totals}`. Still fully generic — the manifest already names `compute.report`. Expected to
   beat the server-rendered path outright; the trade is that re-filtering needs a round trip.
   Tracked as [[TB-0008 Serve report results from the page host instead of whole views]].
2. **A columnar payload** (typed arrays + transferables, or `SharedArrayBuffer` with COOP/COEP) to cut
   transfer and parse by 5–10×.
3. **Compress the server-rendered HTML too** — it currently goes out uncompressed, which flatters the
   comparison for the page host on large reports.

## Notes

- All 14 reports were migrated to pages before this was measured, so the "after" column is the real
  implementation, not a prototype.
- The measurement also exposed and fixed four defects, recorded in
  [[Work Session — Report snapshot refresh and the declarative page host — 2026-09-25]].

## Related

- [[Decision — Declarative pages: a folder is a page, the server is a generic host]]
- [[TB-0008 Serve report results from the page host instead of whole views]]
- [[Decision — Refresh the report snapshot incrementally from table fingerprints]]
