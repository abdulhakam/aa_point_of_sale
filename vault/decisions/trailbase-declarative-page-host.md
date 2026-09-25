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

Accepted (2026-09-25) as the target shape for the frontend. The current implementation is **slower than
server rendering** — see [[Issue — Declarative pages ship whole views and are slower than server rendering]]
— and the fix is tracked by [[TB-0008 Serve report results from the page host instead of whole views]].

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
| `GET /p/<slug>/data` | the views the manifest names (plus any raw tables), gzipped, `ETag` = snapshot build |
| `GET /compute/*` | the environment-neutral compute modules, served so the browser runs the same files |

**The compute layer is shared, not duplicated.** `compute/` (`views.js`, `reports.js`, `format.js`, `ids.js`)
touches no Node API and is imported directly by Node *and* fetched by the browser at `/compute/`. The browser
runtime is a flat worker pool (`public/js/runtime/`) that runs `runReport` over the views it was handed.

## Consequences

- **Adding a page is adding a folder** — `meta.json` + a two-line template. Demonstrated by adding the Stock
  page mid-session with no Node change and no restart.
- **Node keeps only generic work**: discover folders, parse manifests, resolve a page's views from the
  snapshot, serialise them, render a Jinja template, hold the session. That is the ~200-line "kernel" that
  ports to Go/Rust/WASI. This is the L1 step of a ladder whose later steps render templates client-side and
  let the browser read TrailBase directly.
- **The browser owns presentation.** Filters render server-side in the template; options, rows and totals are
  filled by the runtime. A flat pool is used deliberately: worker-inside-worker is a Safari compatibility trap
  (WebKit lacks nested dedicated workers) and buys nothing over dispatching from the main thread.
- **First-load latency regressed** for every report measured, because the whole view set crosses the wire to
  be computed in the browser. This is the accepted cost of the shape; the immediate fix is to let Node run the
  named report and ship only `{rows, totals}` — still generic, because the manifest names the report.
- **Data pages need JavaScript.** The shell and filters are still server-rendered, but rows are not.
- Two traps found and recorded: MiniJinja hands templates a *proxy*, so `| json` on a value produces `{}` —
  manifests are serialised in Node (`metaJson`); and a module worker's script is cached aggressively, so the
  worker URL carries a version query.

## Alternatives considered

- **Keep server rendering only** — rejected as the end state: it keeps every page's definition inside Node.
- **A client SPA framework** — rejected: the app is deliberately framework-free, and manifest-plus-template
  already gives the wanted decoupling.
- **Nested web workers** — rejected: no benefit over a flat pool, and a hard browser lock-in.
- **An IndexedDB cache of the base tables** — implemented, measured, then **removed**: writing ~60k row
  objects took ~36 s. The browser's own HTTP cache (revalidation via `ETag`) does the job.

## Evidence

- All 14 reports now exist as pages; `profit` and `stock` render **identical** totals and rows to their
  server-rendered counterparts on both a seeded throwaway depot and the live 60k-row dataset
  (profit `400.00` / stock `-600.00` on the seeded fixture).
- The network log shows workers importing `/compute/reports.js`, `views.js`, `format.js`, `ids.js` — Node's
  own files.
- `npm run smoke` 55/55 throughout, including the compute extraction.

## Revisit when

- The report-result payload ([[TB-0008 Serve report results from the page host instead of whole views]]) has
  been measured; if pages are still slower than server rendering on real data, the shape itself is in question.
- WASI p3 / a Go or Rust service makes the data layer a component — then the manifest may name a component
  instead of a JS report.

## Related

- [[Issue — Declarative pages ship whole views and are slower than server rendering]]
- [[Decision — Refresh the report snapshot incrementally from table fingerprints]]
- [[Frontend — TrailBase Server-Rendered App]]
- [[TB-0009 Retire the legacy report routes in favour of the page host]]
