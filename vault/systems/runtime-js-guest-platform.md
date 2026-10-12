---
title: runtime-js guest platform (WebAssembly app host)
type: system
status: experimental
maturity: new
locator: trailbase/tb-ah-run-js
platform: TrailBase 0.33.22 + wasmtime guest, Rust + QuickJS (rquickjs) + minijinja
created: 2026-09-27
updated: 2026-10-12
tags: [pos, wasm, guests, runtime-js, rquickjs, quickjs, minijinja, experimental]
related_to: ["[[trailbase]]", "[[frontend]]", "[[guest-app-host-port]]", "[[trail-runtime-js-reference]]", "[[cutover-is-guest-only]]", "[[smoke-count-is-not-a-hard-coded-number]]", "[[tb-0032-manifest-first-refactor]]"]
---

# runtime-js guest platform (WebAssembly app host)

> **Rebuilt 2026-10-03.** This document had lost every newline in its body — the whole thing was one
> 7,837-character line. It has been re-split into blocks and re-wrapped. See
> [[three-reference-docs-lost-their-line-structure]].
>
> **Three claims corrected at the same time**, because the collapse had made the document hard to
> audit and all three were stale:
>
> 1. **"not wired to production; the legacy pair is still what runs the shop"** — that was
>    **correct**, and I first "corrected" it in the wrong direction. `backend/` and `frontend/` were
>    deleted from git on 2026-09-29, but the shop still runs the compiled bundle from
>    `legacyforparity/`. So this host is **not** in production. Frontmatter `status` is restored to
>    `experimental`, and the decision that fixes the *end state* is [[cutover-is-guest-only]].
> 2. **"not currently holding production data … that depot has since been reset"** — **false.**
>    `trailbase/traildepot/` holds the imported ledger: 60,245 records, `main.db` ≈ 175 MB
>    ([[reports-parity-and-e2e-2026-09-29]]).
> 3. **The pieces table listed a `trailbase/host/` directory that does not exist.** The compiled
>     engine is the three `trailbase/tb-ah-*/` crates, and the host's README is
>     `trailbase/tb-ah-run-js/README.md`. ⚠️ Task notes that say "`host/README.md`" mean that file.

**The replacement, under construction.** The whole app runs as **TrailBase guest-WASM components**
on the server's own
wasmtime, with no separate Node process. The architecture is compiled once; pages, templates and
report logic are files under an `app/` directory, read and evaluated **at runtime** — adding a report
or a page means editing files, not rebuilding a component. The intermediate Node `frontend-ssr`
experiment was removed on 2026-09-27 ([[guest-ui-is-a-direct-shift-of-legacy]]).

The parity target is **functional equality with the legacy UI**: every capability it has, this host
serves, laid out however it does that job better
([[parity-is-functional-not-visual]], [[tb-0023-guest-feature-parity]]) — and the legacy UI **no longer
has source**, so there is nothing to port *from*. Its capabilities have to be read off the captured
screens in [[legacy-ui-reference-captures]] and the frozen bundle's rendered pages. ⚠️ **Revised
2026-10-05**: this paragraph previously read *"a direct shift of the legacy UI onto this host, same
look"*, and that visual half was **withdrawn** — a byte-faithful copy was reproducing the legacy's own
defects (a column headed `BOX_SIZE_QTY`, report tables with no `<th>` at all) and refusing the
improvements the operator asked for.

## The pieces

| Directory | What it is |
|---|---|
| `trailbase/` | The **source of truth**: `config.textproto`, `metadata.textproto`, `migrations/`, `runtime/`, `tb-ah-*/`, `tools/`, and the `.bat` drivers |
| `trailbase/tb-ah-run-js/` | The **compiled engine**: the Rust guest crate `tb_ah_run_js` — `trailbase-wasm` SDK + `rquickjs` (QuickJS) + `minijinja`, built for `wasm32-wasip2` into a single `*.wasm`. Changing it needs `build.bat`. Its README is `tb-ah-run-js/README.md` |
| `trailbase/tb-ah-render-jinja/` | minijinja as its own component, behind the `aa_render` envelope |
| `trailbase/tb-ah-query-tbdb/` | data acquisition (experimental, exists to be measured) |
| `trailbase/runtime/` | The **editable application**: `ahscripts/routes/` (`_app/route.ts`, the dispatcher, and `mode/route.ts`) and `app/` (views, pages, compute, lib, plugins, public, and the report SQL under `app/reports/sql/`). Read at request time — no rebuild |
| `trailbase/tools/` | The verification harnesses (`guest-smoke.mjs`, `route-snapshot.mjs`, …; `view-equivalence.mjs` was deleted 2026-10-02 with the legacy view layer) |
| `trailbase/traildepot/` | **Generated** by `clear_db.bat` + `build.bat`: source copies + `wasm/*.wasm` + `data/` |
| `guests/` | **Deleted 2026-09-28.** The throw-away **Phase 0 spike** guest (TS + Vite + `jco componentize`) that proved the platform's assumptions — S1–S8 ([[trailbase-guest-wasm-spike-results]]). Nothing loaded it once the host crate shipped, so the tree was removed; the spike findings survive in that note and in the [[trailbase-guest-aot-startup-cost]] / [[trailbase-guest-cpu-js-limits]] issues |

The host is adapted from, and documented in, [[trail-runtime-js-reference]]; the runtime defaults it
settled are in [[trailbase-guest-wasm-runtime-defaults]] and [[runtime-js-single-host]].

## How it works

- **Routing**: one generic file route. `trailbase/tb-ah-run-js/src/lib.rs` resolves
  `ahscripts/routes/<path>/route.*` and, when no route folder matches, falls back to
  `ahscripts/routes/_app/route.ts` — a single dispatcher that implements the whole URL space
  (dynamic paths included). ⚠️ **There is no `{param}` matching and no `[...path]` fallback in the
  host today** — both are added by [[tb-0030-retire-the-route-ts-dispatcher]], and until then the
  dispatcher is what makes dynamic routes work.
- **Business logic** is runtime JS/TS: `app/compute/*.js` is the **same** `compute/` code the Node
  app ran, and `app/lib/*.js` are the guest ports of the Node `src/lib`. The dispatcher loads modules
  itself through an ESM→CJS shim ([[guest-app-host-port]]).
- **Rendering** is Rust `minijinja` folded into the host: scripts call `render.html(name, ctxJson)` /
  `render.string`, with templates under `app/views` (named `*.html.jinja` —
  [[jinja-templates-use-html-jinja-extension]]) and the ten `compute/format.js` filters ported
  ([[report-logic-stays-runtime-file-based]]).
- **Data**: base tables are read **directly from the depot's SQLite** (order-sensitive:
  `ORDER BY id DESC`, engine-independent `compareText` sorting —
  [[deterministic-sort-and-sql-reads-in-guest]]). The legacy report SQL ran as a switchable SQL path
  (`USE_SQL_VIEWS`); that flag and the `.sql` files it loaded were deleted 2026-10-02
  ([[legacy-parity-checks-waived]]). Report SQL is now unconditional via `prelude.sql`, and the
  JavaScript view builders are being retired ([[tb-0032-manifest-first-refactor]],
  [[convert-base-views-not-derivations]]).
- **Writes**: direct SQL through a `db.execute` bridge, with BLOBs bound as `unhex(hex)` and numbers
  as `CAST(? AS REAL)` ([[guest-writes-via-sql]]).
- **Auth**: TrailBase's own cookie / `req.user()`, not a second session layer; the app's `/login`
  exchanges credentials via the JSON auth API and sets the cookies
  ([[guest-outbound-http-and-login]]).
- **Jobs**: a durable, leased, idempotent SQLite queue with a minute poller and opt-in worker fan-out
  ([[jobs-in-process-durable-queue]]).

## Running it

From `trailbase/`:

```powershell
clear_db.bat     # reset traildepot\ from the sources (WIPES the database)
build.bat        # cargo build wasm32-wasip2 + copy into traildepot\wasm\
RUN.BAT          # trail run --runtime-root-fs=traildepot\runtime
```

`--runtime-root-fs=traildepot/runtime` is load-bearing: it is the WASI sandbox root, so the
frontend's `app/` and `ahscripts/` must live under it. Keeping it a subdirectory (not the depot root)
keeps the depot's `data/` and `secrets/` out of the sandbox. `RUN.BAT` runs `clear_db.bat` and
`build.bat` automatically when the depot is not prepared, **and** re-syncs `runtime/` and
`migrations/` on every start.

⚠️ **`clear_db.bat` destroys the 60,245 imported records.** To push an app edit to a prepared depot,
`robocopy /MIR` the source across and restart instead. Full build/deploy/verify commands are in
[[build-and-run]]; ports and scratch depots in [[environment]].

## What it can do today

All of the Node app's surfaces run on the guest and match it. The adapted smoke suite passes in full
on the same seed and pinned totals — **see [[smoke-count-is-not-a-hard-coded-number]]** for the
current figure rather than a number quoted here — and `verify-spool-reports.mjs` matches **14/14**
report/ledger pages with 72 binds ([[guest-app-host-port]]).

Management CRUD, the KV report cache, fingerprint refresh, jobs and the app's own login work. The
invoice cycle is built and verified: entry for sale and purchase, the cash-memo module (vouchers, DA
entry, expenses), the print queue (the legacy picker + browser-local queue,
[[print-queue-is-browser-local-like-legacy]]), inventory and payments
([[tb-0021-invoices-cashmemos-printing]], [[tb-0028-guest-transactional-screens-and-mobile]]).

⚠️ **The 14/14 report differential can no longer be re-run against the legacy app** — the legacy
frontend's source is gone ([[guest-parity-differential-not-reproducible]]). `verify-spool-reports.mjs`
is now a **self-consistency** gate: a total is EXACT, SOUND or CORROBORATED, not "matches the old
implementation" ([[legacy-parity-checks-waived]]).

## Known limitations (measured, not assumed)

- **~20 s call deadline** and an interpreter-only JS engine (~1×10⁶ loop iterations/s): a long
  synchronous handler fails. On production-sized data `profit`, `itemsales` and `paymentsbycompany`
  **returned 500 at the deadline**, and stay ~20 s cold even at 1,000 rendered rows, because the cost
  is the JS pass over every row rather than the render
  ([[trailbase-guest-cpu-js-limits]], [[guest-vs-node-performance]],
  [[new-system-report-timings]], [[snapshot-persistence-hits-the-20s-deadline]]).
- Guest latency is multiples of Node's (~20–30 ms baseline vs ~3–7 ms). The 9–18 ms figure in
  `notes/trail-runtime-js-reference.md` is pre-cache and pre-dispatcher, and does not apply.
- **Do not pass `--aot`**: it doubles size and is 2.3× slower to cold-load
  ([[trailbase-guest-aot-startup-cost]]).
- TrailBase **subscriptions return 403**, so realtime push is unavailable; the app polls
  ([[trailbase-subscribe-endpoint-forbidden]]).
- The host's own `ahscripts/jobs` discovery does not run job files; the poller calls the reconcile
  route directly ([[trailbase-runtime-js-scheduler-not-running-jobs]]).
- **`setTimeout` blocks and `setInterval` is absent**
  ([[trailbase-host-settimeout-blocks-and-no-setinterval]]).
- A dropped streaming request can panic the host bridge (`wstd` connection reset).
- **Module state is per runtime thread.** Anything that other threads must see — a cache invalidation, a
  freshness signal — has to go through the shared KV store, or it only reaches the thread that wrote it.
  A per-thread memo of the data fingerprint made a read after a write serve the pre-write page about one
  run in five; fixed 2026-10-05 with a KV stamp
  ([[fingerprint-memo-is-per-thread-so-a-read-after-a-write-can-be-stale]]).
- SQLite errors and the DB bridge surface opaque errors unless the bridge logs them
  ([[guest-db-bridge-text-params-only]], [[trailbase-guest-error-string-opaque]]).

## Related

- [[guest-app-host-port]] — the port itself and what is verified.
- [[trail-runtime-js-reference]] — the adopted host and its measurements.
- [[cutover-is-guest-only]] — why this system is the end state, and why that does not make it
  production today.
- [[parity-is-functional-not-visual]] — the current mandate (functional parity, visual freedom), and [[guest-ui-is-a-direct-shift-of-legacy]] — the withdrawn visual one, kept on record.
- [[build-and-run]] / [[environment]] — how to start it.