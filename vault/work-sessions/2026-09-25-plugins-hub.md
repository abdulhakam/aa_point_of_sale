---
type: WorkSession
status: Completed
started: 2026-09-25
updated: 2026-09-25
belongs_to:
  - "[[TrailBase Backend]]"
works_on:
  - "[[TB-0007 Add the plugins hub and the Import from v1 migration plugin]]"
related_to:
  - "[[Frontend — TrailBase Server-Rendered App]]"
  - "[[Import from v1 Plugin]]"
created: 2026-09-25
tags:
  - trailbase
  - frontend
  - plugins
  - migration
  - session
---

# Work Session — Plugins Hub and Import Plugin — 2026-09-25

## Objective

Give `frontend-ssr` a `/plugins` area where each folder is one removable feature, and put the
PocketBase→TrailBase migration there as the first plugin ("Import from v1").

## Starting state

- `frontend-ssr` was a working server-rendered app
  ([[TB-0004 Build the server-rendered TrailBase frontend]], 55/55 smoke) with dashboard, reports and
  management.
- A first, **server-side** migration existed in the working tree (added earlier the same day): a
  `/migrate` route, a background job, a MiniJinja view, and `src/lib/{migration,pocketbase}.js`.
- The live PocketBase data sat in `backend/p_data/data.db` (207 items, 942 parties, 8,927 invoices,
  23,413 transactions, 26,526 payments).

## Plan

1. Confirm the migration can run without a server (CORS on both backends).
2. Build the `/plugins` hub (registry + route + view + gated static serving).
3. Turn the migration into the "Import from v1" plugin and delete the server-side version.
4. Make its progress UI responsive with percentage/records/speed.
5. Verify end to end in a real browser on the live data, and confirm the app's reports still agree.

## Activity log

1. Measured CORS: PocketBase → `Access-Control-Allow-Origin: *`, allows `authorization` + `content-type`;
   TrailBase → echoes the origin, `allow-methods: *`, `allow-headers: *`. A backend-free page is viable.
2. Built the hub: `src/lib/plugins.js` (a small frontmatter parser + directory scan), `src/routes/plugins.js`
   (`GET /plugins`), `views/plugins/index.html`, and a `requireAuth`-gated `express.static` mount under
   `/plugins`; added a nav link and a `.tag` chip in `app.css`; wrote `plugins/README.md`.
3. Wrote the plugin as one self-contained file, `plugins/import-from-v1/index.html`, plus its `meta.md`;
   gave it a percentage bar, overall records done/total, and a sliding-window speed readout
   (`rec/s` at ≥ 1, else `s/rec`), with DOM updates coalesced to ~5/s.
4. Removed the server-side migration entirely (route, two libs, view, `config.pocketbaseUrl`, nav link,
   dashboard shortcut) and reverted the wiring.
5. Replaced the plugin's per-record `render()` with a throttled `scheduleRender()` after noticing it
   rebuilt the log/error/summary tables on every one of 60k records.
6. Exercising the wipe surfaced a **pre-existing bug**: TrailBase's `DELETE` returns a `text/plain` body
   `deleted`, which `trailbase.js` parsed with `JSON.parse` — so every hard delete (sections, items in
   management too) threw. Fixed the client to return raw text for non-JSON 2xx bodies.
7. Verified in a real Chrome (login → Plugins → Import from v1 → Start import): 60,245/60,245, 0
   failures; dashboard counters then matched PocketBase exactly; Stock Report matched the source view;
   Profit Report matched its documented formula; `npm run smoke` 55/55; 390 px mobile layout stacks.
8. Cleaned up: killed the servers + Chrome, removed temp depots, `.tbdemo` and helper scripts.

## Changed artifacts

- `frontend-ssr/src/lib/plugins.js`, `frontend-ssr/src/routes/plugins.js`, `frontend-ssr/views/plugins/index.html` — new hub.
- `frontend-ssr/plugins/import-from-v1/{index.html,meta.md}`, `frontend-ssr/plugins/README.md` — the plugin.
- `frontend-ssr/src/server.js`, `src/config.js`, `views/partials/nav.html`, `public/css/app.css` — wiring.
- `frontend-ssr/src/lib/trailbase.js` — non-JSON 2xx body fix.
- `frontend-ssr/README.md` — Plugins section.
- Removed: `frontend-ssr/src/routes/migrate.js`, `src/lib/migration.js`, `src/lib/pocketbase.js`,
  `views/migrate/`, `public/migrate.html`.
- Vault: this WorkSession, [[Checkpoint — Plugins Hub — 2026-09-25]],
  [[TB-0007 Add the plugins hub and the Import from v1 migration plugin]], [[Import from v1 Plugin]],
  [[Decision — Run the PocketBase migration client-side as a plugin]],
  [[Issue — Report cache lag after a client-side import]],
  [[Issue — TrailBase returns a plain-text DELETE body]]; updates to the subsystem, TB-0003 and the project.

## Verification performed

- Real-data import in Chrome: 60,245/60,245, 0 failures, per-collection counts reconciled.
- 18 counter checks (counts + enum distributions) against PocketBase: all match.
- Stock Report `3,337,165.56` == independent sum from the `items_report` view (row-for-row).
- Profit Report: independent recompute 3,439,793.28 vs page 3,439,793.33; row set 21,815 == source.
- `npm run smoke` → 55/55.
- `/plugins` and `/plugins/import-from-v1/` require login (302 → `/login?next=…`); unknown plugin → 404.
- Mobile 390 px screenshot: cards stack, inputs full width.

## Blockers and open questions

- **Report cache lag**: after an import the node process keeps serving cached base tables for up to
  `CACHE_TTL_SECONDS` (60 s) — see [[Issue — Report cache lag after a client-side import]]. Observed
  directly (dashboard showed 0 until the TTL elapsed).
- The live dataset has **no `companies` collection**, so `party_companies` / `order_booker_companies`
  stayed empty in the real run; the link-row path is exercised only by the seeded wipe test, not by a
  live import.
- Management hard-delete (the DELETE bug's blast radius) was not re-driven through the UI after the fix;
  it is exercised by the plugin's wipe and by reasoning from the failing path.

## Exact next action

None scheduled for this work. Natural follow-ons: decide whether to remove the report-cache lag
([[Issue — Report cache lag after a client-side import]]), or continue with
[[TB-0006 Give items a company and use it in reports]].

## Related

- [[TB-0007 Add the plugins hub and the Import from v1 migration plugin]]
- [[Checkpoint — Plugins Hub — 2026-09-25]]
- [[Import from v1 Plugin]]
