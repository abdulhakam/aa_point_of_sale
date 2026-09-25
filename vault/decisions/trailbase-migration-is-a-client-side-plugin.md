---
type: Decision
status: Accepted
belongs_to:
  - "[[TrailBase Backend]]"
related_to:
  - "[[Frontend — TrailBase Server-Rendered App]]"
  - "[[Import from v1 Plugin]]"
  - "[[TB-0003 Migrate PocketBase data into the TrailBase schema]]"
  - "[[TB-0007 Add the plugins hub and the Import from v1 migration plugin]]"
affects:
  - "[[Frontend — TrailBase Server-Rendered App]]"
created: 2026-09-25
updated: 2026-09-25
tags:
  - trailbase
  - architecture
  - migration
  - plugins
---

# Decision — Run the PocketBase migration client-side as a plugin

## Status

Accepted (2026-09-25). Implemented as the "Import from v1" plugin.

## Context

The PocketBase → TrailBase migration was first built as server-side code inside `frontend-ssr`: a MiniJinja
form at `/migrate`, a route that started a background job, a status endpoint the page polled, and two
library modules (a PocketBase client and the migration engine). It was correct, but it is a **one-time
administrative operation**, and keeping it in the app meant permanent routes, a background job, and source
that would have to be removed by hand once it was done.

The requirement then changed to: the migration must be removable at any time without touching the app. A
plugin that is one folder is a much better fit than an app route.

Running it in the browser requires only that both servers accept **cross-origin** requests.

## Decision

The migration is a **client-side plugin** under `frontend-ssr/plugins/import-from-v1/` — one static HTML
page that signs in to PocketBase and to TrailBase directly and copies the data itself. It sits behind a
`/plugins` hub whose every directory is one self-contained feature. The server-side migration was removed
(route, engine, PocketBase client, view, config key, nav link, dashboard shortcut).

## Consequences

- **Add/remove by folder.** The hub reads each plugin's `meta.md`; plugin pages are static files served by
  `express.static`. Deleting the folder deletes the feature; nothing else references it.
- **No trailing server code.** The app keeps no job runner, no status endpoint, no PocketBase client.
- **Credentials live in the browser** for the duration of the run — acceptable for a local admin tool, and
  nothing is persisted.
- **The page must be served (or opened) with the servers reachable**, and it needs both credential sets.
- **It cannot invalidate the app's report cache**, so dashboard/reports can lag by up to
  `CACHE_TTL_SECONDS` — see [[Issue — Report cache lag after a client-side import]]. This is the price of
  having no server component.
- Operationally heavier than the server version for very large runs, because the browser holds the id map
  and issues every write — bounded by batching 500 rows per request.

## Alternatives considered

- **Keep the server-side route** — rejected: permanent app surface for a one-time action, and it does not
  meet the "removable" requirement.
- **A `trail`/CLI importer in the repo** — rejected: needs a Node/CLI toolchain on the operator's machine
  and shares nothing with the existing browser-based tooling.
- **A direct SQLite ETL between the two database files** — rejected: bypasses both APIs, so it would not
  exercise the record APIs or respect the schema's constraints and enum vocabularies.

## Evidence

- Both servers allow the needed cross-origin requests: PocketBase answers `Access-Control-Allow-Origin: *`
  with `authorization`/`content-type` allowed; TrailBase echoes the origin with `allow-methods: *` and
  `allow-headers: *` (measured 2026-09-25).
- The plugin copied the live dataset end to end in Chrome: 60,245 / 60,245 rows, 0 failures —
  [[TB-0007 Add the plugins hub and the Import from v1 migration plugin]].

## Revisit when

- A migration is needed on a machine where the browser cannot reach both servers, or the volume makes the
  browser path impractical — then a CLI importer or a server job is justified again.
- Instant post-import reporting becomes a requirement, which would push work back into the server.

## Related

- [[Import from v1 Plugin]]
- [[Issue — Report cache lag after a client-side import]]
- [[TB-0003 Migrate PocketBase data into the TrailBase schema]]
- [[TB-0007 Add the plugins hub and the Import from v1 migration plugin]]
