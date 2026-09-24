---
type: Subsystem
status: Active
created: 2026-09-24
updated: 2026-09-24
belongs_to:
  - "[[TrailBase Backend]]"
related_to:
  - "[[Backend — TrailBase Server]]"
  - "[[Frontend — Next.js Application]]"
  - "[[Reports & Ledgers]]"
  - "[[Route Map]]"
  - "[[TB-0004 Build the server-rendered TrailBase frontend]]"
tags:
  - trailbase
  - frontend
  - express
  - minijinja
  - reporting
---

# Frontend — TrailBase Server-Rendered App

## What it is

A server-rendered frontend for [[Backend — TrailBase Server]], living in `frontend-ssr/`. It is the
TrailBase counterpart of [[Frontend — Next.js Application]], but a different kind of client: an
Express app that renders MiniJinja templates from the filesystem and talks to TrailBase with a
server-held credential.

It exists because TrailBase has no report views (see
[[Decision — Drop SQL views; aggregate reports client-side]]), so every derived number has to be
computed somewhere. Here that somewhere is the Node process, not the browser and not the database.

Scope is deliberately narrow — the three screens that do not need interactive or high-frequency data
updates: **dashboard, reports and management**. Invoices, cash memo and printing are untouched.

## Where it lives

```text
frontend-ssr/
  README.md                  # design record, configuration, report arithmetic, verification
  RUN.BAT                    # install + configure + start
  .env.example
  src/
    server.js                # Express app, middleware wiring, graceful shutdown
    config.js                # env-driven configuration; worker count
    lib/
      trailbase.js           # TrailBase REST client (auth + records)
      session.js             # signed httpOnly cookie session; JWT decode/expiry
      auth.js                # session middleware, token refresh, requireAuth
      http.js                # page rendering helper, error handler, async wrapper
      render.js              # MiniJinja environment + filesystem loader + filters
      format.js              # money/qty/date helpers (mirrors the old frontend)
      entities.js            # management screen definitions (fields, columns)
      reports/
        data.js              # base tables read + relation normalisation
        views.js             # the PocketBase view SQL rebuilt in JavaScript
        reports.js           # one function per report (filters, rows, totals)
        worker.js / pool.js  # worker_threads pool
        index.js             # cached views + dispatch facade
    routes/                  # auth, dashboard, reports, management
  views/                     # the Jinja templates (layout, partials, pages)
  public/                    # app.css, app.js, favicon
```

## Interface

Routes (all except `/login` require a session):

| Route | Purpose |
|---|---|
| `GET /login`, `POST /login`, `POST /logout` | credential exchange; TrailBase JWT goes into a signed cookie |
| `GET /dashboard` | `counts_for_row_numbers` counters + shortcuts |
| `GET /reports`, `GET /reports/ledgers` | report hubs |
| `GET /reports/<report>` | one page per report, filters via query string (APPLY/RESET) |
| `GET /management`, `GET /management/<entity>` | master-data screens |
| `POST /management/<entity>/create`, `…/<id>/update`, `…/<id>/delete` | writes |
| `GET /healthz` | liveness + worker-pool stats |

## How it works

- TrailBase is used **only** for CRUD (`/api/records/v1/*`) and auth (`/api/auth/v1/*`). Verified
  against `trail v0.33.22`: login returns `{auth_token, refresh_token, csrf_token}`, a
  `Authorization: Bearer <auth_token>` header authenticates both reads and writes, lists paginate
  with `cursor`, filters are `filter[col][$op]=…`, relation columns read as `{id}` and must be
  written as canonical UUID text, and unauthenticated requests are answered `403`.
- The browser holds a signed, httpOnly session cookie carrying the TrailBase tokens; the access token
  is refreshed automatically when it is within 60 s of expiry.
- Base tables are read once and cached (`CACHE_TTL_SECONDS`); a management write invalidates the
  cache. The derived views are rebuilt in-process.
- Each report is dispatched to a `worker_threads` pool with only the view arrays it declares, so
  aggregation runs off the request thread; if the pool cannot start, the same pure function runs
  in-process.
- Templates are `views/**/*.html`, loaded from disk by MiniJinja (`minijinja-js`) with a
  views-root-relative loader, and rendered server-side. The browser runs only a small progressive
  enhancement script (clock, print, confirm-on-delete, select filtering).

## Report arithmetic

`src/lib/reports/views.js` reproduces the PocketBase view SQL — `transaction_view`, `invoice_view`,
`transactions_report`, `payments_view`, `payments_invoices_report`, `items_report`,
`items_difference_report`, `ledger_journal`, `ledger_party`, `ledger_booker`, `ledger_area`,
`outstanding_summary`, `counts_for_row_numbers` — and `reports.js` reproduces the per-page
calculators of the old frontend. The formulas are documented in [[Reports & Ledgers]]; the SQL itself
is preserved in `full_database_schema.sql` and `dltbl/views_from_pb/`.

Inherited quirks are kept deliberately (they are in the old SQL too): `transaction_view.profit` is
total cost rather than margin, `ledger_*.credit/debit` ignore the return case, and
`ledger_journal.stock` is always `0`.

Two deliberate divergences:

- `payments_invoices_report` splits a payment by the **item** companies on its invoice
  (`transactions_report.company`), as the SQL does. `payments_view.company` — the booker's companies
  through the `order_booker_companies` link table — is a different vocabulary in the new schema and
  is not used for the split.
- `ledger_area`'s `GROUP BY` emitted arbitrary `created`/`type` values, which made its date and
  "recieving only" filters unreliable. The Area Ledger filters the source payments instead.

## Verification

`npm run smoke` boots a throw-away TrailBase depot, seeds a consistent dataset through the record
APIs, starts this app against it, and drives every screen over HTTP with a real login: **55/55
assertions pass**, including hand-computed amounts that must equal the preserved view SQL (profit
`91.00`, stock `4510.00`, outstanding `150.00`, and the `403.85 / 161.54` revenue-share split).
Details and the expectation table are in `frontend-ssr/README.md`.

## Constraints and gotchas

- **Normalise raw rows before reading relations.** TrailBase returns foreign keys as `{id}` objects
  (`{id: 0}` for an enum code) or `null`, so both the report path and the management screens run rows
  through `normalizeRows()` in `src/lib/reports/data.js` first. Skipping it makes relation columns and
  edit-form prefills resolve to nothing, silently.
- The MiniJinja WASM binding has three sharp edges this codebase works around: `undefinedBehavior`
  is `lenient` but chained attribute access on a missing object still raises, `{% set %}` inside a
  `{% for %}` does not escape the loop, and a panic in the engine corrupts the runtime for the whole
  process. Totals are therefore computed in JavaScript and passed in, never accumulated in a template.
- `expand`, `excluded_columns` and hidden columns are validated by TrailBase at startup, so a config
  typo fails fast.
- `/reports/payments/areawise` is not implemented: in the old frontend it is a duplicate of the
  Unified Payments Report that no tile links to.

## Related

- [[TrailBase Backend]] — the project this belongs to.
- [[Backend — TrailBase Server]] — the API contract and its gotchas.
- [[Frontend — Next.js Application]] — the PocketBase-era client whose screens this mirrors.
- [[TB-0004 Build the server-rendered TrailBase frontend]] — the work that built it.
