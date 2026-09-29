---
title: Manifest-driven routing and a JSON data DAG replace the route.ts dispatcher
type: decision
status: accepted
decided_on: 2026-09-28
created: 2026-09-28
tags: [trailbase, routing, dag, manifest, architecture]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[trailbase-declarative-page-host]]", "[[runtime-js-single-host]]", "[[component-split-and-sql-materialised-tables]]", "[[guest-fingerprint-refresh]]"]
---

# Manifest-driven routing and a JSON data DAG replace the route.ts dispatcher

## Context

`trailbase/runtime/ahscripts/routes/_app/route.ts` is 823 lines and currently owns the entire URL
space, including dynamic segments. Every request re-evaluates it through QuickJS, which is the
measured 20–30 ms per-request overhead (Node was 3–7 ms). Route behaviour is spread across one large
file, so adding a page means editing a dispatcher rather than adding a file.

The plan previously deferred this: [[runtime-js-single-host]] noted that "extracting a `render`
crate later means moving `render.rs` behind a HTTP or WIT boundary". That framing applies equally to
routing.

## Decision

**Routes and pages are discovered by crawling the runtime file tree at startup and registered from
per-route manifests.** The single dispatcher is retired.

- The host crawls the runtime root and indexes `page.html` / `index.html`, `routes.ts` /
  `routes.js`, and per-route `*.yaml` manifests with their `*.sql` and `*.ts` files.
- A route's behaviour is a **JSON/YAML DAG validated against a JSON Schema**, not a hand-written
  handler. Schema covers: `url` patterns; `params` (name, type, default, coercion, validation) for
  query string *and* form body, including date ranges, number ranges, sort and filter strings; a
  `steps[]` array where each step is either a `query` (a `.sql` file plus named args) or a `script`
  (a `.ts` module exporting one pure function), each with `needs[]` for data dependencies;
  `materialize` (the materialised table the result lands in); and `render` (template name plus
  context projection).
- **QuickJS coordinates; it does not calculate or convert.** It resolves the manifest, coerces
  params, orders the DAG, dispatches steps, and hands the result to the renderer. Row arithmetic
  moves out of QuickJS entirely.

## Why not the alternatives

| Alternative | Why not |
|---|---|
| Keep growing `route.ts` | The dispatcher re-evaluation *is* the per-request overhead; the file is the scaling bottleneck. |
| CWL as the workflow format | Models containerised network invocations with its own type system, scatter/gather and success callbacks. It would mean writing a CWL runtime to express a local SQL DAG, and duplicating the work SQLite's planner already does. |
| JSON-LD as the workflow format | It is a data-interchange layer that answers "what does this row mean across datasets", not "what should I execute". Pure cost here. |
| Airflow/Dagster-style Python DAG at runtime | Reintroduces a second runtime and a scheduler into a system whose whole point is one process and one port. The DAG is metadata, not code, so a schema is the right weight. |
| A plain declarative YAML/JSON DAG (chosen) | — |

The chosen shape is the Steampipe/Dagster-manifest lineage: a small node vocabulary, a linear
`needs[]` dependency list, and a strict node-name-to-file-path convention.

## Consequences

**Accepted**

- Adding a page is adding a folder; no dispatcher edit, and no redeploy of a central file.
- Ordering and parallelism become decidable: `needs[]` gives a topological order at build time.
- The manifest becomes the single place a report's inputs, filters, and template are declared, which
  is what makes [[trailbase-declarative-page-host]]'s "a page cannot under-declare its inputs"
  property expressible for every route, not just pages.

**Given up / to watch**

- The route table becomes a startup-time artefact. A malformed manifest or a filename collision is
  now a startup failure, not a runtime 404; that failure mode must be a loud startup error, never
  last-registration-wins.
- `route.ts` is the only known-good behaviour oracle, so the crawl → register output must be diffed
  against it before it replaces it (see [[guest-parity-differential-not-reproducible]] — the parity
  differential was deleted with `frontend-ssr` and must be rebuilt first).
- The existing per-folder convention is singular `route.ts`; the new convention is plural
  `routes.ts`. A rename is required and must not be a silent partial change.

## Evidence

- `trailbase/runtime/ahscripts/routes/_app/route.ts:12` and `:808-823` — the IIFE that installs
  `globalThis.GET/POST/PATCH/DELETE` because the dispatcher is re-evaluated per request.
- `trailbase/runtime/ahscripts/routes/_app/route.ts:305-792` — `handle` → `dispatch`, the whole URL
  space.
- `notes/guest-vs-node-performance.md` — the 20–30 ms vs 3–7 ms per-request measurement.
- [[component-split-and-sql-materialised-tables]] — the packaging decision this is designed to be
  compatible with.

## Related

- [[trailbase-declarative-page-host]] — the 14 page folders this generalises to all routes.
- [[runtime-js-single-host]] — the decision this retires, with the amendment recorded there.
