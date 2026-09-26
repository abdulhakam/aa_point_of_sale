---
type: Subsystem
status: Active
created: 2026-09-24
updated: 2026-09-25
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
computed somewhere. Originally that somewhere was the Node process; the declarative page host now offers to
move the report computation into the browser while Node keeps the views warm, which is currently slower
(see Declarative pages).

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
    config.js                # env-driven configuration; worker count; refresh interval
    lib/
      trailbase.js           # TrailBase REST client (auth + records)
      session.js             # signed httpOnly cookie session; JWT decode/expiry
      auth.js                # session middleware, token refresh, requireAuth
      http.js                # page rendering helper, error handler, async wrapper
      render.js              # MiniJinja environment + multi-root loader + filters
      entities.js            # management screen definitions (fields, columns)
      plugins.js             # plugin registry: scans plugins/ and parses each meta.md
      pages.js               # page registry: scans pages/ and normalises each meta.json
      reports/
        data.js              # base tables read, relation normalisation, change probe
        worker.js / pool.js  # worker_threads pool
        index.js             # incremental snapshot + dispatch facade
    routes/                  # auth, dashboard, reports, management, plugins, pages
  compute/                   # environment-neutral compute, shared with the browser
    views.js                 # the PocketBase view SQL rebuilt in JavaScript
    reports.js               # one function per report (filters, rows, totals)
    format.js                # money/qty/date helpers (mirrors the old frontend)
    ids.js                   # read-side relation accessor
  pages/                     # one folder per page (meta.json + template); see Declarative pages
  views/                     # the Jinja templates (layout, partials, legacy report pages)
  public/
    css/app.css
    js/app.js                # progressive enhancement + the refresh indicator
    js/runtime/              # the browser page runtime (pool, worker, driver)
  plugins/                   # one folder per plugin (meta.md + index.html); see Plugins below
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
| `GET /plugins` | plugin hub, one card per directory under `plugins/` |
| `GET /plugins/<slug>/` | a plugin's static page (login required) |
| `GET /p`, `GET /p/<slug>`, `GET /p/<slug>/data` | the declarative page host — see Declarative pages |
| `GET /compute/*` | the shared compute modules, served to the browser runtime |
| `GET /reports/status` | the refresh job's phase and last-run summary (top-bar indicator) |
| `POST /reports/refresh` | the top-bar control: probe, re-read what changed, rebuild and re-render; `?full=1` re-reads every table. JSON when asked, otherwise a `303` back |
| `GET /healthz` | liveness + worker-pool stats |

## Plugins

Optional, self-contained features. Each plugin is one directory under `plugins/`:

```text
plugins/<slug>/
  meta.md      # description + YAML frontmatter (title, author, licence, tags, order)
  index.html   # the plugin's single static page
```

`src/lib/plugins.js` scans the directory and parses each `meta.md` (inline `[a, b]` and block-list tags);
`GET /plugins` renders the cards; the page itself is served as a static file by an `express.static` mount
under `/plugins` guarded by `requireAuth`. A plugin is therefore added, changed or removed by copying or
deleting its folder — **no change to `src/` or `views/` is ever needed**, which is the point of the hub.
Plugin pages link the shared stylesheet at `/static/css/app.css` to look like part of the app.

Bundled: **Import from v1** — [[Import from v1 Plugin]], a backend-free PocketBase→TrailBase migration
([[TB-0007 Add the plugins hub and the Import from v1 migration plugin]]).

## Declarative pages

Adding a page is adding a folder under `pages/`:

```text
pages/<slug>/
  meta.json      # title, needs.views (+ raw tables), compute.report, requires, filters, columns, totals
  page.html      # Jinja template (usually two lines: extend the layout, include the shared body)
```

Node exposes three generic routes and a static mount: `GET /p` lists the pages, `GET /p/<slug>` renders the
declared template with the manifest embedded as JSON, `GET /p/<slug>/data` serves the views the manifest names
(gzipped, `ETag` = payload revision + snapshot build) plus any raw tables, and `GET /compute/*` serves the
shared compute modules. **No page-specific code exists in Node**: `src/lib/pages.js` discovers folders and
normalises manifests, and the report is only ever a *name* (`compute.report`) resolved from
`compute/reports.js` by whoever runs it.

The browser runtime (`public/js/runtime/`) is a flat worker pool: the driver fetches the data, fills `select`
options from the declared source tables, hands `{views, filters}` to a worker, and fills rows and totals. A
flat pool is deliberate — worker-inside-worker is a Safari compatibility trap and buys nothing over dispatching
from the main thread.

The compute layer is shared, not duplicated: `compute/` touches no Node API, so Node imports the same files the
browser fetches at `/compute/`.

All 14 reports have pages — [[TB-0011 Add the declarative page host and migrate the reports to it]] and
[[Decision — Declarative pages: a folder is a page, the server is a generic host]]. **The page host is currently
slower than the server-rendered routes**, because it ships the whole view set to the browser
([[Issue — Declarative pages ship whole views and are slower than server rendering]]), so `/reports/*` remains
the production path until [[TB-0008 Serve report results from the page host instead of whole views]] lands.

## How it works

- TrailBase is used **only** for CRUD (`/api/records/v1/*`) and auth (`/api/auth/v1/*`). Verified
  against `trail v0.33.22`: login returns `{auth_token, refresh_token, csrf_token}`, a
  `Authorization: Bearer <auth_token>` header authenticates both reads and writes, lists paginate
  with `cursor`, filters are `filter[col][$op]=…`, relation columns read as `{id}` and must be
  written as canonical UUID text, and unauthenticated requests are answered `403`.
- The browser holds a signed, httpOnly session cookie carrying the TrailBase tokens; the access token
  is refreshed automatically when it is within 60 s of expiry.
- A background job keeps an in-memory snapshot of the base tables and the derived views. Each tick it probes
  every table for a fingerprint (row count + newest `updated`), re-reads only tables that changed, rebuilds
  only the views they feed, and re-renders only the reports that read one. A management write invalidates
  exactly the tables it touched, and the snapshot is published before the warm re-render so a request never
  waits on it. A quiet tick costs 17 cheap requests and no CPU. `REFRESH_INTERVAL_SECONDS` (default 60 s)
  replaces the old `CACHE_TTL_SECONDS` TTL — see
  [[Decision — Refresh the report snapshot incrementally from table fingerprints]]. The pipeline runs on
  the `REFRESH_INTERVAL_SECONDS` timer, on a management write (`invalidate`), lazily when the snapshot is not
  ready, or **on demand**: the top-bar state indicator is a button that POSTs `/reports/refresh`, with
  `?full=1` to re-read every table — [[Issue — No manual trigger for the report snapshot refresh]]
  (Resolved).
- **The legacy `/reports/<report>` routes still serve** every report page from Node. Their replacements live
  in `pages/` but are currently slower — see Declarative pages below.
- Each report is dispatched to a `worker_threads` pool with only the view arrays it declares, so
  aggregation runs off the request thread; if the pool cannot start, the same pure function runs
  in-process.
- Templates are `views/**/*.html`, loaded from disk by MiniJinja (`minijinja-js`) with a
  views-root-relative loader, and rendered server-side. The browser runs only a small progressive
  enhancement script (clock, print, confirm-on-delete, select filtering).

## Report arithmetic

`compute/views.js` reproduces the PocketBase view SQL — `transaction_view`, `invoice_view`,
`transactions_report`, `payments_view`, `payments_invoices_report`, `items_report`,
`items_difference_report`, `ledger_journal`, `ledger_party`, `ledger_booker`, `ledger_area`,
`outstanding_summary`, `counts_for_row_numbers` — and `reports.js` reproduces the per-page
calculators of the old frontend. The formulas are documented in [[Reports & Ledgers]]; the SQL itself
is preserved in `full_database_schema.sql` and `dltbl/views_from_pb/`.

Inherited quirks are kept deliberately (they are in the old SQL too): `transaction_view.profit` is
total cost rather than margin, `ledger_*.credit/debit` ignore the return case, and
`ledger_journal.stock` is always `0`.

Two deliberate divergences, plus one known gap:

- `payments_invoices_report` splits a payment by the **item** companies on its invoice
  (`transactions_report.company`), as the SQL does; `payments_view.company` — the booker's companies
  through `order_booker_companies` — is not the split basis.
- **Known gap:** that split basis, and every other "Company" column in this app, currently reads
  **`items.category`**, because the preserved SQL does and because `items` has no link to `companies`
  yet. The owner has ruled that `category` is vestigial and `company` is what these fields must use —
  see [[Decision — Company replaces category in the TrailBase model]] and
  [[TB-0006 Give items a company and use it in reports]]. Until that lands, read every "Company" column
  here as the item's category.
- `ledger_area`'s `GROUP BY` emitted arbitrary `created`/`type` values, which made its date and
  "recieving only" filters unreliable. The Area Ledger filters the source payments instead.

## Verification

`npm run smoke` boots a throw-away TrailBase depot, seeds a consistent dataset through the record
APIs, starts this app against it, and drives every screen over HTTP with a real login: **63/63
assertions pass**, including hand-computed amounts that must equal the preserved view SQL (profit
`91.00`, stock `4510.00`, outstanding `150.00`, and the `403.85 / 161.54` revenue-share split).
Details and the expectation table are in `frontend-ssr/README.md`.

The declarative page host has its own parity evidence: on a seeded throwaway depot, the profit page renders
`400.00` over 1 row and 13 columns and the stock page `-600.00`, **identical** to the server-rendered routes,
with filters applying and resetting correctly and revalidation returning `304`. On the live 60k-row dataset
the two paths were measured against each other — the page host is slower everywhere, with the numbers and the
method in [[Issue — Declarative pages ship whole views and are slower than server rendering]].

On 2026-09-26 a full three-server E2E (wipe, re-import the live dataset, open every route) confirmed the page
host is **numerically at parity** with the legacy routes: all 14 reports produce identical rows and totals when
the same filters are applied. A bare `GET /reports/<report>` differs only because the legacy route drops its
date defaults — [[Issue — Legacy report routes ignore their declared date defaults]]. See
[[Checkpoint — Three-Server E2E Test — 2026-09-26]].

## Constraints and gotchas

- **A stale frontend on `:3100` silently serves old code.** If another `node src/server.js` already holds
  the port, a newly started one dies with `EADDRINUSE` while the old process keeps answering — so static
  files (read from disk per request) look current while the server routes are stale. Check the listening
  PID before believing a change is live; the smoke suite starts its own process and is unaffected.
- **The backend has to be reachable on IPv4 loopback.** `TRAILBASE_URL` defaults to
  `http://127.0.0.1:4000`, but TrailBase's own default bind is `[::1]:4000` (IPv6 only), so a
  default-configured server is invisible to this app. Start it with `--address=127.0.0.1:4000` — which
  `trailbase/RUN.BAT` does — or point `TRAILBASE_URL` at `[::1]`. See
  [[Issue — TrailBase binds IPv6 loopback by default]].
- **Normalise raw rows before reading relations.** TrailBase returns foreign keys as `{id}` objects
  (`{id: 0}` for an enum code) or `null`, so both the report path and the management screens run rows
  through `normalizeRows()` in `src/lib/reports/data.js` first. Skipping it makes relation columns and
  edit-form prefills resolve to nothing, silently.
- The MiniJinja WASM binding has three sharp edges this codebase works around: `undefinedBehavior`
  is `lenient` but chained attribute access on a missing object still raises, `{% set %}` inside a
  `{% for %}` does not escape the loop, and a panic in the engine corrupts the runtime for the whole
  process. Totals are therefore computed in JavaScript and passed in, never accumulated in a template.
- **MiniJinja hands templates a proxy, so `| json` on a value produces `{}`.** A page manifest must be
  serialised in Node (`metaJson`) and embedded with `| safe`; the `json` filter is only safe on values that are
  real JavaScript objects.
- **A module worker's script is cached aggressively.** Changing `public/js/runtime/worker.js` is not picked up
  by a plain revalidation; the worker URL in `pool.js` carries a version query that must be bumped with it.
- **`compute/` must stay free of Node APIs.** It is served to the browser at `/compute/`; one `Buffer` there
  breaks the page host.
- `expand`, `excluded_columns` and hidden columns are validated by TrailBase at startup, so a config
  typo fails fast.
- `/reports/payments/areawise` is not implemented: in the old frontend it is a duplicate of the
  Unified Payments Report that no tile links to.

## Related

- [[TrailBase Backend]] — the project this belongs to.
- [[Reports vs Pages — Implementation and Performance]] — the side-by-side reference for the two report paths.
- [[TrailBase Frontend System Diagrams]] — interactive architecture, sequence and data-flow diagrams.
- [[Backend — TrailBase Server]] — the API contract and its gotchas.
- [[Frontend — Next.js Application]] — the PocketBase-era client whose screens this mirrors.
- [[TB-0004 Build the server-rendered TrailBase frontend]] — the work that built it.
- [[Import from v1 Plugin]] — the bundled migration plugin.
- [[Issue — Report cache lag after a client-side import]] — the one loose end of a browser-only import.
- [[Decision — Refresh the report snapshot incrementally from table fingerprints]] — how the snapshot stays
  fresh without re-reading everything.
- [[Decision — Declarative pages: a folder is a page, the server is a generic host]] — the page host.
- [[Issue — Declarative pages ship whole views and are slower than server rendering]] — the measured defect.
- [[TB-0008 Serve report results from the page host instead of whole views]] — its fix.
