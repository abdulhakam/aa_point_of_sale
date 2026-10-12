---
title: File-router conventions replace the route.ts dispatcher, and the data DAG is dropped
type: decision
status: accepted
decided_on: 2026-09-30
created: 2026-09-30
tags: [trailbase, routing, manifest, architecture, refactoring]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[manifest-driven-routing-and-data-dag]]", "[[trailbase-declarative-page-host]]", "[[runtime-js-single-host]]", "[[jobs-in-process-durable-queue]]"]
---

# File-router conventions replace the route.ts dispatcher, and the data DAG is dropped

## Context

[[manifest-driven-routing-and-data-dag]] (2026-09-28) chose a JSON DAG validated against a JSON
Schema as the expression for a route's behaviour: a `steps[]` array of `query`/`script` nodes with
`needs[]`, plus `params`, `materialize` and `render`.

That decision was revisited on 2026-09-30 against the code as it now stands. Measuring
`trailbase/runtime/ahscripts/routes/_app/route.ts` (1785 lines) showed the DAG is aimed at the
wrong thing:

- The surface is **~78 method+path pairs across ~30 route families**, and most of them are one
  request, one query, one template. `/dashboard` as a DAG is 4 nodes and 5 edges against 20 lines
  of handler — the DAG is *more* boilerplate, which was the thing it was introduced to remove.
- Only about **4 routes genuinely orchestrate**: `/jobs/reconcile` (fan-out + materialise),
  `/invoice-doc/rebuild` (enqueue, never run inline), `/print` POST, `/reports/refresh`.
- A JSON DAG authored without a graph *viewer* is strictly worse to read than files. n8n's graph is
  valuable because it can be seen; a JSON graph read as text is pure indirection.
- The inventory was also re-measured: the manifest a route needs is a **median of ~6 lines**, worst
  case 17 (`/invoices/{id}/{action}`, 14 form fields). So the cost the DAG was avoiding does not exist.

## Decision

**Routes adopt TanStack-Start-style file-router conventions, with a small manifest per route
directory. The DAG is dropped. `route.ts` is deleted, not preserved as a dispatcher.**

```
trailbase/runtime/ahscripts/routes/<segment>/[param]/
  route.json     path pattern, methods, params, query, auth
  loader.js      GET handler
  action.js      POST/PATCH/DELETE handler
  page.html.jinja      minijinja template
```

- **Not Next.js App Router.** `layout.tsx` / `loading.tsx` / `error.tsx` / `not-found.tsx` exist to
  serve React Server Components and streaming. This runtime has no React, and minijinja
  `{% extends %}` / `{% include %}` is already the layout mechanism — it is `layout.tsx` and
  `page.tsx` collapsed, already used by 40 templates.
- **Not the typed router either.** The host strips TypeScript with swc (`tb-ah-run-js/src/runtime.rs`);
  nothing type-checks, so `createFileRoute('/posts/$postId')`'s inference has no consumer.
- **`route.json` is a filter, not a validator.** Types are `string | int | number | flag | date |
  enum`; `required` is allowed. Semantic validation stays in `lib/*.js`, which already do it. Adding
  `min`/`max`/`pattern` would create a second validation system that drifts from the first.
- **`extends` is allowed for at most two param groups** (`dateRange` for from/to, and `type`), and
  only because each is used 6–8 times. A group earning `extends` needs 4+ uses.
- **The shared router is a module, not a route.** Manifest reading, `{param}` extraction, query
  coercion and the auth gate live in `app/lib/router.js`, imported by each route file. There is
  therefore nothing left for a catch-all to catch, and `_app/route.ts` is deleted outright.

## Why not keep `_app` as a fallback

Considered and rejected. The earlier draft kept it as an "escape hatch for one-offs", but a directory
costs a 3-line `route.json` plus a handler, so every route is worth a directory and the escape hatch
would have no users. Once `{param}` matching exists, the host's fallback becomes a plain Rust 404
(`tb-ah-run-js/src/lib.rs`), which is also a better failure mode: an unmatched URL is genuinely
unhandled rather than silently landing in a catch-all.

## Consequences

**Accepted**

- Adding a route is `mkdir` + write `route.json` + write a handler. No dispatcher edit, no
  redeploy of a central file, and no shared-module cache invalidation.
- `/reports/:key`, `/p/:slug`, `/management/:entity` become real directories, which the current
  host cannot route at all — it joins the literal request path, so `/invoice/<id>/line` misses.
- Parameterised routes need one host change: `{param}` plus a `[...path]` catch-all for the four
  prefix routes (`/static/*`, `/compute/*`, `/plugins/*`, `/favicon.svg`).

**Given up / to watch**

- A malformed `route.json` becomes a startup-time concern rather than a runtime 404. It must fail
  loudly, never fall through to a default route.
- **`route.ts` is the only known-good behaviour oracle.** Every step is verified by diffing a
  fingerprint of all 45 probe routes before and after (`tools/route-snapshot.mjs` +
  `tools/route-snapshot-diff.mjs`). A step that changes what a screen renders is a regression to
  explain, not a rounding difference to accept.
- Reports are visibly sensitive to warm state: the same depot returns 6 extra HTTP 500s on a cold
  run (~20 s WASM deadline) that disappear once `[mview]` has persisted its views. **A snapshot
  taken cold is not comparable to one taken warm** — this nearly read as a regression.

## Evidence

- `trailbase/runtime/ahscripts/routes/_app/route.ts` — 1785 lines, 53 `if`-style route tests, 16
  `path ===` compares, 16 regex `Match` constructions, 13 inline `db.all()` calls.
- `trailbase/tb-ah-run-js/src/lib.rs:198-216` — literal-path folder lookup, then the `_app`
  fallback being removed.
- `trailbase/runtime/ahscripts/pages/<slug>/` — the same convention already serving 15 page folders
  ([[trailbase-declarative-page-host]]), which is why the route half is a small extension.
- `trailbase/tools/route-snapshot.mjs` — the 45-route fingerprint used as the acceptance gate.

## Related

- [[manifest-driven-routing-and-data-dag]] — **the decision this supersedes**; the DAG half is
  withdrawn and the file-router half is adopted.
- [[trailbase-declarative-page-host]] — the page convention this extends to all routes.
- [[jobs-in-process-durable-queue]] — why fan-out stays in JS rather than moving to a component.
