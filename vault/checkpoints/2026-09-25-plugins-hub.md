---
type: Checkpoint
status: Current
belongs_to:
  - "[[TrailBase Backend]]"
work_session:
  - "[[Work Session — Plugins Hub and Import Plugin — 2026-09-25]]"
works_on:
  - "[[TB-0007 Add the plugins hub and the Import from v1 migration plugin]]"
supersedes:
  - "[[Checkpoint — TrailBase First Run — 2026-09-25]]"
created: 2026-09-25
updated: 2026-09-25
tags:
  - trailbase
  - frontend
  - plugins
  - migration
  - checkpoint
---

# Checkpoint — Plugins Hub — 2026-09-25

## Objective

A `/plugins` area in `frontend-ssr` whose folders are removable features, with the PocketBase→TrailBase
migration delivered as its first plugin ("Import from v1") — implemented, verified on the live data, and
removed from the server runtime.

## Active tasks

- [[TB-0007 Add the plugins hub and the Import from v1 migration plugin]] — **Done** (this session).
- [[TB-0003 Migrate PocketBase data into the TrailBase schema]] — **Done** (fulfilled by the plugin).
- [[TB-0004 Build the server-rendered TrailBase frontend]] — Done (unchanged).
- [[TB-0005 Fix the first-run admin password and the backend bind]] — Done (unchanged).
- [[TB-0006 Give items a company and use it in reports]] — Backlog (held: needs the item→company link).
- [[TB-0002 Wire a frontend to the TrailBase server]] — Backlog (held: the Next.js client).

## Completed since previous checkpoint

- Built the `/plugins` hub: registry from `meta.md`, a listing page, and `requireAuth`-gated static
  serving of plugin pages.
- Rebuilt the migration as the client-side "Import from v1" plugin and deleted the server-side version.
- Gave the plugin a percentage bar, records done/total and a speed readout, and made it responsive.
- Fixed a latent `trailbase.js` defect that broke **all** hard deletes (non-JSON `DELETE` body).
- Verified the whole path in a real Chrome on the live dataset, including the app's reports.

## Current verified state

- `GET /plugins` lists every directory in `frontend-ssr/plugins/` with its `meta.md` metadata; plugin pages
  are served at `/plugins/<slug>/` behind the app login (`302` → `/login?next=…` when signed out); an
  unknown slug is `404`.
- [[Import from v1 Plugin]] copied the live `backend/p_data` dataset end to end in Chrome:
  **60,245 / 60,245 records, 0 failures**; per-collection counts matched PocketBase, `companies` (absent on
  the source) skipped with a warning.
- 18 counter checks against PocketBase (counts + every enum distribution) all match.
- Reports on the migrated data: Stock Report total `3,337,165.56` equals an independent sum from the
  `items_report` view row-for-row; Profit Report reproduces its documented formula (3,439,793.28 recompute
  vs 3,439,793.33 page) with a row set identical to the source's sale+return count (21,815).
- `npm run smoke` still passes **55/55**.
- The server-side migration is gone: no `/migrate` route, no `src/lib/migration.js` or
  `src/lib/pocketbase.js`, no `views/migrate/`, no `POCKETBASE_URL` config key.
- `trailbase.js` returns raw text for non-JSON 2xx bodies, so `DELETE` works again.

## Files and artifacts changed

- New: `frontend-ssr/src/lib/plugins.js`, `src/routes/plugins.js`, `views/plugins/index.html`,
  `plugins/README.md`, `plugins/import-from-v1/{index.html,meta.md}`.
- Changed: `frontend-ssr/src/server.js`, `src/config.js`, `views/partials/nav.html`, `public/css/app.css`,
  `src/lib/trailbase.js`, `README.md`.
- Removed: `frontend-ssr/src/routes/migrate.js`, `src/lib/migration.js`, `src/lib/pocketbase.js`,
  `views/migrate/`, `public/migrate.html`.
- Vault: [[TB-0007 Add the plugins hub and the Import from v1 migration plugin]], [[Import from v1 Plugin]],
  [[Decision — Run the PocketBase migration client-side as a plugin]],
  [[Issue — Report cache lag after a client-side import]],
  [[Issue — TrailBase returns a plain-text DELETE body]], this checkpoint and the WorkSession;
  updates to [[Frontend — TrailBase Server-Rendered App]],
  [[TB-0003 Migrate PocketBase data into the TrailBase schema]] and [[TrailBase Backend]].
- Incidental (not part of the change): running local binaries stamped `trailbase/traildepot/metadata.textproto`
  (`last_executed_version` → v0.33.22) and touched `backend/p_data/*`.

## Decisions and assumptions that affect next steps

- **The migration stays client-side and removable** —
  [[Decision — Run the PocketBase migration client-side as a plugin]]. Do not re-add a `/migrate` route.
- **A plugin is one folder** (`meta.md` + `index.html`); adding or deleting it must need no change to
  `src/` or `views/`. Keep it that way.
- **The report cache is a separate concern from the data:** the import is correct even when the screen
  lags; do not "fix" a lagging dashboard by re-importing.
- Bulk insert (arrays) and `DELETE`'s plain-text body are both TrailBase behaviours now relied upon; keep
  the client tolerant of non-JSON success bodies.

## Blockers and unresolved questions

- **Report cache lag after import** (up to 60 s) — [[Issue — Report cache lag after a client-side import]].
  Open; three mitigation options listed, none chosen.
- The live dataset has no `companies` collection, so link rows (`party_companies`,
  `order_booker_companies`) were empty in the real run; only the seeded wipe test covers them.
- The management hard-delete screens were not re-driven in the UI after the `DELETE` fix (covered by the
  plugin's wipe instead).

## Exact next action

None blocking. Choose one:

- Resolve [[Issue — Report cache lag after a client-side import]] (add a small invalidate endpoint to the
  plugin, or accept the lag), or
- Continue [[TB-0006 Give items a company and use it in reports]] once the item→company link is settled.

## Verification still required

- None for the plugin: the real-data run, the counter cross-checks and the report spot-checks are recorded
  and repeatable. Re-run `python scripts/kb_check.py vault` after these note changes.
- Optional: re-drive management delete of a section/item in the browser to confirm the `DELETE` fix on that
  path specifically.

## Resume procedure

1. Read [[TrailBase Backend]] (outcome, current state, task index).
2. Read this checkpoint.
3. Read [[Work Session — Plugins Hub and Import Plugin — 2026-09-25]] for the measurements.
4. Read [[Import from v1 Plugin]] and `frontend-ssr/plugins/README.md` before changing the hub or the plugin.
5. Read [[Decision — Run the PocketBase migration client-side as a plugin]] before adding any server-side
   migration code.
6. Continue from `Exact next action` unless reality has invalidated it.
