---
title: "runtime-js special pages: _not-found, _error, _global-error"
type: decision
status: accepted
decided_on: 2026-10-12
created: 2026-10-12
updated: 2026-10-12
tags: [trailbase, runtime-js, routing, error-handling, decision]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[runtime-js-guest-platform]]", "[[trailbase]]", "[[runtime-js-single-root-ahscripts]]", "[[tb-0044-special-pages]]", "[[tb-0030-retire-the-route-ts-dispatcher]]"]
---

# runtime-js special pages: `_not-found`, `_error`, `_global-error`

## The choice

The host recognises three **optional** reserved handlers, each a `_`-prefixed folder under
`ahscripts/routes/`, dispatched by the host like any route:

| Folder | When the host runs it | Contract |
|---|---|---|
| `routes/_not-found/route.*` | a path with no route folder (and no configured dispatcher) | returns the 404 page; host stamps `x-aa-not-found: no_route_folder` |
| `routes/_error/route.*` | a route handler threw | returns the 500 page; `req.error` carries the message |
| `routes/_global-error/route.*` | the `_error` handler itself failed | a standalone document (no app bundle, no shared shell) |

All three are handlers, not templates the host renders. That is deliberate: rendering inside the app
shell needs the app's own JS (`context.app()` → `routeKit.renderRoute`), which a bare Rust
`minijinja` render does not have. `_global-error` is the exception by design — it uses only the
host's `render` bridge, because it exists precisely for the case where the app bundle cannot load.

The `_` prefix reserves the folder: `resolve_route_file` skips any segment starting with `_`, so the
folders are unreachable as ordinary URLs (the Next.js `_folder` private convention).

## Why this shape

- **Optional by construction.** Every hook is a `None`-returning lookup. With no `_not-found` the
  host answers its old JSON `{"error":"no_route_folder"}`, with no `_error` a handler exception falls
  through to the host's minimal page. Nothing changes for an app that ignores the convention.
- **Generic.** The host names three reserved folders and a request-object shape; it names no route,
  no page and no business noun, so it stays a generic file router
  ([[runtime-js-guest-platform]], invariant 5 of the compiled-artifacts rule).
- **Reuses the existing machinery.** A special handler is `run_route(...)` exactly like a route, and
  the JSON→response conversion was extracted to `response_from_json` so the normal and special paths
  answer identically.
- **Fixes a latent defect.** A handler exception used to be answered `404 Route execution failed: …`
  — a crash read as "not found". With `_error` present it is a `500` the app lays out, which is the
  correct class.

## What was rejected

- **A separate `errors/` directory.** Cleaner URL-space separation, but it needs a fourth renderer
  root for the templates and breaks the "a route unit is a folder" symmetry for no real gain.
- **Host-rendered `minijinja` templates (no handler).** Cannot produce the app shell (no user, nav,
  business identity, refdata version), so the pages would not look like the app.
- **Per-segment error/not-found boundaries** (Next.js nests these). Much larger: the router would
  have to track the nearest ancestor boundary and re-render within it. Root-level pages cover the
  ask; nesting is a possible later step.
- **`notFound()` / `redirect()` control-flow helpers.** Not needed here — a handler already chooses
  its own status and body.

## Consequences

- `tools/route-coverage.mjs` learns the `x-aa-not-found` header so its "UNROUTED" signal survives the
  app answering HTML instead of the JSON body; `route-snapshot.mjs`'s negative probes now record an
  HTML 404 (title/links change) and the operator re-baselines.
- Documented in [[runtime-js-guest-platform]]; built by [[tb-0044-special-pages]].
- **Known nuance:** a request whose method the route folder does not export (e.g. `POST` to a
  GET-only folder) throws in `run_route`, so it now reaches `_error` as a 500 rather than the old
  404. Correct would be a `405`; distinguishing it needs `run_route` to report a missing export
  separately from a genuine throw. Recorded, not fixed.
