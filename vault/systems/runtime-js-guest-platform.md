---
title: runtime-js guest platform (WebAssembly app host)
type: system
status: experimental
maturity: new
locator: runtime-js/, guests/, runtime-js/site/
runtime: TrailBase 0.33.22 + wasmtime guest, Rust + QuickJS (rquickjs) + minijinja
created: 2026-09-27
tags: [pos, wasm, guests, runtime-js, rquickjs, quickjs, minijinja, experimental]
related_to: ["[[trailbase]]", "[[frontend-ssr]]", "[[guest-app-host-port]]", "[[trail-runtime-js-reference]]", "[[trailbase-guest-wasm-runtime-defaults]]"]
---

# runtime-js guest platform (WebAssembly app host)

**New / experimental.** A second way to serve the new frontend: instead of a Node process
([[frontend-ssr]]), the whole app runs as **TrailBase guest-WASM components** on the server's own
wasmtime. The architecture is compiled once; pages, templates and report logic are files under an
`app/` directory, read and evaluated **at runtime** — adding a report or a page means editing files,
not rebuilding a component.

It is the implementation of the wasm app-platform plan and is **not wired to production**; the
legacy pair ([[backend]] + [[frontend]]) is still what runs the shop.

## The pieces

| Directory | What it is |
|---|---|
| `runtime-js/` | The Rust host crate: `trailbase-wasm` SDK + `rquickjs` (QuickJS) + `minijinja`, built for `wasm32-wasip2` into a single `*.wasm` |
| `runtime-js/site/` | The deployable app: `ahscripts/routes/_app/route.ts` (the dispatcher) and `app/` (views, pages, compute, lib, the report SQL) |
| `guests/` | The throw-away **Phase 0 spike** guest (TS + Vite + `jco componentize`) that proved the platform's assumptions — S1–S8 ([[trailbase-guest-wasm-spike-results]]) |

The host is adapted from, and documented in, [[trail-runtime-js-reference]]; the runtime defaults it
settled are in [[trailbase-guest-wasm-runtime-defaults]] and [[runtime-js-single-host]].

## How it works

- **Routing**: one generic file route. `runtime-js/src/lib.rs` resolves `ahscripts/routes/<path>/route.*`
  and, when no route folder matches, falls back to `ahscripts/routes/_app/route.ts` — a single
  dispatcher that implements the whole URL space (dynamic paths included).
- **Business logic** is runtime JS/TS: `app/compute/*.js` is the **same** `compute/` code the Node app
  runs, and `app/lib/*.js` are the guest ports of the Node `src/lib`. The dispatcher loads modules
  itself through an ESM→CJS shim ([[guest-app-host-port]]).
- **Rendering** is Rust `minijinja` folded into the host: scripts call `render.html(name, ctxJson)` /
  `render.string`, with templates under `app/views` and the ten `compute/format.js` filters ported
  ([[report-logic-stays-runtime-file-based]]).
- **Data**: base tables are read **directly from the depot's SQLite** (order-sensitive: `ORDER BY id
  DESC`, engine-independent `compareText` sorting — [[deterministic-sort-and-sql-reads-in-guest]]),
  and the legacy report SQL is available as a switchable SQL path
  ([[convert-base-views-not-derivations]]).
- **Writes**: direct SQL through a `db.execute` bridge, with BLOBs bound as `unhex(hex)` and numbers
  as `CAST(? AS REAL)` ([[guest-writes-via-sql]]).
- **Auth**: TrailBase's own cookie/`req.user()`, not a second session layer; the app's `/login`
  exchanges credentials via the JSON auth API and sets the cookies
  ([[guest-outbound-http-and-login]]).
- **Jobs**: a durable, leased, idempotent SQLite queue with a minute poller and opt-in worker
  fan-out ([[jobs-in-process-durable-queue]]).

## Running it

```powershell
# build the host
cd runtime-js; cargo build --target wasm32-wasip2 --release
# deploy into a depot's wasm/ dir and run (the guest is served by TrailBase itself)
trail --depot=<depot> run --address=127.0.0.1:4003 --runtime-root-fs=runtime-js/site
```

`--runtime-root-fs` is load-bearing: it is the WASI sandbox root, so the `app/` directory must live
under it. Full build/deploy/verify commands are in [[build-and-run]]; ports and scratch depots in
[[environment]].

## What it can do today

All four of the Node app's surfaces run on the guest and match it: the adapted smoke suite passes
**71/71** on the same seed and pinned totals, and the differential matches **14/14** report/ledger
pages on real data ([[guest-app-host-port]]). Management CRUD, the KV report cache, fingerprint
refresh, jobs, and the app's own login work. A first **invoice-entry slice** (context endpoint,
server-side numbering, edit lease, idempotent create/lines, complete) is built and verified
([[tb-0021-invoices-cashmemos-printing]]).

## Known limitations (measured, not assumed)

- **~20 s call deadline** and an interpreter-only JS engine (~1×10⁶ loop iterations/s): a long
  synchronous handler fails, and a cold report build on production-sized data came within 1.3 s of
  the cliff ([[trailbase-guest-cpu-js-limits]], [[guest-vs-node-performance]]).
- Guest latency is multiples of Node's (~20–30 ms baseline vs ~3–7 ms).
- **Do not pass `--aot`**: it doubles size and is 2.3× slower to cold-load
  ([[trailbase-guest-aot-startup-cost]]).
- TrailBase **subscriptions return 403**, so realtime push is unavailable; the app polls
  ([[trailbase-subscribe-endpoint-forbidden]]).
- The host's own `ahscripts/jobs` discovery does not run job files; the poller calls the reconcile
  route directly ([[trailbase-runtime-js-scheduler-not-running-jobs]]).
- A dropped streaming request can panic the host bridge (`wstd` connection reset).
- SQLite errors and the DB bridge surface opaque errors unless the bridge logs them
  ([[guest-db-bridge-text-params-only]], [[trailbase-guest-error-string-opaque]]).

## Status

Experimental and verified against a throw-away depot, not production. It supersedes parts of
[[trailbase-migration]]'s plan for the app host; the report arithmetic, jobs, money handling and the
invoice design all have their own decisions recorded in this vault.

## Related

- [[guest-app-host-port]] — the port itself and what is verified.
- [[trail-runtime-js-reference]] — the adopted host and its measurements.
- [[frontend-ssr]] — the Node app it replaces.
- [[build-and-run]] / [[environment]] — how to start it.
