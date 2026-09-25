---
type: WorkSession
status: Completed
started: 2026-09-25T00:00:00.000Z
updated: 2026-09-25T00:00:00.000Z
belongs_to:
  - "[[TrailBase Backend]]"
works_on:
  - "[[TB-0010 Refresh report views incrementally with a background job and an indicator]]"
  - "[[TB-0011 Add the declarative page host and migrate the reports to it]]"
related_to:
  - "[[Frontend — TrailBase Server-Rendered App]]"
  - "[[TB-0007 Add the plugins hub and the Import from v1 migration plugin]]"
  - "[[TB-0008 Serve report results from the page host instead of whole views]]"
created: 2026-09-25T00:00:00.000Z
tags:
  - trailbase
  - frontend
  - reporting
  - pages
  - performance
  - session
---

# Work Session — Report snapshot refresh and the declarative page host — 2026-09-25

## Objective

Make report generation cheap on the server, then move the page surface out of Node so the process can
eventually be replaced — and measure whether the move actually helps.

## Starting state

- [[TB-0007 Add the plugins hub and the Import from v1 migration plugin]] was Done; `npm run smoke` 55/55.
- The report service re-read all 17 tables (~60,245 rows) and rebuilt all 14 views on a 60 s TTL, on the main
  thread; `buildViews()` blocked the event loop.
- Node held a page definition and a report function per report; only `render.js` / `auth.js` / `trailbase.js`
  were generic.
- The earlier client-side migration attempt had left the server unable to be told the data changed
  ([[Issue — Report cache lag after a client-side import]]).

## Plan

1. Replace the TTL re-read with an incremental, per-table-fingerprint refresh plus an indicator.
2. Extract the compute layer so Node and the browser can run the same files.
3. Build a declarative page host (folder = page) and migrate the reports.
4. Migrate/verify the live data, then measure server-rendered vs page performance on it.

## Activity log

1. Mapped the view graph into `VIEW_DEPS` / `VIEW_ORDER` and added `viewsAffectedBy`, `viewClosure`,
   `tablesForViews` and `buildSelectedViews` so a changed table maps exactly to the views it dirties.
2. Replaced the TTL cache with a background job: probe → fetch changed tables → rebuild affected views →
   re-render affected reports. A management write passes the tables it touched to `invalidate()`.
3. Moved the compute layer to `compute/` (`views.js`, `reports.js`, `format.js`, `ids.js`) — no Node APIs, so
   the same files can be served to the browser at `/compute/`; added a `version` (build counter) to the
   snapshot for ETags.
4. Added the 4-colour job indicator (top bar, polled from `GET /reports/status`).
5. Built the generic page host: `src/lib/pages.js` (folder scan + manifest), `src/routes/pages.js`
   (`/p`, `/p/<slug>`, `/p/<slug>/data`, with gzip and ETag), a multi-root MiniJinja loader so a page template
   can extend the shared layout, and `views/partials/page_body.html` as the generic body.
6. Built the browser runtime: a flat worker pool, a worker running `runReport` over the views handed to it, a
   driver that fills options/rows/totals and publishes timings on `window.__page`, and an `iframe`-free
   measurement path.
7. Migrated all 14 reports to pages and verified parity on a seeded throwaway depot (profit `400.00`, stock
   `-600.00`, matching columns and row counts), then confirmed a new page needs no Node change.
8. Re-checked the live data: every PocketBase row is already present in TrailBase from the earlier import.
9. Measured 10 reports on the live dataset, server-rendered vs page. The page host is slower everywhere —
   recorded as [[Issue — Declarative pages ship whole views and are slower than server rendering]].
10. Fixed four defects the work surfaced (below) and re-ran the smoke suite.

## Changed artifacts

- `frontend-ssr/compute/{views,reports,format,ids}.js` — new shared compute layer (moved from `src/lib`).
- `frontend-ssr/src/lib/reports/{index,data,worker}.js` — incremental snapshot service; `views.js`/`reports.js`
  removed from `src/lib`.
- `frontend-ssr/src/lib/pages.js`, `src/routes/pages.js` — the generic page host.
- `frontend-ssr/public/js/runtime/{pool,worker,page}.js` — the browser runtime.
- `frontend-ssr/pages/**/{meta.json,page.html}` — 14 pages.
- `frontend-ssr/views/partials/page_body.html`, `views/pages/index.html`, `views/partials/nav.html`,
  `views/partials/topbar.html`, `public/css/app.css`, `public/js/app.js` — indicator and page chrome.
- `frontend-ssr/src/lib/render.js` — multi-root loader; `src/server.js`, `src/config.js` — wiring
  (`REFRESH_INTERVAL_SECONDS` replaces `CACHE_TTL_SECONDS`).
- `frontend-ssr/src/routes/management.js` — invalidation now names the tables it wrote.
- Vault: this session, [[Checkpoint — Page Host and Report Performance — 2026-09-25]],
  [[TB-0010 Refresh report views incrementally with a background job and an indicator]],
  [[TB-0011 Add the declarative page host and migrate the reports to it]],
  [[TB-0008 Serve report results from the page host instead of whole views]],
  [[TB-0009 Retire the legacy report routes in favour of the page host]],
  [[Decision — Refresh the report snapshot incrementally from table fingerprints]],
  [[Decision — Declarative pages: a folder is a page, the server is a generic host]],
  [[Issue — Declarative pages ship whole views and are slower than server rendering]].

## Verification performed

- `npm run smoke` **55/55** after the compute extraction and after the incremental refresh — the refactor is
  behaviour-preserving including the write-invalidation path.
- Incremental refresh harness **18/18**; fingerprint probe **7/7** (including an in-place update with an
  unchanged row count).
- Page-host parity on a seeded throwaway depot: profit `400.00` / 1 row / 13 columns and stock `-600.00`,
  identical to the server-rendered routes; filter apply and reset exercised; revalidation observed as `304`.
- Live-data measurement of 10 reports both ways (table in
  [[Issue — Declarative pages ship whole views and are slower than server rendering]]).

## Defects found and fixed

1. **ETag ignored payload shape.** After the data endpoint started sending views instead of tables, browsers
   replayed the stale body because the ETag was the build number alone. Now `v<revision>-<build>`.
2. **Pre-rendering blocked the first request.** The snapshot is now published (and `dirty` cleared) *before*
   the warm re-render, so a request arriving mid-render reads fresh views instead of waiting.
3. **IndexedDB row cache.** Caching ~60k row objects took ~36 s per page; removed in favour of the browser's
   own HTTP cache with `ETag` revalidation.
4. **Module workers are cached aggressively.** A changed worker script was not picked up; the worker URL now
   carries a version query.

Also recorded: MiniJinja hands templates a proxy, so `| json` on a value yields `{}` — manifests are
serialised in Node (`metaJson`) and embedded with `| safe`.

## Blockers and open questions

- **The page host is slower than server rendering** for every report measured (median ≈ 5×; up to 154× on the
  smallest). This is the open question for the architecture: the proposed fix is
  [[TB-0008 Serve report results from the page host instead of whole views]], not yet implemented.
- TrailBase holds **two items named `elb`** (created 2026-09-25 11:16) that do not exist in PocketBase. Left in
  place rather than deleted; they make `items` 209 vs the source's 207.
- `companies` and both link tables are empty by construction (PocketBase has no `companies`; its
  `parties.company` points at `categories`), so the link-row path is still not exercised by live data.
- The server-rendered HTML is served **uncompressed**, which flatters the page host's wire comparison.

## Exact next action

Implement [[TB-0008 Serve report results from the page host instead of whole views]] — have `/p/<slug>/data` run
the page's named report against the warm snapshot and return `{rows, totals}`, then re-measure the same 10
reports the same way and compare against the "before" column in
[[Issue — Declarative pages ship whole views and are slower than server rendering]].

## Related

- [[Checkpoint — Page Host and Report Performance — 2026-09-25]]
- [[Decision — Refresh the report snapshot incrementally from table fingerprints]]
- [[Decision — Declarative pages: a folder is a page, the server is a generic host]]
- [[Issue — Declarative pages ship whole views and are slower than server rendering]]
