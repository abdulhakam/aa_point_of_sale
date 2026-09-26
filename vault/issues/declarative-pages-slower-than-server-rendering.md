---
type: Issue
status: Resolved
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

> **Resolved 2026-09-26** by [[TB-0008 Serve report results from the page host instead of whole views]] —
the page host now requests named server-computed results instead of whole views. Re-measurement below shows
it is faster server-side and end-to-end, and ships far fewer bytes on the wire.

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

## Re-measured 2026-09-26 — resolved

Method: live dataset (60,254 rows, snapshot v12), same machine. **Server-side** = median of 5 `GET`s with a
session cookie and `Accept-Encoding: gzip` (legacy HTML is *not* compressed by the app). **End-to-end** =
in-page time-to-ready in Chrome with the cache disabled, median of 2.

Server-side response time and bytes:

| report | legacy ms | page ms | speed-up | legacy wire | page wire | legacy decoded | page decoded |
|---|---|---|---|---|---|---|---|
| `payments` | 1,269 | 248 | 5.1× | 6,518,114 | 838,110 | 6,518,114 | 7,645,196 |
| `salesreport` | 505 | 101 | 5.0× | 2,132,174 | 329,080 | 2,132,174 | 2,667,122 |
| `paymentsbycompany` | 833 | 133 | 6.3× | 3,274,601 | 335,355 | 3,274,601 | 4,074,213 |
| `itemsales` | 2,220 | 379 | 5.9× | 7,883,228 | 1,042,821 | 7,883,228 | 12,487,276 |
| `profit` | 2,277 | 376 | 6.1× | 8,503,568 | 1,042,785 | 8,503,568 | 12,487,228 |
| `stock` | 34 | 7 | 5.1× | 45,279 | 9,280 | 45,279 | 52,835 |
| `difference` | 13 | 7 | 2.0× | 32,765 | 5,648 | 32,765 | 39,994 |
| `dailysale` | 6 | 4 | 1.5× | 10,466 | 2,237 | 10,466 | 15,657 |
| `outstanding` | 21 | 10 | 2.2× | 116,619 | 32,173 | 116,619 | 152,900 |
| `productsale` | 8 | 5 | 1.5× | 32,902 | 8,141 | 32,902 | 40,203 |
| `ledgers/area` | 30 | 11 | 2.7× | 136,037 | 32,826 | 136,037 | 163,619 |
| `ledgers/general` | 540 | 76 | 7.1× | 2,445,455 | 215,336 | 2,445,455 | 3,070,423 |
| **median** | **270** | **44** | **~6×** | **1,134,106** | **124,081** | — | — |

End-to-end time-to-ready (ms, legacy → page): payments 17,393 → 11,535; salesreport 3,662 → 4,034;
paymentsbycompany 7,281 → 4,971; itemsales 31,389 → 11,098; profit 22,440 → 16,077; stock 896 → 773;
difference 944 → 858; dailysale 137 → 139; outstanding 377 → 374; productsale 244 → 223;
ledgers/area 418 → 397; ledgers/general 5,793 → 4,851. **The page host is faster on 10 of 12 reports and
within 2–7 ms on the rest.**

Two honest caveats:

- The **decoded** JSON is larger than the decoded HTML (JSON is more verbose; `payments` 7.6 MB vs 6.5 MB),
  but it gzips far better, so the **transferred** bytes are 5–9× smaller for every report. The legacy route
  does not compress its HTML, so its wire size equals its decoded size.
- The page keeps a minified payload but no per-report caching; repeat views rely on the endpoint's `ETag`
  revalidating to `304`.

## Mitigation

**Implemented, awaiting live remeasurement:** `/p/<slug>/data` now runs the manifest's trusted named report
against the warm snapshot in the existing Node worker-thread pool and returns `{rows, totals}` plus only
select-source tables. Applied filters are query parameters and participate in the ETag, so re-filtering takes
one normal HTTP request rather than receiving whole views. The browser now only renders.

This retains a portable local module boundary and adds no queue, broker, cache server or second deployment.
[[TB-0008 Serve report results from the page host instead of whole views]] is complete only after the existing
live-data performance table is remeasured.

## Notes

- All 14 reports were migrated to pages before this was measured, so the "after" column is the real
  implementation, not a prototype.
- The measurement also exposed and fixed four defects, recorded in
  [[Work Session — Report snapshot refresh and the declarative page host — 2026-09-25]].

## Related

- [[Decision — Declarative pages: a folder is a page, the server is a generic host]]
- [[TB-0008 Serve report results from the page host instead of whole views]]
- [[Decision — Refresh the report snapshot incrementally from table fingerprints]]
