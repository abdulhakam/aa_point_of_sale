---
title: The host re-transpiles the dispatcher on every request
type: issue
status: fixed
severity: medium
created: 2026-09-27
updated: 2026-09-27
tags: [trailbase, wasm, rquickjs, performance, swc, app-host]
related_to: ["[[guest-app-host-port]]", "[[guest-vs-node-performance]]", "[[guest-report-performance-options]]"]
---

# The host re-transpiles the dispatcher on every request

## Fixed (2026-09-27)

`runtime.rs` now keeps a small cache of the **processed** route source (transpiled + `export`
stripped) keyed by path and content hash. The file is still read every request (so edits stay
live); the expensive swc transpile is reused whenever the content hash is unchanged.

Measured effect (same depot, [[guest-vs-node-performance]] method):

| Endpoint | Guest warm before | Guest warm after |
|---|---|---|
| `/healthz` | 28 ms | 19 ms |
| `/reports/status` | 24 ms | 15 ms |
| `/management/items` | 73 ms | 60 ms |
| `/dashboard` | 29 ms | 25 ms |
| `/reports/profit` | 4577 ms | 3932 ms |
| `/p/reports/profit/data` | 3319 ms | 2747 ms |

The baseline dropped ~30–40 %; the report numbers barely moved, confirming that the view build
(option 2) and the JS↔Rust payload (option 3) are the real costs
([[guest-report-performance-options]]).

## What happens

`runtime-js/src/runtime.rs::run_route` runs for **every** request that the wildcard dispatches
(which is every app route):

```rust
let raw_code = fs::read_to_string(path)?;          // read the file
let code = if path.ends_with(".ts") {              // and, for a .ts route,
    crate::ts_transform::compile_ts(&raw_code)?    //   run swc over it
} else { raw_code };
// then wrap the whole thing, eval it in the QuickJS context, and call the method
```

The app host is `ahscripts/routes/_app/route.ts` (~15 KB), so **every request pays a file read, a
full swc TypeScript transpile, a wrapper build, and an eval of the result** before any route logic
runs. Nothing is memoised: the code path is re-derived per call by design (it is what makes the
route file editable without a rebuild).

## Impact

- The measured **~20–30 ms guest baseline** (`/healthz` 28 ms warm vs Node 7 ms;
  [[guest-vs-node-performance]]) is largely this: transpiling and evaluating the dispatcher, not
  handling the request.
- It scales with the dispatcher's size, so every feature added to `_app/route.ts` makes *all*
  routes slower.
- It is pure overhead on routes that do trivial work (`/healthz`, `/favicon.svg`, a 304).

## Fix

Memoise the transpiled source (and optionally the wrapper) keyed by the route file's
**content identity** (path + size + mtime, or a hash — note that mtime is unusable on WASI,
[[trailbase-guest-template-cache-wasi-mtime]], so hash or size+mtime-of-the-host-file):

- Cache `compile_ts(raw)` → JS string, skipping swc on a hit. This is the big win and is safe: the
  cache key changes when the file changes.
- Evaluating the wrapper in the context is still needed (it installs the route's globals), but
  that is far cheaper than swc.

This preserves live editing and removes the per-request transpile.

## Evidence

- `runtime-js/src/runtime.rs` — `run_route` (read + `compile_ts` + wrapper + eval, no cache).
- `runtime-js/site/ahscripts/routes/_app/route.ts` — the dispatcher, a `.ts` file, so swc runs.
- [[guest-vs-node-performance]] — the baseline latency this explains.

## Related

- [[guest-report-performance-options]] — the wider performance plan this is step 1 of.
- [[guest-app-host-port]] — the dispatcher this affects.
