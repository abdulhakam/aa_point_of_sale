# frontend-ssr — TrailBase frontend (dashboard, reports, management)

A server-rendered frontend for the **TrailBase** backend. It replaces the Next.js/PocketBase
client for the three screens that do not need interactive, high-frequency data updates:
the dashboard, the reports, and the management (master-data) screens.

TrailBase is used **only** for CRUD and auth. Every derived number — invoice totals, stock,
profit, ledgers, outstanding balances — is computed in this application, never in the
database (TrailBase has no report views; see
`Decision — Drop SQL views; aggregate reports client-side`).

## How it is put together

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
- **Templates are files, rendered with MiniJinja** (`minijinja-js`, the WASM binding of the
  Rust `minijinja`). `views/**/*.html` are loaded from disk at render time.
- **Auth is TrailBase's JWT only.** The browser posts credentials to this app, which exchanges
  them at `/api/auth/v1/login` and stores the returned `auth_token`/`refresh_token` in a
  signed, httpOnly cookie. The token is refreshed automatically when it is close to expiry.
- **Reports are aggregated on worker threads.** The base tables are read once and cached
  (`CACHE_TTL_SECONDS`); the derived views and each report are computed in a
  `worker_threads` pool sized to the CPU count (see `src/lib/reports/`).

## Quick start

```sh
# 1. start the backend (separate terminal)
..\trailbase\RUN.BAT

# 2. configure and start this frontend
copy .env.example .env     # then edit SESSION_SECRET
npm install
npm start
```

Then open <http://127.0.0.1:3100> and sign in with a TrailBase user (`trail --depot=../trailbase/traildepot user ...`,
or the credentials printed on the backend's first run).

`RUN.BAT` does the install/configure/start dance on Windows.

## Configuration

| Variable | Meaning | Default |
|---|---|---|
| `TRAILBASE_URL` | TrailBase base URL | `http://127.0.0.1:4000` |
| `HOST` / `PORT` | where this app listens | `127.0.0.1` / `3100` |
| `SESSION_SECRET` | HMAC key for the session cookie | *(insecure dev default)* |
| `APP_NAME` | title shown in the header | `AA Point of Sale` |
| `WORKER_THREADS` | report threads; `0` = CPUs − 1 | `0` |
| `CACHE_TTL_SECONDS` | base-table/derived-view cache TTL | `60` |
| `COOKIE_SECURE` | set `true` when served over HTTPS | unset |

## What is implemented

**Dashboard** — the `counts_for_row_numbers` counters and shortcuts to Reports / Management.

**Reports** (`/reports`) — index plus:

| Screen | Source (rebuilt in JS) |
|---|---|
| Unified Payments Report | `payments_view` |
| Sales Report | `payments_view` (unpaid, recieving/return) |
| Payments By Company | `payments_invoices_report` |
| Item Sales Report | `transactions_report` |
| Profit Report | `transactions_report` |
| Stock Report | `items_report` |
| Difference Report | `items_difference_report` |
| Daily Sale Report | `invoice_view` |
| Outstanding Payments | `outstanding_summary` |
| Product Sale Report | `transaction_view` |
| Ledgers → Party / Booker / Area / General | `ledger_party`, `ledger_booker`, `ledger_area`, `ledger_journal` |

Each report has an APPLY/RESET filter form (the old screens fetched on every keystroke; here
the request only happens on APPLY, matching the POS-0026 behaviour) and a PRINT button that
hides the chrome via `@media print`.

**Management** (`/management`) — create/edit/delete for Sections, Areas, Parties, Item
Companies (`categories`), Companies, Order Bookers and Items. Multi-valued relations
(`parties.company`, `order_bookers.company`) are edited through the `party_companies` /
`order_booker_companies` link tables. Tables that have a `deleted` column are soft-deleted;
the rest are hard-deleted.

## Plugins

`/plugins` lists the optional, self-contained features in `plugins/`. Each plugin is one folder:

```text
plugins/<slug>/
  meta.md      # description + YAML frontmatter (title, author, license, tags, order)
  index.html   # the plugin's single static page
```

The hub reads each `meta.md` (see `src/lib/plugins.js`) and the page is served as a static file at
`/plugins/<slug>/`, behind the same login as the rest of the app. A plugin is added, changed or
removed by copying or deleting its folder — no change to `src/` or `views/` needed. See
`plugins/README.md` for the format.

Bundled: **Import from v1** (`plugins/import-from-v1/`) — a backend-free migration that copies a
running PocketBase (v1) database into this TrailBase depot. It talks directly to both servers from
the browser (PocketBase admin login + paged reads; TrailBase user login + bulk record writes, with
per-row delete for the optional clear) and translates PocketBase ids/enum text into TrailBase UUIDs
and codes. See its `meta.md` and the inline `PLAN` for the field mapping.

## Report arithmetic

`src/lib/reports/views.js` rebuilds the PocketBase view SQL in JavaScript, and
`src/lib/reports/reports.js` reproduces the per-page calculators of the old frontend. The
mapping is documented in `vault/references/reports-and-ledgers.md`, and the SQL itself is
preserved in `../full_database_schema.sql` and
`../dltbl/views_from_pb/U1776088644__create_views.sql`.

The inherited quirks are kept deliberately:

- `transaction_view.profit` is total cost, not margin (named misleadingly in the old SQL) —
  the Profit Report uses `transactions_report.profit`, which is the real margin;
- `ledger_*.credit/debit` do not model the return case;
- `ledger_journal.stock` is always `0`.

One deviation is deliberate: `ledger_area` grouped arbitrary `created`/`type` values from its
`GROUP BY`, which made its date and "recieving only" filters unreliable. The Area Ledger here
filters the source payments instead, so the range and type filter mean what the screen implies.

## Verification

`npm run smoke` boots a throw-away TrailBase depot, seeds a small consistent dataset through
the record APIs, starts this frontend against it, and drives every screen over HTTP with a real
login — 55 assertions, including hand-computed amounts that must match the preserved view SQL.

```text
== 55/55 checks passed ==
```

Examples of the arithmetic assertions for the seed:

| Value | Expected | Why |
|---|---|---|
| Profit Report total | `91.00` | sale margin `90.42 + 40.58` minus return `40.00` |
| Item Sales total sale | `731.00` | `590.42 + 140.58` (invoice-level `discount_rs` allocated per line) |
| Stock Report total | `4510.00` | `91 × 50` Cola minus `2 × 20` Chips |
| Payments payable / recivable | `800.00` / `150.00` | unpaid sending, and recieving − recieved − returns |
| Outstanding balance | `150.00` | `500 − 200 − 150` for the seeded customer |
| Payments By Company split | `403.85` / `161.54` | revenue share `598.50 / 741` and `142.50 / 741` of a `500` payment |

## Known gaps

- **`/reports/payments/areawise`** is not implemented. In the old frontend it is a copy of the
  Unified Payments Report that no tile links to; it is left out rather than duplicated.
- Invoices, cash memo, expenses and printing are **out of scope** by request — TrailBase still
  exposes them, this UI just does not edit them.
- The General Ledger's opening-balance inputs are per-request form values, exactly as the old
  screen behaved; they are not persisted.
