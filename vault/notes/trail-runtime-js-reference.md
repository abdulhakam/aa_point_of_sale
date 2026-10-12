---
title: tb_ah_run_js — a Rust guest that runs dynamic TS/JS in TrailBase
type: note
status: active
created: 2026-09-26
tags: [trailbase, wasm, guests, rquickjs, quickjs, reference, runtime]
related_to: ["[[trailbase-guest-wasm-spike-results]]", "[[trailbase-guest-wasm-runtime-defaults]]", "[[trailbase-migration]]"]
---

# tb_ah_run_js — a Rust guest that runs dynamic TS/JS in TrailBase

An existing project (`github.com/abdulhakam/tb_ah_run_js`, the user's only Rust project)
already implements the plan's D2/D4 premise with a different engine, and is the obvious basis for
the runtime-JS part of the guest platform. This note records what it is and how it maps onto
[[trailbase-guest-wasm-runtime-defaults]], so a future session does not re-derive it.

## What it is

A **Rust guest component** (`tb_ah_run_js`, cdylib → `wasm32-wasip2`) that embeds
**QuickJS** via `rquickjs` and executes `.ts`/`.js` files **at runtime, with no rebuild**:

```text
client ─▶ TrailBase ─▶ Rust guest (wasm) ─▶ rquickjs (QuickJS) ─▶ TS/JS handler
                                   │                    │
                                   └── db / sqlite / kv / fs / time bridge
```

- Engine: `rquickjs 0.11` (`AsyncRuntime`/`AsyncContext`, `futures` feature); a **persistent
  JS context** is held in a thread-local (`JsState`) so it is not rebuilt per request.
- TS: `swc_core 54` strips types at runtime (`ts_transform.rs`); `.ts` and `.js` both work.
- Host SDK: the official `trailbase-wasm` Rust crate (not hand-rolled WIT).
- Build: `cargo build --target wasm32-wasip2 --release`; deploy = copy the `.wasm` into
  `<depot>/wasm/`; `run.ps1` hot-reloads by copying and restarting.

## The authoring model

Scripts live in `ahscripts/` inside the runtime FS root:

| Directory | Meaning |
|---|---|
| `ahscripts/routes/<path>/route.ts` | URL `/path` → the handler; exports `GET`/`POST`/`PATCH`/`DELETE` async functions returning JSON |
| `ahscripts/init/*.ts` | run once per server start (guarded by a `server_start_time` KV marker) |
| `ahscripts/jobs/*.ts` | run by a `Job::minutely("ahscripts_scheduler")` dispatcher |

A request to `/{*wildcard}` resolves to `/ahscripts/routes/<path>/route.js|ts`, transpiles it,
wraps it in an async IIFE that calls the method-named export, and JSON-serializes the result.

## The JS capability surface (in `api/`)

| Global | Ops |
|---|---|
| `trailbase.query`, `db.query` | `query(sql, params[])` → rows as JSON |
| `db.execute` | a real `trailbase_wasm::db::execute`; **parameters are still text-only** (see gaps) |
| `sqlite` | `execute`, `run`, `get`, `all` |
| `kv` | `get`, `set`, `delete` |
| `fs` | `readFile`, `writeFile`, `exists`, `readdir` |
| `time` | `sleep`, `setTimeout` |
| `console` | `log`/`warn`/`error`/`info`, captured to a `ScriptReport` |
| `fetch` | a real bridge: `http.postJson` and `http.request` on `wstd` + the SDK client (see gaps) |

Parameter binding is text-only: JS params are mapped to `Value::Text`.

## How it maps onto the plan

- **D2 (runtime-evaluated business JS): already built.** No `eval`-in-StarlingMonkey needed, and
  QuickJS is a much faster engine than the ~1×10⁶ iter/s measured for the `jco`/StarlingMonkey
  guest ([[trailbase-guest-cpu-js-limits]]). It also supports TypeScript directly.
- **D4 (`app/` on the filesystem): same idea.** It reads scripts from the runtime FS root; run it
  with `--runtime-root-fs <depot>` and the route/init/job directories are ordinary files.
- **D5 (jobs): a precedent.** It has a `minutely` scheduler and a `jobs/` directory.
- It uses only TrailBase's own `trailbase-wasm` world, so D6 holds.

## Gaps to close before it can carry the app — as assessed 2026-09-26

> **Four of the six are now closed.** This list is the upstream assessment, kept as the record of
> what was believed on 2026-09-26. Current state: **closed** — 1 (`fetch` is a real bridge,
> [[guest-outbound-http-and-login]]), 2 (`{html}` / `{text}` / `{body, contentType}` /
> `{redirect}` response shapes, `host/src/lib.rs:262-310`), 3 in part (`db.execute` is a real
> `trailbase_wasm::db::execute`; the text-only params remain,
> [[guest-db-bridge-text-params-only]]), 5 (minijinja folded into this host,
> [[runtime-js-single-host]]), 6 (cached by content hash, [[dispatcher-transpiled-per-request]]).
> **Still open** — 4, plus `init`/`jobs` discovery (which turned out to be worse than "a discovery
> bug": the whole module is uncalled, [[trailbase-host-jobs-module-never-called]]).

1. **`fetch` is a stub (501).** Our spike proved a guest *can* reach the network/self
   ([[trailbase-guest-wasm-spike-results]] § S6); the Rust side needs an outgoing-HTTP bridge
   (either the SDK's client, or a WASI `wasi:http/outgoing-handler` call). Needed for job fan-out.
2. **Responses are JSON only.** The app needs HTML (`render`, D3) and static files; the route
   contract must grow a response shape (status/headers/body, not just a JSON value).
3. **`db.execute` is aliased to `query`**, and parameters are text-only — no typed params, no
   `UPDATE … RETURNING` ergonomics. Our S7 spike shows the underlying SDK supports transactions
   and `RETURNING`; the bridge should expose them (and read errors from `err.payload`,
   [[trailbase-guest-error-string-opaque]]).
4. **Concurrency model.** One thread-local context per runtime instance pairs with
   `--runtime-threads`; whether two requests share a context, and how `SendWrapper`'s `unsafe`
   bridge behaves under load, needs a spike in our depot. **Still unanswered** — and it now
   matters more, because the thread-local snapshot is implicated in
   [[snapshot-persistence-hits-the-20s-deadline]].
5. **No `minijinja`/template rendering** — D3 remains to be built, likely as a Rust module in the
   same host or a sibling `render` crate.
6. **TS transform per request** (swc on every request) — measure; cache by mtime if it matters.

## Build / run (as documented by the project)

```powershell
cargo build --target wasm32-wasip2 --release
# deploy tb_ah_run_js/target/wasm32-wasip2/release/tb_ah_run_js.wasm -> traildepot/wasm/
trail run --dev --runtime-root-fs traildepot --demo --stderr-logging --public-dir traildepot/public
```

## Status here

**Adopted into this repo at `trailbase/tb-ah-run-js/`** (Rust crate, `trailbase-wasm 0.6.1`, README +
`.gitignore` added, upstream attribution noted). It was first taken in at `trailbase/src/host/` and
moved up a level by [[trailbase-flat-source-layout]] on 2026-09-28. It builds clean there
(`trailbase/tb-ah-run-js/target/wasm32-wasip2/release/tb_ah_run_js.wasm`).

**Component size, stated once, with its history.** The upstream build is **5,875,367 B (5.88 MB)**;
this repo's component is **7,187,264 B (7.17 MB)** after minijinja and the render bridge were added
([[runtime-js-single-host]]). The 5,875,367 figure is the *upstream* measurement and is not the
current size of anything we ship — earlier revisions of this note presented it as ours, which was
wrong. Licensing is still unresolved: [[trailbase-host-upstream-crate-license-unresolved]].

**Builds and runs against our stack.** The reference pins `trailbase-wasm 0.5.0`, which exports
the `trailbase:component@0.1.0` world and is rejected by `trail v0.33.22`:

```text
Error: ScriptError("Wasmtime: no exported instance named `trailbase:component/init-endpoint@0.2.0`")
```

Bumping the dependency to `trailbase-wasm 0.6.1` (world `@0.2.0`) fixes it with **no source
changes** — the crate compiled clean (one pre-existing dead-code warning) after only the version
edit. It then loaded and served on `trail v0.33.22`.

### Measured here (2026-09-26, on the 5.88 MB upstream-sized component)

> **All figures in this block are pre-minijinja and pre-app-host.** The shipped component is
> ~22% larger (7.17 MB) and runs a ~15 KB dispatcher instead of the self-test routes, so treat
> these as order-of-magnitude, not as current. `notes/guest-vs-node-performance.md` records the
> later range as **2.4–9.7 s** cold for the same component — one run vs many, which is why the two
> numbers disagree. Re-measure before quoting either.

- **Component loads far faster than the JS guest:** `Loaded component … in: 2.42 s` cold and
  `0.37 s` warm, versus 39.7 s / 0.61 s for the 16 MB StarlingMonkey `jco` component. The 5.9 MB
  Rust component has no JS engine to JIT at load.
- `traildepot/ahscripts/routes/features/route.ts` → `GET /features` ran the project's own
  self-test: **Console, Time (`sleep`+`setTimeout`), KV, FS, SQLite all PASS** (Time 72 ms,
  SQLite 3 ms). This is TypeScript transpiled by `swc` at runtime, executed in QuickJS.
- Adding `traildepot/ahscripts/routes/bench/route.ts` took effect **with no guest rebuild** —
  the route file is read per request.
- **Per-request overhead is ~9–18 ms server-side** (`latency_ms` from TrailBase's own access log):
  `/bench?n=0` 18 ms, `n=1` 8.7 ms. (An earlier 106–144 ms figure was wall-clock and included
  curl process startup; the server-side number is the real one, and it covers `swc` transpile +
  QuickJS eval.) `/features` measured 125 ms because it does SQLite/FS/KV work.
  **Superseded for the shipped app:** this was measured on the upstream self-test/bench routes
  *before* the transpile cache and *before* the ~15 KB dispatcher existed. For the real app the
  later measurement is **~20–30 ms** baseline
  (`systems/runtime-js-guest-platform.md`, `notes/guest-vs-node-performance.md`).
- Engine comparison on the same workload as Phase 0's `/spike/busy`:

  | Engine | Workload | Time |
  |---|---|---|
  | StarlingMonkey (`jco` guest) | `n=3,000,000` int loop | 3004 ms |
  | QuickJS (`rquickjs` host) | `n=3,000,000` int loop | 2777 ms |

  So QuickJS is only ~1.1× faster on raw CPU — **not** a step change. Both are interpreter-only
  in wasm and both hit the same ~20 s host deadline (`n=20,000,000` → `component responded
  unexpectedly` on both).

### Gaps found here

- **`init`/`jobs` handle `.js` only.** `collect_scripts`/`collect_jobs` filter
  `extension == "js"`, so the project's own `.ts` sample init/job files are silently skipped.
  `init` also runs from `ensure_global_init`, called by the **minutely job** (`jobs.rs`), not at
  server startup — so init scripts do not run until the first scheduler tick.
- **Client disconnect panics the host bridge.** When a long request is cut off at the 20 s
  deadline, `wstd` logs `panicked … I/O error while writing the body: Kind(ConnectionReset)`.
  Worth hardening before this serves real traffic.

**Conclusion:** the win here is the *authoring model and capability set* (TypeScript, file
routing, persistent context, `init`/`jobs`, a `db`/`sqlite`/`kv`/`fs`/`time` bridge, and now
`fetch`/`Html`/`auth` in the 0.6.x SDK), plus a much smaller and faster-loading component — not
raw execution speed. Both engines must avoid long synchronous handlers.

## Rendering (D3) added here

`minijinja` was folded into the `runtime-js` host as a native bridge (Rust side:
`trailbase/tb-ah-run-js/src/render.rs`), exposed to scripts as `render.html(name, ctxJson)` /
`render.string(source, ctxJson)`. Templates come from `/app/views` (falling back to `/app/pages`),
names resolve views-root-relative exactly as the former Node frontend's render module
(`frontend-ssr/src/lib/render.js`, removed 2026-09-27) did, and the ten custom filters are ported
(`money`, `num`, `round`, `qty`, `date`, `datefmt`, `upper`, `lower`, `json`, `yesno`) with a
**deliberately uncached** loader — templates are re-read and `clear_templates()` is called per
render, because WASI mtime is unusable and minijinja caches compiled templates
([[trailbase-guest-template-cache-wasi-mtime]]). There is **no** mtime cache. A route may return
`{ html: "..." }` and the host answers `text/html`.

Verified end-to-end on `trail v0.33.22`:

```text
GET /page -> 200  content-type: text/html; charset=utf-8
  <title>AA Point of Sale</title>            (appName global)
  Total: 1234.50                             (money)
  Qty: 1 ctn 1 unit                          (qty(box))
  Date: 24-Sep-2026                          (datefmt)
  Upper: PROFIT REPORT                       (upper)
  Yes: Yes                                   (yesno)
  <li>Widget &mdash; 9.50</li>               (loop + money)
```

**Parity harness.** The former Node frontend's `scripts/render-parity.mjs` (removed 2026-09-27)
rendered all 34 `views/`+`pages/` templates (now `trailbase/runtime/ahscripts/views/` and
`trailbase/runtime/ahscripts/pages/`) and the ten filters through both `minijinja-js` (Node) and the Rust
renderer, and diffed them. Result: **34/34 templates byte-identical** (CRLF, doctype case,
`{% extends %}`/`{% include %}`/`{% import %}`, macros, loops, conditionals); filters **9/10
identical**. The one divergence is `json`: `minijinja-js` serializes ctx objects as `{}` (its
documented proxy bug, which is why the app pre-serializes `metaJson` as a string), while Rust
serializes correctly — a divergence in Rust's favour. The harness itself is no longer in the tree;
its recorded result stands.

**Live template reload** verified (edit a template → new HTML; revert → old) after fixing a
stale-cache defect: neither WASI file mtime nor `minijinja`'s template cache could invalidate, so
the renderer now clears templates each render ([[trailbase-guest-template-cache-wasi-mtime]]).

This settles the plan's D3 by **amending it**: rendering is a Rust `minijinja` module inside the
`runtime-js` host, not a separate `render` component talking HTTP
([[runtime-js-single-host]]). A separate component can be extracted later if another language
needs it. Component size grew from 5.88 MB to 7.17 MB when minijinja was added.

## Related

- [[trailbase-guest-wasm-spike-results]] — the engine-level measurements this improves on.
- [[trailbase-guest-wasm-runtime-defaults]] — the architecture this would amend (D2/D3).
- [[tb-0017-adopt-trail-runtime-js]] — the task to evaluate and fold it in.
