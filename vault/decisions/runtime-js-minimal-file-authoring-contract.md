---
title: The runtime-js authoring contract — a route is a folder, not a JavaScript file
type: decision
status: active
created: 2026-10-01
updated: 2026-10-01
tags: [runtime-js, architecture, authoring, manifest, generic-code]
related_to: ["[[runtime-js-guest-platform]]", "[[one-manifest-is-the-page-definition]]", "[[compiled-artifacts-are-generic-capabilities]]", "[[report-logic-stays-runtime-file-based]]", "[[client-side-live-recalculation]]", "[[compiled-artifacts-are-generic-capabilities]]"]
---

# The runtime-js authoring contract — a route is a folder, not a JavaScript file

## The contract

**Page authoring** requires a directory and nothing else:

```
app/pages/<group>/<name>/
  meta.json     the page definition — inert data
  page.html     optional template override
```

**Route authoring** requires a directory with its workflow file and one or more route-code scripts.
A `.ts`/`.js` file in a route directory may define extra endpoints (`POST`, `PUT`, `DELETE`, `PATCH`),
used only when strictly needed.

The guest discovers, dispatches and renders — so adding a report or a page does not mean editing a
central registry, and a person editing an app does not have to read a router.

## What is deliberately NOT here

**`meta.json` stays inert data.** It is not replaced by a `route.mjs` in which a `META` constant is
mixed with handler functions. The reason is specific, not aesthetic:

- **A manifest can be listed without being executed.** The crawler reads 14+ files and knows the whole
  route table from JSON alone. If a page is a module, listing the site means *running* every page.
- **The guest has no real ESM.** `ahscripts/routes/_app/route.ts` carries a ~60-line regex shim that
  rewrites `import`/`export` into `new Function`. A `.mjs` route file is parsed by that shim, so
  growing the role of module files grows dependence on it.

Handler code is still available where it is actually needed — as a `route.mjs` loaded lazily beside a
manifest, only on first request, and only when present. That is additive: a page without one is
rendered from its manifest alone, with no JavaScript executed to serve it.

## The compiled side stays generic

Generic capabilities — SQL execution, rendering, id codecs, the spool/KV handoff — are **implemented
in Rust and exposed to the guest**, not written in JavaScript. JS/TS is the interpreted,
app-specific authoring surface.

The line, stated as a test: **a Rust component must not know the name of a report, a column, or a
business rule.** Today the spool/KV handoff already satisfies this — `render.spooled(name, ctx,
[{field, key}])` and `sqlite.spool(sql, cols, params)` are pure mechanism, and
`tb-ah-run-js/src/render.rs` holds no report names at all.

## The open implementation questions

Carried forward, not yet decided:

1. **`app.config.json`** — `{ "mode": "crawler" | "dispatcher", "dispatcher": "./route.ts" }`, with the
   crawler as the default and a custom dispatcher as the escape hatch for hosting a different
   frontend. This is the piece that makes the contract configurable rather than hard-coded.
2. **One SQL library** — `sql.query(...)` returning rows and `sql.spool(...)` returning a handle, so
   the two existing `sqlite` functions get one name. A **statement guard** must reject
   `DROP`/`ATTACH`/`ALTER`/`PRAGMA`: `sqlite.execute` is currently unrestricted.
3. **Render context as a value, not a string.** `app/lib/http.js:10,22` still call
   `JSON.stringify(shellContext(...))` before handing it to `render.*`, even though `api.rs:78` accepts
   the JS value directly via `js_to_json`. The rows are already out via the spool; the context is not,
   and the "never stringifies JSON in QuickJS" property is therefore only half-true today.
4. **Parallelism** — `Promise.all` works; genuine fan-out exists only through the job queue.

## Status

Partly implemented. The manifest is authoritative for all 14 reports
([[one-manifest-is-the-page-definition]]); the config file, the SQL library, the statement guard and
the context hand-off are not.

## Related

- [[runtime-js-guest-platform]] — the system these rules govern.
- [[compiled-artifacts-are-generic-capabilities]] — the compiled/app boundary.
- [[report-logic-stays-runtime-file-based]] — why report SQL stays a runtime `.sql` file rather than a
  SQLite view.
- [[client-side-live-recalculation]] — the same instinct on the client: as little JavaScript as possible.
