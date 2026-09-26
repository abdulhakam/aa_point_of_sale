---
title: frontend-ssr (TrailBase frontend)
type: system
status: experimental
maturity: new
locator: frontend-ssr/
runtime: Node.js >= 20, Express 4, MiniJinja (WASM)
created: 2026-09-26
tags: [pos, frontend, ssr, express, minijinja, experimental]
related_to: ["[[frontend]]", "[[trailbase]]"]
---

# frontend-ssr (TrailBase frontend)

**New / experimental.** `frontend-ssr/` is a server-rendered frontend for the TrailBase
backend ([[trailbase]]). It replaces the Next.js/PocketBase client ([[frontend]]) for the
three screens that do not need interactive, high-frequency data updates: the dashboard,
the reports, and the management (master-data) screens.

Invoices, cash memo, expenses and printing are **out of scope by request** — TrailBase
still exposes those tables, this UI just does not edit them. See
[[frontend-ssr-feature-parity-gaps]].

## Stack

`package.json` dependencies are deliberately tiny: `express ^4.21.2`, `cookie-parser`,
`dotenv`, `minijinja-js ^2.24.0` (the WASM binding of the Rust `minijinja`). ESM
(`"type": "module"`), `engines.node >= 20`. Scripts: `start` (`node src/server.js`),
`dev` (`node --watch src/server.js`), `smoke` (`node scripts/smoke.js`).

Architecture:

```text
browser ──HTTP──▶ Express (this app)                       ──REST──▶ TrailBase
                  ├─ MiniJinja templates on the filesystem            ├─ /api/auth/v1/*   (JWT credential)
                  ├─ signed httpOnly session cookie                   ├─ /api/records/v1/* (CRUD)
                  ├─ report aggregation on worker_threads
                  └─ pure HTML/CSS + a few lines of JS
```

- **No UI framework.** Plain HTML, one hand-written stylesheet, ~60 lines of progressive
  enhancement JS (clock, print button, confirm-on-delete, type-to-filter for long selects).
  The screens work with JavaScript disabled apart from those conveniences.
- **Templates are files**, rendered from `views/**/*.html` at render time. The report pages
  live one level deeper, in `pages/<slug>/page.html` (see the page host below).
- **Auth is TrailBase's JWT only.** The browser posts credentials to this app, which
  exchanges them at `/api/auth/v1/login` and stores the returned `auth_token` /
  `refresh_token` in a signed, httpOnly cookie. The token is refreshed automatically when
  it is close to expiry.

## Layout

```text
frontend-ssr/
  src/
    server.js            # app wiring: middleware order, route mounting, listen
    config.js            # env -> config object; workerCount()
    lib/
      auth.js            # session cookie + requireAuth + token refresh
      trailbase.js       # minimal TrailBase client (CRUD + auth only)
      entities.js        # management-screen entity definitions (7 entities)
      pages.js           # the page registry (discovers pages/<slug>/meta.json)
      plugins.js         # reads plugins/<slug>/meta.md
      render.js          # MiniJinja rendering
      session.js http.js uuid.js
      reports/           # data.js, index.js, pool.js, worker.js
    routes/              # auth.js, dashboard.js, reports.js, management.js, pages.js, plugins.js
  compute/               # format.js, ids.js, reports.js, views.js  <- shared with the browser
  views/                 # layout.html, auth/, dashboard/, reports/, management/, pages/, plugins/
  pages/                 # 14 declarative pages: <slug>/{meta.json,page.html}
  plugins/               # import-from-v1/ (meta.md + index.html)
  public/                # static assets
  scripts/smoke.js       # 55-assertion end-to-end smoke test
```

## Request pipeline (`src/server.js`)

Order matters and is visible in the file:

1. `express.urlencoded({ extended: false, limit: "1mb" })`, then `cookieParser()`.
2. `/static` → `express.static(publicDir, { maxAge: 0 })` — revalidate on every load, so
   runtime edits are picked up; an unchanged file costs a 304.
3. `sessionMiddleware({ tb, config })` — resolves the TrailBase credential from the cookie.
4. A middleware that hands the current token to the report service
   (`reports.rememberToken(req.token)`), because the refresh job runs *between* requests
   and needs a token to read with.
5. `/compute` → `express.static(computeDir)` **behind `requireAuth`** — the same
   environment-neutral compute modules Node imports, served so the browser runtime can run
   them in a worker. One implementation, two consumers.
6. Routers: `authRoutes`, `dashboardRoutes`, `reportRoutes`, `managementRoutes`,
   `pluginRoutes`, then `pageRoutes` (the declarative page host).
7. `/plugins` → `express.static(pluginsDir, { index: "index.html" })` behind the same login.
8. `GET /healthz` → `{ ok: true, workers: reports.stats() }`.
9. A JSON 404, then `trailbaseErrorHandler` (renders a TrailBase failure as a page).

## The report service (`src/lib/reports/`)

A snapshot of the 17 base tables **and** their derived views is held in memory and kept
fresh by a background job. Reading TrailBase is cheap, so the job spends CPU only when
something actually changed:

1. **probe** — one request per table for a fingerprint (row count + newest `updated`);
   tables whose fingerprint did not move are left alone;
2. **fetch** — only the changed tables, each read whole;
3. **process** — only the views those tables feed (`viewsAffectedBy`);
4. **render** — only the reports that read a rebuilt view, pre-rendered for their default
   filters and cached.

Details that matter:

- The fingerprint is `{count, newest updated}` per table, obtained with a single
  `limit=1&order=-updated&count=true` request. It works because every table carries
  `updated` (maintained by the `trg_<table>__updated` trigger) and TrailBase's `uuid_v7`
  ids are time-sortable, so any insert, delete or in-place update moves one of the two.
  If the server rejects `order=-updated` the probe degrades to count-only.
- Report results are cached per `(report, filters)` until a rebuilt view can affect them;
  `MAX_CACHED_REPORTS = 200`, evicted oldest-first.
- A management write calls `invalidate(tables)`, which marks just those tables and triggers
  the same job immediately, so the next request sees the write.
- Aggregation runs on a `worker_threads` pool sized to `WORKER_THREADS` or CPUs − 1
  (min 1). If the pool cannot start, the same pure function runs in-process.
- Single-flight via `inflight`; `ensureFresh` retries at most 3 times so a stream of writes
  cannot spin forever.
- `reports.status()` feeds the `/reports/status` endpoint and the green indicator in the
  top bar.

Manually: the green state indicator is also a **button**. Clicking it POSTs
`/reports/refresh`, which probes, re-reads only what changed, rebuilds those views,
re-renders the affected reports, then reloads the page. It is a plain form so it works with
JavaScript disabled. `?full=1` re-reads every table instead of only the changed ones. See
[[trailbase-incremental-report-refresh]].

## Routes

| Route | Purpose |
|---|---|
| `GET /auth/login`, `POST /auth/login`, `POST /auth/logout` | credential exchange, session cookie |
| `GET /dashboard` | the `counts_for_row_numbers` counters and tiles |
| `GET /reports` | 11 report tiles + 4 ledger tiles |
| `GET /reports/<key>` | one report, with its APPLY/RESET filter form and PRINT button |
| `GET /reports/ledgers`, `/reports/ledgers/<area\|booker\|general\|party>` | ledgers |
| `GET /reports/status`, `POST /reports/refresh` | refresh-job state / manual trigger |
| `GET /management`, `/management/<entity>`, `POST` create/update/delete | master data |
| `GET /p`, `/p/<slug>`, `/p/<slug>/data` | the declarative page host |
| `GET /plugins`, `/plugins/<slug>/` | the plugin hub and plugin pages |
| `GET /healthz` | `{ok: true, workers: …}` |

Full map, including the legacy app's routes side by side: [[route-map]].

## The declarative page host

`src/routes/pages.js` knows nothing about any specific page. It discovers folders under
`pages/`, renders the template their `meta.json` names, serves the source tables their
filters declare, and dispatches their trusted named compute operation. **Adding a page is
adding a folder** — no change to `src/` or `views/`.

```jsonc
{
  "title": "Profit Report",
  "template": "page.html",
  "needs": { "views": ["transactionsReport", "refs"] },
  "compute": { "report": "profit" },
  "filters": [
    { "name": "from", "label": "Date From", "type": "date", "default": { "fn": "monthStart" } },
    { "name": "company", "label": "Company", "type": "select", "source": "categories" }
  ],
  "columns": [ { "key": "profitText", "label": "Profit", "right": true } ],
  "totals": [{ "label": "Total Profit", "key": "profit" }]
}
```

- A filter default is either a literal or `{ "fn": "<export of compute/format.js>" }`
  (e.g. `monthStart`), resolved server-side so the manifest stays declarative while the
  server-rendered form still ships concrete values.
- `needs.tables` may be listed explicitly, but anything omitted is derived from
  `needs.views`, so a page cannot under-declare the data it needs. A `select` filter's
  `source` also implies its table is needed.
- `/p/<slug>/data` returns `{version, slug, filters, result, meta}` plus only the tables
  needed for the select filters — the browser renders the result and does **no** report
  computation. It is ETagged `W/"v<PAYLOAD_REVISION>-<snapshotVersion>-<filters>"`,
  `cache-control: private, no-cache`, and gzipped when the client accepts it.
  `PAYLOAD_REVISION` is bumped when the payload shape changes.
- `metaJson` is serialised in Node, not in the template, because MiniJinja hands templates
  a proxy and `| json` on it yields `{}`; `<` is escaped so it cannot close the script tag.
- `readPage` rejects anything that escapes `pagesDir` (`..`, `\`, NUL).

Implemented pages (14): `reports/{payments,salesreport,paymentsbycompany,itemsales,profit,
stock,difference,outstanding,productsale,dailysale}` and
`ledgers/{area,booker,general,party}`.

**`/reports/payments/areawise` is not implemented** — in the old frontend it is a copy of
the Unified Payments Report that no tile links to, so it was left out rather than
duplicated.

## Management screens

`src/lib/entities.js` declares 7 entities as data: which record API backs the screen, which
fields the form edits, and how list columns render. `ENTITY_ORDER` is
`items, parties, bookers, categories, companies, areas, sections` (the order shown in the
management hub).

| Key | API | Label | Soft delete |
|---|---|---|---|
| `sections` | `sections` | Sections | no |
| `areas` | `areas` | Areas | yes |
| `categories` | `categories` | **Item Companies** | yes |
| `companies` | `companies` | Companies | yes |
| `parties` | `parties` | Parties | yes |
| `bookers` | `order_bookers` | Order Bookers | yes |
| `items` | `items` | Items | no |

Column rendering covers more than plain keys: `resolve` looks a foreign key up in another
table's rows, `enumSource` renders a `*_types` label, `multi` renders a link table's
targets, and `via` + `viaSource` + `viaKey` walk an indirect chain — e.g. a party's
**Section** comes from its Area. Note `items.category` is labelled **"Company"** in the UI,
which is the one naming decision still open: see [[tb-0014-point-company-fields-at-companies]].

Rows are read through `lib/reports/data.js`, which normalises relation columns to ids and
coerces `0`/`1` integers to numbers for the tables that have boolean-ish flags
(`deleted`, `paid`, `completed`), because TrailBase reports `INTEGER` columns as JSON
integers.

## Plugins

`/plugins` lists the optional, self-contained features in `plugins/`. Each plugin is one
folder: `meta.md` (description + YAML frontmatter: title, author, license, tags, order) and
`index.html` (the plugin's single static page), served at `/plugins/<slug>/` behind the
same login. A plugin is added, changed or removed by copying or deleting its folder — no
change to `src/` or `views/` needed.

Bundled: **Import from v1** (`plugins/import-from-v1/`) — a backend-free migration that
copies a running PocketBase (v1) database into this TrailBase depot, talking directly to
both servers from the browser. See [[trailbase-client-side-migration-plugin]].

## Verification

`npm run smoke` boots a throw-away TrailBase depot, seeds a small consistent dataset
through the record APIs, starts this frontend against it, and drives every screen over HTTP
with a real login — **55 assertions**, including hand-computed amounts that must match the
preserved view SQL.

```text
== 55/55 checks passed ==
```

Assertions that pin the arithmetic are listed in [[reports-and-ledgers]].

## Configuration

`.env` (git-ignored, `.env.example` is the template):

| Variable | Meaning | Default | In this repo |
|---|---|---|---|
| `TRAILBASE_URL` | TrailBase base URL | `http://127.0.0.1:4000` | `http://127.0.0.1:4000` |
| `HOST` / `PORT` | where this app listens | `127.0.0.1` / `3100` | `127.0.0.1` / `3100` |
| `SESSION_SECRET` | HMAC key for the session cookie | insecure dev default | a dev value — rotate it |
| `APP_NAME` | title in the header | `AA Point of Sale` | `AA Point of Sale` |
| `WORKER_THREADS` | report threads; `0` = CPUs − 1 | `0` | `0` |
| `REFRESH_INTERVAL_SECONDS` | background refresh tick; `0` disables | `60` | unset (60) |
| `COOKIE_SECURE` | set `true` when served over HTTPS | unset | unset |

`CACHE_TTL_SECONDS` also appears in `.env` / `.env.example` but is **not read by
`src/config.js`** — the reference cache TTL is currently inert. See [[environment]].

Start it with `frontend-ssr\RUN.BAT` (installs deps, copies `.env.example` → `.env` if
missing, then `npm start`), or `npm start` directly. TrailBase must already be running.

## Known gaps

- `/reports/payments/areawise` not implemented (deliberate).
- Invoices, cash memo, expenses and printing are out of scope by request.
- The General Ledger's opening-balance inputs are per-request form values, exactly as the
  old screen behaved — they are not persisted.
- The legacy Next.js app is still the production UI; this app is not yet the whole product.
  See [[frontend-ssr-feature-parity-gaps]].
