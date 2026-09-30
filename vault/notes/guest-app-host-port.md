---
title: Guest app-host port — route dispatcher, SQL reads and report parity
type: note
status: active
created: 2026-09-26
updated: 2026-09-26
tags: [trailbase, wasm, rquickjs, app-host, reports, parity, phase-3]
related_to: ["[[trail-runtime-js-reference]]", "[[runtime-js-single-host]]", "[[trailbase-guest-wasm-runtime-defaults]]", "[[reports-and-ledgers]]"]
---

# Guest app-host port — route dispatcher, SQL reads and report parity

The guest frontend ([[runtime-js-guest-platform]]) now runs on the `runtime-js` host: the
declarative page host, the report/ledger engine and the management/plugin/dashboard screens are
served by a single runtime TypeScript dispatcher, with the **shared** `compute/` modules executed
in QuickJS. All fourteen report/ledger pages produce **byte-identical results to the former Node
app on the same data** (`frontend-ssr`, removed 2026-09-27; the differential was run while it still
existed).

## How it is put together

- **Host change:** `trailbase/tb-ah-run-js/src/lib.rs` gained a dispatcher fallback — a request that matches
  no `ahscripts/routes/<path>/route.*` is routed to `ahscripts/routes/_app/route.ts`. It also
  passes the resolved `user` (`req.user()`), `query`, and more headers into the JS request, and
  understands `{ html }`, `{ redirect, status?, headers? }`, `{ text, status?, headers? }` and
  `{ body, contentType, status?, headers? }` responses (the last for static files, ETags, 304s).
- **Dispatcher** (`trailbase/runtime/ahscripts/routes/_app/route.ts`): one file, no imports. It runs
  inside an **IIFE and installs `GET`/`POST`/`PATCH`/`DELETE` on `globalThis`**, because the host
  re-evaluates the file in the same persistent QuickJS context per request — top-level `const`s
  would be a redeclaration error on the second request.
- **ESM loader:** the dispatcher loads `/app/lib/*` and `/app/compute/*` itself through a small
  ESM→CJS shim (imports → `__require`, `export function`/`const` → declarations + exports) and
  `new Function`. Loaded modules are cached on `globalThis` (so an app-module edit needs a
  restart; the dispatcher file itself is read per request).
- **App modules:** `/app/compute/{format,ids,views,reports}.js` are the **verbatim** shared files;
  `/app/lib/` holds guest ports of the former Node frontend's `src/lib` modules (async `fs` instead
  of `node:fs`) — now **13** of them: `entities`, `data`, `pages`, `plugins`, `http`,
  `report-pages`, `reports`, plus the later additions `sqlviews`, `queue`, `management`,
  `invoicing`, `paths`.
- **Auth:** TrailBase's own cookie (`auth_token`, `SameSite=Strict`) resolved by the host into
  `req.user`; unauthenticated page requests redirect to `/login`, whose POST redirects to
  TrailBase's `/_/auth/login`. No second session layer ([[trailbase-guest-wasm-runtime-defaults]]).

## Data path (the part that had to change)

The guest reads the depot's SQLite directly (`sqlite.all` + `pragma_table_info` for column
names) instead of TrailBase's record APIs. Two properties turned out to be load-bearing for
parity, because the report calculators are order-sensitive (some sort, float accumulation
follows input order):

1. **Row order must match the record API's default `-id`** (uuid_v7 ids are time-sortable). The
   guest's `readTable` adds `ORDER BY "id" DESC`. Without it every report's rows were in a
   different order and the "same" totals drifted in the last cent.
2. **Ordering must be engine-independent.** `String.prototype.localeCompare` is ICU-backed in
   V8 but not in QuickJS, so the same sort produced different row orders. `compute/format.js`
   gained `compareText` (case-insensitive, then lowercase-first) and every `localeCompare` in
   `compute/views.js` and `compute/reports.js` was replaced with it
   ([[deterministic-sort-and-sql-reads-in-guest]]).

## Shared-code changes (verified by the report parity)

- `buildLedgerParty` was **O(n²)** — a `reduce` over all payments per row. With 26,526 payments
  that is infeasible in the guest (and wasteful in Node). Rewritten to sum per (party, date) and
  prefix-sum, then binary-search the date; same value, O(n log n).
- `compareText` added (above).
- The guest service builds only the **view closure** a request needs (`viewClosure` /
  `tablesForViews`) and caches it, rather than every view on every request. Building all views
  plus reading all tables took ~15 s in the interpreter; a lazy dashboard is ~2.7 s and a first
  profit report ~9 s (the 20 s call deadline means this matters).

## Verified: report parity (14/14)

`trailbase/tools/guest-parity.mjs` logs into both apps against the **same** TrailBase server and
diffs each declarative page's computed data (`result.totals` exact; `result.rows` after stripping
raw id fields, which legitimately differ because the guest base64-*standard* encodes uuids and the
record API uses url-safe).

```text
== guest parity: 14/14 pages match ==
payments, salesreport, paymentsbycompany, itemsales, profit, stockreport, difference,
outstanding, productsale, dailysale, ledgers/party, ledgers/booker, ledgers/area, ledgers/general
```

On the seeded depot (8,927 invoices, 23,413 transactions, 26,526 payments) the pinned totals
agree exactly, e.g. profit `3439793.33`, item sales `29662841.62`, stock `3337165.56`,
general ledger `recievable 26079984.69 / payable 19572794.91 / cash -9207712.93`.

## Verified: management CRUD

`trailbase/tools/management-check.mjs` drives create → list → update → verify → delete → verify
against the guest: sections (hard delete) and items (relation + numeric fields). All checks pass.
Writes are direct SQL through a new `db.execute` bridge, with BLOBs bound as `unhex(hex)` and
numbers/enums as `CAST(? AS …)`, and ids emitted as URL-safe base64
([[guest-writes-via-sql]]). Management list cells are resolved (names, enums, relations, multi).

## Verified: guest smoke (71/71)

`trailbase/tools/guest-smoke.mjs` boots a throw-away depot with the guest component, seeds the
**same** dataset the former Node smoke used (`frontend-ssr/scripts/smoke.js`, removed 2026-09-27),
logs in **through the app's own `/login`**
(bad password → 401, good → 303 + cookies) and exercises every screen. **71/71 checks pass**,
including the pinned totals (`profit 91.00`, item sales `731.00/591.00`, stock `4510.00`, payments
`800.00/150.00`, payments-by-company `500.00/300.00`, `403.85/161.54`), the page-data payload shape
and ETag revalidation, relation/enum edit-form preselection, management create, fingerprint
refresh (`lastRefresh.changed`/`rebuilt`), the invariants (anonymous record API rejected, unknown
page/entity/route 404), and the post-write report still rendering.

The guest is served by TrailBase itself, so the app and the APIs share one origin — the smoke
points at the single port rather than a separate frontend process.

## Verified: fingerprint refresh (Phase 5)

`refresh(db)` probes each table's `count:max(updated)` fingerprint, re-reads only changed tables and
rebuilds only the affected **materialised** views; a `full` invalidate rebuilds everything so the
snapshot is ready. `/reports/status` exposes `fingerprints`, `refreshedAt` and
`lastRefresh:{changed,rebuilt}` ([[guest-fingerprint-refresh]]). The smoke asserts that after a
management write, `changed` includes `sections` and `rebuilt` includes `refs` — **67/67 pass**.

## Verified: job queue

A durable queue (`job`/`job_step`/`job_artifact`) with atomic `UPDATE … RETURNING` claims, lease
expiry recovery, bounded retries and idempotent effects runs on the guest
([[jobs-in-process-durable-queue]]). `trailbase/tools/jobs-check.mjs` passes: submit → done with
the right result, one artifact per step, and **re-dispatch after a forced lease expiry adds no
artifact**. Steps run in-process by default; the fan-out path POSTs to `/worker/1/step` over the
host's real `http.request` bridge, added by [[guest-outbound-http-and-login]] — the "fetch is a
stub" wording here predated it.

## Still to do (records honestly)

- **Management writes bypass the record APIs' validation/ACLs** — the guest writes raw SQL, so
  permissions are only the app's `req.user()` gate ([[guest-writes-via-sql]]).
- **`/p/<slug>/data`** returns the payload and ETag/304 but no gzip (no zlib in the guest);
  identity encoding is valid HTTP, so this is a size/behaviour difference, not a correctness gap.
- **Static files** are read as UTF-8 text. The current asset set is all text
  (`favicon.svg`, `css/app.css`, `js/*.js`), so nothing needs binary serving; images would need a
  bytes bridge.
- **Invoices / cash-memos / printing** are **out of scope by request** for the guest frontend
  ([[guest-frontend-feature-parity-gaps]] § 1), so they are not parity work here; the platform
  only needs to make them authorable as new pages. The job queue that would back batch work is
  now built ([[jobs-in-process-durable-queue]]).
- The **`worker` HTTP fan-out** is not built: the queue runs in-process, and the new outbound
  bridge is body-only ([[guest-outbound-http-and-login]]).
- Debug probes used during the port were removed from the dispatcher.

## Related

- [[trail-runtime-js-reference]] — the host this runs on, and its measurements.
- [[runtime-js-single-host]] — the decision to fold the app host into this component.
- [[deterministic-sort-and-sql-reads-in-guest]] — the ordering/read decision above.
- [[guest-writes-via-sql]] — the management write path.
- [[guest-fingerprint-refresh]] — the incremental data-refresh decision.
- [[guest-outbound-http-and-login]] — the login flow and the outbound HTTP bridge.
- [[reports-and-ledgers]] — the pinned report arithmetic and its inherited quirks.
