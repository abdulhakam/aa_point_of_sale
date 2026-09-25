---
type: Checkpoint
status: Superseded
belongs_to:
  - "[[TrailBase Backend]]"
work_session:
  - "[[Work Session — TrailBase Frontend — 2026-09-24]]"
works_on:
  - "[[TB-0004 Build the server-rendered TrailBase frontend]]"
supersedes:
  - "[[Checkpoint — TrailBase Backend — 2026-09-24]]"
created: 2026-09-24
updated: 2026-09-24
tags:
  - trailbase
  - frontend
  - checkpoint
---

# Checkpoint — TrailBase Frontend — 2026-09-24

## Objective

Leave the TrailBase frontend finished, verified and resumable: a server-rendered client for the
dashboard, the reports and the management screens that uses TrailBase only for CRUD and auth and
computes every report itself.

## Active tasks

- [[TB-0004 Build the server-rendered TrailBase frontend]] — **Done** (this session).
- [[TB-0002 Wire a frontend to the TrailBase server]] — Backlog. Its goal is now met for the new app
  by TB-0004; it still describes wiring the *Next.js* client.
- [[TB-0003 Migrate PocketBase data into the TrailBase schema]] — Backlog, held.

## Completed since previous checkpoint

- Built `frontend-ssr/`: an Express app that renders MiniJinja templates from the filesystem, holds
  TrailBase's JWT in a signed httpOnly cookie with automatic refresh, and exposes dashboard, reports
  and management. Plain HTML/CSS plus a small progressive-enhancement script; no UI framework.
- Rebuilt all thirteen PocketBase report views in JavaScript and the per-page calculators on top of
  them; report aggregation runs on a `worker_threads` pool over cached views.
- Verified end to end and numerically: `npm run smoke` boots a throw-away depot, seeds data through
  the record APIs and drives every screen over HTTP with a real login — **55/55 checks pass**.
- Fixed two genuine report bugs found by that harness (payments-by-company split basis and type
  mapping) and one crash path (async handler rejections escaping Express 4).
- Recorded the work: task, subsystem note, WorkSession, README.

## Current verified state

- `frontend-ssr/` runs on Node 24 with `npm install && npm start` after copying `.env.example` to
  `.env`; `RUN.BAT` automates it on Windows.
- TrailBase contract re-confirmed empirically on `trail v0.33.22`: login returns
  `{auth_token, refresh_token, csrf_token}`, a `Bearer` header authenticates reads and writes,
  lists paginate by `cursor`, `filter[col][$op]` is the filter syntax (`$in` unsupported), relation
  columns read as `{id}` and are written as canonical UUID text, and unauthenticated requests get
  `403`.
- Report output matches the preserved view SQL on the seeded dataset — see the expectation table in
  [[TB-0004 Build the server-rendered TrailBase frontend]] `## Verification`.
- All verification used scratch depots under `frontend-ssr/.tbdemo/`, which were removed afterwards;
  this session's tests never exercised the real `trailbase/traildepot`.
- **Correction, observed after these notes were written:** `trailbase/traildepot/data/` now exists
  (created 2026-09-25 00:46) and `metadata.textproto` records `v0.33.22`, so the backend has since been
  run against the real depot. The "clean first run" assumption no longer holds — delete
  `traildepot/data/` before expecting the migration to apply, or the stale depot will silently keep the
  old schema ([[Issue — A stale TrailBase depot silently keeps an old schema]]). `data/` is git-ignored;
  the `metadata.textproto` version bump is a TrailBase startup side effect and is left uncommitted.
- The Next.js frontend, the PocketBase backend and the TrailBase schema were not touched by this change.

## Files and artifacts changed

- New: all of `frontend-ssr/` — `src/` (server, config, `lib/`, `lib/reports/`, `routes/`), `views/`,
  `public/`, `scripts/smoke.js`, `README.md`, `RUN.BAT`, `.env.example`, `.gitignore`, `package.json`.
- Vault: `subsystems/frontend-ssr-server-rendered.md`,
  `tasks/tb-0004-server-rendered-frontend.md`,
  `work-sessions/2026-09-24-trailbase-frontend.md`, this file.
- Vault updated: `projects/trailbase-backend.md`,
  `tasks/tb-0002-wire-frontend-to-trailbase.md`,
  `checkpoints/2026-09-24-trailbase-backend.md` (status → Superseded).

## Decisions and assumptions that affect next steps

- TrailBase is a CRUD/auth service only; every derived number is computed in the application. This
  is the frontend-side consequence of
  [[Decision — Drop SQL views; aggregate reports client-side]].
- The MiniJinja binding is treated as hostile to accumulation, so **all totals are computed in
  JavaScript and passed into templates**. Do not reintroduce `{% set %}` accumulators or chained
  attribute access on optional objects.
- Report names are resolved server-side into plain strings, so templates stay free of lookups. Keep
  that boundary: richer templates are what the WASM engine's sharp edges punish.
- The report engine is deliberately data-shape-agnostic beyond `views.js`; if the TrailBase schema
  changes (expected — see [[TrailBase Backend]]), `views.js` and `data.js` are the only places that
  must follow.
- **Assumption to re-check:** that `items.category` (an item's company) and a party's/booker's
  `companies` link rows are meant to be different vocabularies. The old frontend used one, and the
  payments-by-company split depends on the answer.

## Blockers and unresolved questions

- None blocking.
- Should invoices, cash memo and printing be built here too, or does TrailBase's own admin dashboard
  cover them?
- `/reports/payments/areawise` is intentionally omitted (an unreferenced duplicate); confirm it is
  not wanted.
- The old Area Ledger view's `GROUP BY` produced arbitrary `created`/`type` values, so its own date
  and type filters were unreliable. This app filters source payments instead; that choice is a
  deliberate divergence, not a bug.

## Exact next action

No code action is scheduled. Next is a decision between:

1. extending this app to the remaining screens (invoices, cash memo),
2. [[TB-0002 Wire a frontend to the TrailBase server]] for the Next.js client, or
3. [[TB-0003 Migrate PocketBase data into the TrailBase schema]].

If work resumes without that decision, start from `frontend-ssr/README.md`.

## Verification still required

- Nothing for the completed work; `npm run smoke` is repeatable and currently reports 55/55.
- `python scripts/kb_check.py vault` should be re-run after these note changes.

## Resume procedure

1. Read [[TrailBase Backend]] (outcome, current state, task index).
2. Read this checkpoint.
3. Read [[Work Session — TrailBase Frontend — 2026-09-24]] for the activity log and the reasoning.
4. Read `frontend-ssr/README.md` for configuration, the report arithmetic and the expectation table.
5. Read [[Frontend — TrailBase Server-Rendered App]] before changing the report engine or templates.
6. Run `npm run smoke` to confirm the starting state before editing.
7. Continue from `Exact next action` unless reality has already invalidated it.
