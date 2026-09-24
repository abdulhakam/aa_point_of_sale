---
type: Task
status: Done
ticket: TB-0004
priority: P2
belongs_to:
  - "[[TrailBase Backend]]"
related_to:
  - "[[Backend — TrailBase Server]]"
  - "[[Frontend — TrailBase Server-Rendered App]]"
  - "[[Frontend — Next.js Application]]"
  - "[[Reports & Ledgers]]"
  - "[[TB-0002 Wire a frontend to the TrailBase server]]"
created: 2026-09-24
updated: 2026-09-24
tags:
  - trailbase
  - frontend
  - express
  - minijinja
---

# TB-0004 Build the server-rendered TrailBase frontend

## Goal

A TrailBase client that renders the dashboard, the reports and the management screens — reading and
writing TrailBase through its record APIs, aggregating every report itself, and rendering plain HTML
from MiniJinja templates on the server.

## Done when

- The app authenticates against TrailBase and uses the returned JWT as its only credential.
- Only CRUD and auth come from TrailBase; all report arithmetic is computed in this application.
- Dashboard, every report screen of the old frontend, and management CRUD for the master data work
  end to end.
- The templates are files on disk rendered by MiniJinja, and the UI is pure HTML/CSS/JS with no UI
  framework.
- Report aggregation runs on worker threads.
- Report output matches the preserved PocketBase view SQL for the same rows.

## Context

The owner asked for a frontend for [[Backend — TrailBase Server]] that looks and behaves like
[[Frontend — Next.js Application]], but with the data access and processing in a Node/Express app
that loads Jinja templates from the filesystem and renders them with `minijinja-js` (TrailBase
supplies only CRUD and auth). Scope was limited to the dashboard, reports and management because
those do not need interactive, high-frequency data updates. The user said minimal JavaScript and no
UI framework.

This is the frontend-side consequence of [[Decision — Drop SQL views; aggregate reports client-side]]:
TrailBase exposes no report views, so the money arithmetic that lived in SQL has to be reimplemented
— the risky half called out in [[TB-0002 Wire a frontend to the TrailBase server]].

## Work log

1. Probed a throw-away `trail v0.33.22` depot to establish the real API shapes rather than trusting
   the notes: login returns `{auth_token, refresh_token, csrf_token}` with no `Set-Cookie`, a
   `Bearer` header authenticates reads *and* writes (no CSRF header needed), lists paginate by
   `cursor` (`?offset=` was unreliable), `filter[col][$op]` works but `$in` is rejected, relation
   columns read as `{id}` / `null`, `expand` returns `{id, data}`, and a bad enum code returns
   `400 db constraint: fk`.
2. Established the MiniJinja binding's real surface (`renderTemplate` + a synchronous `setLoader`,
   `addFilter`, `addGlobal`) and its sharp edges by measuring, not guessing.
3. Built `frontend-ssr/`: Express app, TrailBase client, signed-cookie session with automatic token
   refresh, filesystem MiniJinja renderer, management entity definitions, report engine with a
   `worker_threads` pool, routes, templates, one stylesheet and a small enhancement script.
4. Rebuilt the PocketBase view SQL in `src/lib/reports/views.js` and the per-page calculators in
   `reports.js`, then verified them numerically.
5. Fixed two real bugs found by the smoke test: the payments-by-company split used the booker's
   companies instead of the invoice's item companies, and its type mapping compared string keys
   against numeric codes, which silently emptied the report.
6. Wrote `scripts/smoke.js` — a full end-to-end harness that boots a scratch depot, seeds data through
   the record APIs, starts the app and drives every screen over HTTP with a real login.

## Verification

`npm run smoke` → **55/55 checks pass**. It asserts:

- auth: anonymous redirect, bad password rejected `401`, login sets a session, logout clears it;
- every screen renders (dashboard, both report hubs, all 16 report pages, all 7 management screens);
- management create redirects and the new record appears in the list;
- the report cache invalidates after a write;
- the report worker pool is running.

Arithmetic is checked against values computed by hand from the seed and the preserved SQL — the
numbers that catch a silently wrong reimplementation:

| Value | Expected | Derivation |
|---|---|---|
| Profit Report total | `91.00` | sale margins `90.42 + 40.58` less the return's `40.00` |
| Item Sales total sale | `731.00` | `590.42 + 140.58`, i.e. the invoice's flat `discount_rs` allocated per line |
| Stock Report total | `4510.00` | Cola `91 × 50` minus Chips `2 × 20` |
| Payments payable / recivable | `800.00` / `150.00` | unpaid sending; and recieving − recieved − returns |
| Outstanding balance | `150.00` | `500 − 200 − 150` for the seeded customer |
| Payments By Company split | `403.85` / `161.54` | revenue share `598.50 / 741` and `142.50 / 741` of a `500` payment |

Deviations, both deliberate and documented in the subsystem note: `/reports/payments/areawise` is
omitted (an unreferenced duplicate of the payments report in the old frontend), and the Area Ledger
filters source payments rather than the old view's arbitrary `GROUP BY` values.

## Related

- [[Frontend — TrailBase Server-Rendered App]] — what was built.
- [[Backend — TrailBase Server]] — the API contract.
- [[Reports & Ledgers]] — the formulas being reproduced.
- [[Work Session — TrailBase Frontend — 2026-09-24]]
- [[Checkpoint — TrailBase Frontend — 2026-09-24]]
