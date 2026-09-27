# runtime-js

A TrailBase **guest-WASM component** (Rust, `wasm32-wasip2`) that embeds **QuickJS** and executes
**TypeScript/JavaScript at runtime, without rebuilding the component**. It is the runtime-JS
engine for the wasm app platform (`vault/notes/trailbase-guest-wasm-spike-results.md`,
`vault/decisions/trailbase-guest-wasm-runtime-defaults.md`).

- Base: `github.com/abdulhakam/trail_runtime_js` (adopted as a starting point; see *Provenance*).
- Host SDK: `trailbase-wasm 0.6.1` (world `trailbase:component@0.2.0`, matching `trail v0.33.22`).
- Engine: `rquickjs 0.11` (QuickJS, async). TS transpile: `swc_core 54`.

## What it does

Scripts live under the runtime-FS root in `ahscripts/`:

| Path | Role |
|---|---|
| `ahscripts/routes/<path>/route.ts` | `/path` HTTP handler; exports `GET`/`POST`/`PATCH`/`DELETE` (async) returning JSON |
| `ahscripts/init/*.ts` | run once per server start |
| `ahscripts/jobs/*.ts` | run by the `minutely` scheduler |

Globals exposed to scripts: `trailbase.query`, `db.query`/`execute`, `sqlite.execute/run/get/all`,
`kv.get/set/delete`, `fs.readFile/writeFile/exists/readdir`, `time.sleep`, `setTimeout`,
`console.*`, and `render.html(name, ctxJson)` / `render.string(source, ctxJson)` (Rust
`minijinja`).

## Rendering (Rust `minijinja`)

Templates live under `/app/views` (falling back to `/app/pages`); names resolve
views-root-relative, so `{% extends "layout.html" %}` works from any page. Ten
formatting filters are registered (`money`, `num`, `round`, `qty`, `date`, `datefmt`, `upper`,
`lower`, `json`, `yesno`). Templates are read fresh every render — no mtime cache (WASI mtime is
unusable and minijinja caches compiled templates, so the environment clears templates per render),
which is what makes editing a template live.

A route returns `{ html: "..." }` to send an HTML document; anything else is JSON:

```ts
export async function GET(req) {
  return { html: render.html("page.html", JSON.stringify({ title: "Profit Report", total: 1234.5 })) };
}
```

## Build and run

```powershell
cargo build --target wasm32-wasip2 --release
# deploy
Copy-Item .\target\wasm32-wasip2\release\trail_runtime_js.wasm <depot>\wasm\
# run
trail --depot <depot> run --address=127.0.0.1:4001 --runtime-root-fs <depot>
```

`--runtime-root-fs` is load-bearing: it is the WASI sandbox root, so `ahscripts/` must live inside
the configured root.

## Verified

- Builds here against `trailbase-wasm 0.6.1` (only a pre-existing dead-code warning).
- Serves on `trail v0.33.22`; a runtime-transpiled `.ts` route runs (self-test: Console, Time,
  KV, FS, SQLite all pass).
- Adding a route file takes effect with **no rebuild**.
- Rust `minijinja` rendering via `render.html(name, ctxJson)`; `GET /page` returns `text/html`
  with `{% extends %}` resolved and the ported filters applied.
- Per-request overhead ~9–18 ms server-side (`swc` transpile + QuickJS eval) — a caching
  candidate.
- Component loads in 2.42 s cold / 0.37 s warm (vs 39.7 s for the 16 MB `jco` JS guest).

## File structure

```text
src/
  lib.rs           guest entry: route table, wildcard handler, job handler
  runtime.rs       QuickJS AsyncRuntime/AsyncContext held in a thread-local; runs route files
  ts_transform.rs  swc TypeScript -> JavaScript
  api.rs           JS bridge (trailbase/db/console) + module registration
  api/{sqlite,kv,fs,fetch,time}.rs
  init.rs          runs ahscripts/init on startup (once per server start via KV marker)
  jobs.rs          minutely scheduler for ahscripts/jobs
  render.rs        Rust minijinja rendering + filters (render.html / render.string)
```

## Provenance and licensing

Adapted from `abdulhakam/trail_runtime_js` (the user's project), pinned to
`trailbase-wasm 0.6.1`. The upstream repository publishes no `LICENSE` file; confirm licensing
before any redistribution.

## Not done yet

- Real `fetch` (the upstream bridge returns 501; the SDK's `trailbase_wasm::fetch` is available).
- Typed/transactional DB params (`db.execute` is currently aliased to `query`; params are text).
- HTML/static response shape for rendering (`HttpResponse`/`Html` support in the SDK).
- Handler cache keyed by mtime to remove the per-request transpile cost.
- `init`/`jobs` only collect `.js` files (`extension == "js"`), so `.ts` scripts are skipped; and
  `init` runs from the minutely job rather than at startup.
- The `wstd` HTTP bridge panics on client disconnect (`ConnectionReset`) when a long request is
  cut off at the deadline.
