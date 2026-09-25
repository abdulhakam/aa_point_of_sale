---
type: Task
status: Done
ticket: TB-0007
priority: P2
belongs_to:
  - "[[TrailBase Backend]]"
related_to:
  - "[[Frontend — TrailBase Server-Rendered App]]"
  - "[[Import from v1 Plugin]]"
  - "[[TB-0004 Build the server-rendered TrailBase frontend]]"
  - "[[TB-0003 Migrate PocketBase data into the TrailBase schema]]"
  - "[[Decision — Run the PocketBase migration client-side as a plugin]]"
created: 2026-09-25
updated: 2026-09-25
tags:
  - trailbase
  - frontend
  - plugins
  - migration
---

# TB-0007 Add the plugins hub and the Import from v1 migration plugin

## Goal

A `/plugins` area in `frontend-ssr` where every subdirectory is one self-contained feature, and a first
plugin in it — **Import from v1** — that copies a running PocketBase database into this TrailBase depot.

## Done when

- `GET /plugins` lists every directory under `plugins/`, reading its `meta.md` (title, description,
  author, licence, tags).
- Each plugin's page is served as a static file at `/plugins/<slug>/`, behind the same login as the app.
- A plugin is added, changed or removed by copying or deleting its folder — no change to `src/` or
  `views/`.
- The migration plugin reproduces the live data with equivalent meaning: row counts reconcile, enum text
  becomes integer codes, JSON company arrays become link rows, and spot-checked totals match the
  PocketBase views.
- The page shows a percentage progress bar, records migrated / total and a live speed readout, and is
  usable on a phone.

## Context

The first attempt at the migration (earlier in the same session) was a server route in `frontend-ssr`
(`src/routes/migrate.js` + `src/lib/migration.js` + `src/lib/pocketbase.js` + a MiniJinja view), started
from a form and polled by the page. It worked, but it put a one-time administrative tool inside the
app's runtime and its source, which made it awkward to drop later.

Both TrailBase and PocketBase answer cross-origin requests, so the whole thing can run in the browser.
It was rebuilt as a plugin and the server-side version was removed — see
[[Decision — Run the PocketBase migration client-side as a plugin]].

## Work log

1. Measured CORS on both servers: PocketBase replies `Access-Control-Allow-Origin: *` and allows
   `authorization` + `content-type`; TrailBase echoes the origin with `allow-methods: *` /
   `allow-headers: *`. A backend-free page is therefore possible.
2. Built the hub: `src/lib/plugins.js` (frontmatter parser + directory scan), `src/routes/plugins.js`
   (`GET /plugins`), `views/plugins/index.html`, and a `requireAuth`-gated `express.static` mount for the
   plugin pages.
3. Wrote the plugin: `plugins/import-from-v1/index.html` (single file — inline JS, the app stylesheet
   linked), plus `plugins/import-from-v1/meta.md` and `plugins/README.md`.
4. Made the progress UI responsive with a percentage bar, overall records done/total and a sliding-window
   speed readout (`rec/s` at ≥ 1, else `s/rec`), and coalesced DOM updates so 60k rows do not thrash the
   page.
5. Removed the server-side migration (route, libs, view, `config.pocketbaseUrl`, nav link, dashboard
   shortcut).
6. Fixed a latent defect the wipe path exposed: TrailBase answers `DELETE` with a `text/plain` body
   `deleted`, which `trailbase.js` fed to `JSON.parse` — see
   [[Issue — TrailBase returns a plain-text DELETE body]].
7. Ran it in a real Chrome against the live `backend/p_data` dataset and cross-checked the results (see
   Verification).

## Verification

- Real-data import driven by clicking through the app in Chrome (login → Plugins → Import from v1 → Start
  import): **60,245 / 60,245 records, 100 %, 0 failures**; per-collection created counts matched the
  source (sections 10, categories 15, areas 59, parties 942, order_bookers 4, items 207, expenses 88,
  invoices 8,927, invoices_return_reference 54, transactions 23,413, payments 26,526). `companies` was
  absent on the source and was skipped with a warning, not an error.
- 18 counter checks (record counts plus every enum distribution) against PocketBase: all match.
- Stock Report total `3,337,165.56` equals an independent sum of per-item rounded amounts from the
  PocketBase `items_report` view (207 rows, row-for-row).
- Profit Report reproduces its documented formula (independent recompute 3,439,793.28 vs the page's
  3,439,793.33 on 3.44M); the row set matches the source exactly (21,815 = sale+return transactions).
- `npm run smoke` still passes **55/55**.
- Mobile viewport (390 px) screenshot: the source/destination cards stack and inputs go full width.

## Related

- [[Import from v1 Plugin]] — the plugin this task delivered.
- [[Decision — Run the PocketBase migration client-side as a plugin]]
- [[Issue — Report cache lag after a client-side import]] — the one loose end.
- [[Issue — TrailBase returns a plain-text DELETE body]] — fixed while building it.
- [[TB-0003 Migrate PocketBase data into the TrailBase schema]] — the migration this fulfils.
- [[TB-0004 Build the server-rendered TrailBase frontend]] — the app the hub lives in.
