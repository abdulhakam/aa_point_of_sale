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
      equal after stripping raw ids) — `trailbase/tools/guest-parity.mjs`
- [x] Management writes: create/update/delete + link-table sync + `invalidate()`
      (`db.execute` bridge, `unhex(hex)` for BLOBs, `CAST` for numbers — [[guest-writes-via-sql]])
- [x] Management list cells (resolve/relations/enums/multi) — `trailbase/tools/management-check.mjs`
- [x] Login flow: the app's own `/login` POST — exchanges credentials via TrailBase's JSON login
      and sets the auth cookies ([[guest-outbound-http-and-login]]); bad password → 401
- [--] `/p/<slug>/data` gzip; binary static assets (current assets are all text) — **SKIPPED by the
      operator 2026-10-06.** *binary static assets:* **DONE** — the guest `routeKit.readStatic` falls
      back to `application/octet-stream` via `manifests.contentTypes()`, so a binary asset is served
      correctly (all shipped assets happen to be text). *gzip:* dropped, not built — gzip must happen in
      the HOST (QuickJS has no compressor), and **no compression crate is in the offline lock**
      (`flate2` / `miniz_oxide` / `zlib` are **0 of 236** crates; the build is `cargo build --offline`),
      so it was blocked offline and the operator chose to skip it. If it is ever wanted, the opt-in
      per-request design is: the guest marks the response (a `gzip: true` field or an `x-compress`
      header), the host compresses only when the marker is present AND the client's `accept-encoding`
      includes gzip, and a per-report manifest flag decides which reports ask.
- [ ] Record-API ACL/validation parity for writes (the guest writes raw SQL)
      **AUDITED 2026-10-06 — this is a deliberate divergence, not a bug.** Writes go through
      `routeKit.write` → `sqlite.execute`, guarded by a SQL **blocklist** (`api/sqlite.rs` `FORBIDDEN`:
      DROP/ATTACH/DETACH/PRAGMA/VACUUM/REINDEX) and by `management.missingRequired` field validation.
      There is **no per-table record-API ACL**, because the guest's own auth gate (`routeKit.userOf` +
      `loginRedirect` in every route folder) already gates every authenticated route. Record it as a
      divergence if that matters to a reviewer; do not call it parity.
- [--] Invoices / cash-memos / printing — **SUPERSEDED 2026-10-06.** Was "out of scope by request" for
      the former Node frontend; those surfaces are now **built** on the guest
      ([[tb-0021-invoices-cashmemos-printing]], [[tb-0028-guest-transactional-screens-and-mobile]],
      [[guest-invoice-lifecycle]]) — invoice entry, the spreadsheet grid, the standalone document, and
      cash-memo/printing.
- [x] Jobs + worker queue — durable in-process queue done ([[jobs-in-process-durable-queue]]); **the HTTP
      worker fan-out is ALSO built** (AUDITED 2026-10-06 — `app/lib/queue.js` posts `${origin}/worker/1/step`
      across `concurrency` workers, `routeKit.jobsReconcile` passes `{origin, concurrency}`, and
      `api/fetch.rs` provides the response-with-headers client it needs). The old "HTTP worker fan-out not
      built" note was **stale**.
- [x] Adapt the smoke suite to drive the guest (55/55 and pinned totals) —
      `trailbase/tools/guest-smoke.mjs`, **112/112** today (was 71 when this box was ticked; the suite
      grew with the route-folder and preset work — it now covers the host poller, the static mounts, the
      auth gate and the manifest presets).

## Related

- [[guest-app-host-port]] — what is done and what is not.
- [[trail-runtime-js-reference]] — the host and its measurements.
