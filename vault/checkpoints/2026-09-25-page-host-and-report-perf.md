---
type: Checkpoint
status: Superseded
belongs_to:
  - "[[TrailBase Backend]]"
work_session:
  - "[[Work Session — Report snapshot refresh and the declarative page host — 2026-09-25]]"
works_on:
  - "[[TB-0010 Refresh report views incrementally with a background job and an indicator]]"
  - "[[TB-0011 Add the declarative page host and migrate the reports to it]]"
supersedes:
  - "[[Checkpoint — Plugins Hub — 2026-09-25]]"
created: 2026-09-25T00:00:00.000Z
updated: 2026-09-25T00:00:00.000Z
tags:
  - trailbase
  - frontend
  - reporting
  - pages
  - performance
  - checkpoint
---

# Checkpoint — Page Host and Report Performance — 2026-09-25

## Objective

Make report generation cheap on the server, move the page surface out of Node so the process can eventually be
replaced, and measure whether that move helps — the answer being **no, not yet**.

## Active tasks

- [[TB-0008 Serve report results from the page host instead of whole views]] — **Ready** (P1; the next action).
- [[TB-0009 Retire the legacy report routes in favour of the page host]] — **Blocked** on TB-0008.
- [[TB-0010 Refresh report views incrementally with a background job and an indicator]] — **Done**.
- [[TB-0011 Add the declarative page host and migrate the reports to it]] — **Done**.
- [[TB-0006 Give items a company and use it in reports]] — Backlog (unchanged).
- [[TB-0002 Wire a frontend to the TrailBase server]] — Backlog (unchanged).

## Completed since previous checkpoint

- The report snapshot refreshes incrementally from per-table fingerprints instead of a 60 s TTL re-read; a
  quiet tick now does no fetch, no rebuild and no re-render.
- The compute layer moved to `compute/` and is shared verbatim with the browser.
- A declarative page host exists: a page is a folder; Node has three generic routes and no page knowledge.
- All 14 reports exist as pages; a **new page needs no Node change** (demonstrated mid-session).
- Live data re-verified as already migrated; the report performance of both implementations measured.

## Current verified state

- `npm run smoke` → **55/55**, after both the compute extraction and the incremental refresh.
- Incremental refresh harness **18/18**; fingerprint probe **7/7** (in-place update with unchanged row count
  detected).
- Page-host parity on a seeded depot: profit `400.00` (1 row, 13 columns) and stock `-600.00` — identical to
  the server-rendered routes; filters applied and reset; revalidation observed as `304`.
- **Live-data performance (60,245 rows, warm snapshot), server-rendered vs page:**

  | report | rows | server | page (cold) | page (repeat) |
  |---|---|---|---|---|
  | `reports/payments` | 26,526 | **1,529 ms** | 2,413 ms | 1,627 ms |
  | `reports/salesreport` | 8,648 | **487 ms** | 2,296 ms | 1,653 ms |
  | `reports/paymentsbycompany` | 11,760 | **1,580 ms** | 3,757 ms | 2,533 ms |
  | `reports/itemsales` | 21,815 | **1,856 ms** | 2,869 ms | 1,827 ms |
  | `reports/difference` | 209 | **16 ms** | 877 ms | 510 ms |
  | `reports/dailysale` | 19 | **206 ms** | 1,109 ms | 934 ms |
  | `reports/outstanding` | 602 | **41 ms** | 1,868 ms | 1,390 ms |
  | `reports/productsale` | 205 | **7 ms** | 1,065 ms | 715 ms |
  | `ledgers/area` | 909 | **23 ms** | 1,863 ms | 1,096 ms |
  | `ledgers/general` | 10,404 | **1,321 ms** | 3,696 ms | 1,466 ms |

- Server-rendered command: `GET /reports/<report>` (median of 5, warm snapshot). Page command: `window.__page`
  from a Chrome load. Detail in
  [[Issue — Declarative pages ship whole views and are slower than server rendering]].

## Files and artifacts changed

- New: `frontend-ssr/compute/`, `frontend-ssr/src/lib/pages.js`, `frontend-ssr/src/routes/pages.js`,
  `frontend-ssr/public/js/runtime/`, `frontend-ssr/pages/**`, `frontend-ssr/views/pages/index.html`,
  `frontend-ssr/views/partials/page_body.html`.
- Changed: `frontend-ssr/src/lib/reports/{index,data,worker}.js`, `render.js`, `server.js`, `config.js`,
  `routes/{reports,management}.js`, `views/partials/{nav,topbar}.html`, `public/{css/app.css,js/app.js}`,
  `scripts/smoke.js`, `README.md`, `plugins/import-from-v1/meta.md`.
- Removed: `src/lib/format.js`, `src/lib/reports/{views,reports}.js` (moved into `compute/`).
- Vault: this checkpoint, the WorkSession, TB-0008/0009/0010/0011, the two new decisions, the new issue, and
  updates to [[TrailBase Backend]] and [[Frontend — TrailBase Server-Rendered App]].

## Decisions and assumptions that affect next steps

- **The incremental refresh stays** —
  [[Decision — Refresh the report snapshot incrementally from table fingerprints]]. The derived views belong
  in the server; the fingerprint probe is the change signal because TrailBase filters cannot express
  `updated > x`.
- **The declarative page host is the target shape** —
  [[Decision — Declarative pages: a folder is a page, the server is a generic host]] — but it is accepted with
  the performance defect open. Do not retire `/reports/*` until TB-0008 lands.
- **`compute/` must stay Node-free.** It is served to the browser; one `Buffer` there breaks the page host.
- **A request must never wait on pre-rendering.** The snapshot is published before the warm re-render runs.
- **`REFRESH_INTERVAL_SECONDS` replaced `CACHE_TTL_SECONDS`.**

## Blockers and unresolved questions

- **Page performance** (open): the fix is TB-0008 — ship `{rows, totals}` instead of the views. If that still
  loses, the shape needs revisiting.
- Two `items` named `elb` exist in TrailBase but not in PocketBase (209 vs 207); left in place, not deleted.
- `companies` and both link tables are empty by construction, so the link-row path is still only exercised by
  seeded tests.
- The server-rendered HTML is uncompressed, which makes its wire cost look worse than the page host's.

## Exact next action

Implement [[TB-0008 Serve report results from the page host instead of whole views]]: `/p/<slug>/data` runs the
page's named report against the warm snapshot and returns `{rows, totals, meta}`; the browser only renders.
Re-measure the same 10 reports the same way and compare with the table above.

## Verification still required

- Re-measure all 10 reports after TB-0008 and record the result on the issue.
- `npm run smoke` must stay 55/55 through that change.
- `python scripts/kb_check.py vault` after these note changes.

## Resume procedure

1. Read [[TrailBase Backend]] (outcome, current state, task index, graph).
2. Read this checkpoint.
3. Read [[Work Session — Report snapshot refresh and the declarative page host — 2026-09-25]] for the detail
   and the four defects fixed.
4. Read [[Decision — Declarative pages: a folder is a page, the server is a generic host]] and
   [[Issue — Declarative pages ship whole views and are slower than server rendering]] before touching the
   page host or the report service.
5. Read [[Decision — Refresh the report snapshot incrementally from table fingerprints]] before changing how
   the snapshot is built or invalidated.
6. Continue from `Exact next action` unless reality has invalidated it.
