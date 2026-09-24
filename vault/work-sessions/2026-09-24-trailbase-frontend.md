---
type: WorkSession
status: Completed
started: 2026-09-24
updated: 2026-09-24
belongs_to:
  - "[[TrailBase Backend]]"
works_on:
  - "[[TB-0004 Build the server-rendered TrailBase frontend]]"
related_to:
  - "[[Frontend — TrailBase Server-Rendered App]]"
created: 2026-09-24
tags:
  - trailbase
  - frontend
  - session
---

# Work Session — TrailBase Frontend — 2026-09-24

## Objective

Build a frontend for [[Backend — TrailBase Server]] that looks and behaves like
[[Frontend — Next.js Application]] while doing all data access and processing itself: a Node/Express
app that loads MiniJinja templates from the filesystem, uses TrailBase only for CRUD and auth, and
computes every report on worker threads. Scope: dashboard, reports, management. Plain HTML/CSS/JS,
no UI framework, minimal JavaScript.

## Starting state (verified this session)

- [[TrailBase Backend]] was complete: 17 `STRICT` tables, 17 record APIs, integer-coded enums,
  no views — verified on `trail v0.33.22`.
- [[TB-0002 Wire a frontend to the TrailBase server]] was Backlog and explicitly held pending
  re-specification; the earlier `frontend-tb/` React/Vite scaffold was deleted from the working tree
  and targets the *older* schema, so it was used as neither a starting point nor a reference. (The new
  app was later named `frontend-ssr/` to keep its paths distinct from that scaffold's git history.)
- The report arithmetic existed only as SQL preserved in `full_database_schema.sql` and
  `dltbl/views_from_pb/U1776088644__create_views.sql`, summarised in [[Reports & Ledgers]].
- Installed: Node 24.16, npm 11.13, `trail v0.33.22`.

## Plan

1. Establish the real TrailBase API shapes (auth transport, list pagination, filters, relation reads
   and writes) on a throw-away depot.
2. Establish the real `minijinja-js` API and its failure modes.
3. Build the app skeleton: config, TrailBase client, session, renderer, routes, templates, CSS.
4. Reimplement the view SQL and the per-page report calculators in JavaScript.
5. Verify end to end and numerically, then record the result.

## Activity log

1. **Probed TrailBase.** Started a scratch depot on `v0.33.22` and exercised login, record reads and
   writes, filters, schemas, refresh and paging. Findings that changed the design: no `Set-Cookie`
   (tokens in the body), `Bearer` works for writes without a CSRF header, `?offset=` unreliable so
   `cursor` is used, `$in` rejected, relation writes accept canonical UUID text, relation reads are
   `{id}` objects.
2. **Probed `minijinja-js`.** Found `renderTemplate` + synchronous `setLoader` (not
   `getTemplate().render()`), and three sharp edges: chained attribute access on a missing object
   raises even with `undefinedBehavior: "lenient"`, `{% set %}` inside `{% for %}` does not escape
   the loop, and a panic corrupts the WASM runtime. Templates were designed around all three: names
   are resolved server-side, totals are computed in JavaScript, and paths are resolved
   views-root-relative (an early bug where `reports/report.html` looked for `reports/layout.html`).
3. **Built the app.** `frontend-ssr/`: Express with an `ah()` async wrapper so a rejected promise
   reaches the error middleware instead of crashing the process (a crash this session actually hit),
   signed-cookie session with refresh-before-expiry, filesystem MiniJinja renderer with custom
   filters, declarative per-report page definitions (fields, columns, totals), management entity
   definitions with link-table sync for multi-valued relations, and a `worker_threads` pool that
   receives only the view arrays a report declares.
4. **Reimplemented the views.** `views.js` rebuilds all thirteen PocketBase views in JavaScript;
   `reports.js` reproduces the per-page calculators from the old frontend, including the
   invoice-level flat discount allocated per line.
5. **Built the smoke harness** (`scripts/smoke.js`) and let it drive the work: it immediately
   surfaced a template-resolution bug, a crash on an unhandled rejection, and — most importantly —
   two genuine report bugs: the payments-by-company split used the booker's companies instead of the
   invoice's item companies, and its type map used string keys against numeric codes, which emptied
   the whole report while still rendering its filter dropdown (so a naive "the page contains
   Beverages" assertion passed). Both were fixed, and the assertion was tightened to a numeric one.
6. **Verified numerically.** Added hand-computed expectations for profit, stock, outstanding,
   payment totals and the revenue-share split. 55/55 checks pass. A third bug then surfaced from
   strengthening the management assertions: the management screens read *raw* TrailBase rows, where
   relation columns are `{id}` objects rather than ids, so relation columns and edit-form prefills
   silently resolved to nothing. Rows are now normalised the same way the report path normalises
   them, and separate assertions cover relation columns and prefilled selects.
7. **Wrote the records.** This session, the checkpoint, the task, the subsystem note, a README, and
   targeted updates to the project and TB-0002.

## Changed artifacts

- New: everything under `frontend-ssr/` (app, templates, stylesheet, enhancement script, README,
  `RUN.BAT`, `.env.example`, smoke harness).
- Vault: `subsystems/frontend-ssr-server-rendered.md`, `tasks/tb-0004-server-rendered-frontend.md`,
  this WorkSession, `checkpoints/2026-09-24-trailbase-frontend.md`; updates to
  `projects/trailbase-backend.md`, `tasks/tb-0002-wire-frontend-to-trailbase.md` and
  `checkpoints/2026-09-24-trailbase-backend.md` (now superseded).
- Untouched: the Next.js frontend, the PocketBase backend, and the TrailBase schema.

## Verification performed

- `npm run smoke` → **55/55 checks passed**, from a throw-away depot seeded through the record APIs.
- Arithmetic assertions matching the preserved view SQL (profit `91.00`, item sales `731.00`, stock
  `4510.00`, outstanding `150.00`, payments `800.00`/`150.00`, split `403.85`/`161.54`).
- `npm install` and a full server boot were exercised on Node 24.

## Blockers and open questions

- None blocking.
- Open: should the invoice, cash-memo and printing screens follow later, or does TrailBase's own
  admin dashboard cover them? And should `items.category` and `parties.company` really be different
  vocabularies (categories vs companies), given the old frontend used one?
- All verification used scratch depots created under `frontend-ssr/.tbdemo/` and removed afterwards;
  the real `trailbase/traildepot` was never exercised by the tests.
- Correction noted afterwards: `trailbase/traildepot/data/` now exists and `metadata.textproto` moved to
  `v0.33.22`, so the backend has since been run against the real depot and the "clean first run"
  assumption no longer holds.

## Exact next action

None scheduled. If the work resumes, decide whether the remaining Next.js-side screens
([[TB-0002 Wire a frontend to the TrailBase server]]) or the data migration
([[TB-0003 Migrate PocketBase data into the TrailBase schema]]) come next; both are still held.

## Related

- [[Frontend — TrailBase Server-Rendered App]]
- [[Checkpoint — TrailBase Frontend — 2026-09-24]]
