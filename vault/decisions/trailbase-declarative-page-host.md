---
type: Decision
status: Accepted
belongs_to:
  - "[[TrailBase Backend]]"
related_to:
  - "[[Frontend — TrailBase Server-Rendered App]]"
  - "[[Decision — Refresh the report snapshot incrementally from table fingerprints]]"
  - "[[TB-0009 Retire the legacy report routes in favour of the page host]]"
affects:
  - "[[Frontend — TrailBase Server-Rendered App]]"
created: 2026-09-25T00:00:00.000Z
updated: 2026-09-25T00:00:00.000Z
tags:
  - trailbase
  - frontend
  - architecture
  - pages
  - wasm
---

# Decision — Declarative pages: a folder is a page, the server is a generic host

## Status

Accepted (2026-09-25). The page host now runs each manifest's trusted named report on the local worker-thread
pool and returns its result rather than whole views. Live-dataset performance remeasurement remains tracked by
[[TB-0008 Serve report results from the page host instead of whole views]].

## Context

The Node frontend was full of per-page code: `src/routes/reports.js` held a page definition per report
(title, defaults, filter fields, columns, totals), `src/lib/reports/reports.js` held one function per report,
`src/lib/entities.js` held the management screens, and only `render.js` / `auth.js` / `trailbase.js` were
generic.

The owner's goal is that **Node should eventually be replaced** — by a Go or Rust service, or by TrailBase
WASI components. That requires the Node process to shrink to something generic: adding a page must not change
a single line of Node.

## Decision

**A page is a folder.** Everything page-specific is data or a template, never Node code:

```text
pages/<slug>/
  meta.json      # title, needs.views (+ any raw tables), compute.report, requires,
                 # filters, columns, totals — declarative, passed through verbatim
  page.html      # Jinja template; usually two lines extending the layout and
                 # including the shared partial
  (optional) a page-specific module the browser loads; Node never imports it
```

Node keeps exactly three generic routes plus a shared static mount:

| Route | Purpose |
|---|---|
| `GET /p` | list every folder under `pages/` that has a `meta.json` |
| `GET /p/<slug>` | render the declared template with the manifest embedded as JSON |
| `GET /p/<slug>/data` | the manifest's named report result plus select-source tables, gzipped, `ETag` = snapshot + filters |
| `GET /compute/*` | the environment-neutral compute modules, retained as a portable module surface |

**The compute layer is shared, not duplicated.** `compute/` (`views.js`, `reports.js`, `format.js`, `ids.js`)
touches no Node API. The local report service dispatches trusted named operations to its `worker_threads` pool;
the browser receives the completed result and only renders it.

## Consequences

- **Adding a page is adding a folder** — `meta.json` + a two-line template. Demonstrated by adding the Stock
  page mid-session with no Node change and no restart.
- **Node keeps only generic work**: discover folders, parse manifests, resolve snapshot inputs, dispatch a
  named compute operation, render a Jinja template and hold the session. These are explicit local module
  boundaries, not separate deployed services.
- **The browser owns presentation.** Filters render server-side in the template; options, rows and totals are
  filled by the runtime. CPU-bound report work stays in the local Node `worker_threads` pool.
- **The views-on-the-wire regression is removed structurally.** The endpoint now returns `{rows, totals}` and
  lightweight select sources; live performance must still be remeasured before declaring TB-0008 complete.
- **Data pages need JavaScript.** The shell and filters are still server-rendered, but rows are not.
- Two traps found and recorded: MiniJinja hands templates a *proxy*, so `| json` on a value produces `{}` —
  manifests are serialised in Node (`metaJson`); and a module worker's script is cached aggressively, so the
  worker URL carries a version query.

## Alternatives considered

- **Keep server rendering only** — rejected as the end state: it keeps every page's definition inside Node.
- **A client SPA framework** — rejected: the app is deliberately framework-free, and manifest-plus-template
  already gives the wanted decoupling.
- **Browser worker computation** — removed: serialising whole views and structured-cloning them to a browser
  worker caused the measured page-host regression; the existing server worker pool is cheaper and portable.
- **An IndexedDB cache of the base tables** — implemented, measured, then **removed**: writing ~60k row
  objects took ~36 s. The browser's own HTTP cache (revalidation via `ETag`) does the job.

## Evidence

- All 14 reports now exist as pages; `profit` and `stock` render **identical** totals and rows to their
  server-rendered counterparts on both a seeded throwaway depot and the live 60k-row dataset
  (profit `400.00` / stock `-600.00` on the seeded fixture).
- `npm run smoke` 59/59 after the result endpoint change, including report-result parity, select-source-only
  payload shape and filtered ETag revalidation.

## Revisit when

- Re-measure the result payload on the 60k-row live dataset. If it remains slower than the legacy rendered
  route, investigate the measured bottleneck before changing the local module boundaries.

## Related

- [[Issue — Declarative pages ship whole views and are slower than server rendering]]
- [[Decision — Refresh the report snapshot incrementally from table fingerprints]]
- [[Frontend — TrailBase Server-Rendered App]]
- [[TB-0009 Retire the legacy report routes in favour of the page host]]
