---
title: TB-0018 Port the app host onto the runtime-js guest
type: task
status: doing
priority: high
created: 2026-09-26
tags: [trailbase, wasm, rquickjs, app-host, reports, phase-3, phase-4]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[guest-app-host-port]]", "[[deterministic-sort-and-sql-reads-in-guest]]", "[[runtime-js-single-host]]"]
---

# TB-0018 Port the app host onto the runtime-js guest

Serve the app surfaces the former Node frontend (`frontend-ssr`, removed 2026-09-27) ran, from
the `runtime-js` guest: the declarative page host, the
report/ledger engine, management, dashboard and plugins, with the shared `compute/` modules
running in QuickJS and results identical to the Node app.

## Why

Phase 0 proved the platform's premises and `runtime-js` runs dynamic TS
([[trail-runtime-js-reference]], [[runtime-js-single-host]]). This task makes the guest serve the
actual application, so the report engine can be verified against the Node app on real data. See
[[guest-app-host-port]] for the architecture and measurements.

## Subtasks

- [x] Host: dispatcher fallback, `user`/`query`/headers in the JS request, response shapes
      (`html`/`redirect`/`text`/`body+contentType+headers`)
- [x] Dispatcher: IIFE + `globalThis` entry points (avoids per-request redeclaration)
- [x] Dispatcher: ESM→CJS module loader with a persistent module cache
- [x] Guest ports of `src/lib`: `data`, `pages`, `plugins`, `http`, `report-pages`, `reports`
- [x] Direct SQL reads with `ORDER BY "id" DESC` (matches the record API's default order)
- [x] Lazy view-closure builds; O(n log n) `buildLedgerParty`; `compareText` for engine-independent
      sorting ([[deterministic-sort-and-sql-reads-in-guest]])
- [x] Routes: `/healthz`, `/login`+`/logout`, `/`, `/dashboard`, `/reports`,
      `/reports/{status,refresh,ledgers,<key>}`, `/management[/<entity>]`, `/plugins`,
      `/static/*`, `/compute/*`, `/p`, `/p/<slug>`, `/p/<slug>/data`
- [x] Differential harness: **14/14 report/ledger pages match the Node app** (totals exact, rows
      equal after stripping raw ids) — `runtime-js/tools/guest-parity.mjs`
- [x] Management writes: create/update/delete + link-table sync + `invalidate()`
      (`db.execute` bridge, `unhex(hex)` for BLOBs, `CAST` for numbers — [[guest-writes-via-sql]])
- [x] Management list cells (resolve/relations/enums/multi) — `runtime-js/tools/management-check.mjs`
- [x] Login flow: the app's own `/login` POST — exchanges credentials via TrailBase's JSON login
      and sets the auth cookies ([[guest-outbound-http-and-login]]); bad password → 401
- [ ] `/p/<slug>/data` gzip; binary static assets (current assets are all text)
- [ ] Record-API ACL/validation parity for writes (the guest writes raw SQL)
- [ ] Invoices / cash-memos / printing — **out of scope by request** for the former Node
      frontend (`frontend-ssr`, removed 2026-09-27)
      ([[guest-frontend-feature-parity-gaps]]), so not parity work for this port; the platform
      only makes them authorable as new pages
- [x] Jobs + worker queue — durable in-process queue done ([[jobs-in-process-durable-queue]]);
      HTTP worker fan-out not built
- [x] Adapt the smoke suite to drive the guest (55/55 and pinned totals) —
      `runtime-js/tools/guest-smoke.mjs`, **69/69 checks pass** (guest is on TrailBase's own port)

## Related

- [[guest-app-host-port]] — what is done and what is not.
- [[trail-runtime-js-reference]] — the host and its measurements.
