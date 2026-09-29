---
title: TrailBase loads N guest components, but merges their routes into one flat router
type: issue
status: resolved
severity: medium
created: 2026-09-28
updated: 2026-09-28
tags: [trailbase, wasm, components, routing, wasi]
related_to: ["[[component-split-and-sql-materialised-tables]]", "[[compiled-artifacts-are-generic-capabilities]]", "[[runtime-js-single-host]]"]
---

# TrailBase loads N guest components, but merges their routes into one flat router

## Finding

**TrailBase does load every component in `traildepot/wasm/`.** Two components coexist, each
instantiated once for the main runtime and once per runtime thread:

```text
Loaded component "traildepot\\wasm\\runtime_js.wasm" in: 220.4252ms.
Loaded component "traildepot\\wasm\\sql.wasm"       in:  24.7846ms.
```

`trail run` exposes no per-component flag (`--runtime-root-fs` and `--runtime-threads` are the only
runtime options), so discovery is by directory scan.

**But their HTTP handlers are merged into a single flat axum router.** Declaring the same method +
path in two components is a hard startup failure, not a warning:

```text
thread 'main' panicked at utoipa-axum-0.3.0/src/router.rs:358:21:
Overlapping method route. Handler for `GET /getscripts` already exists
```

## Consequence for the split

Separate components are viable, and this is the constraint that governs their design:

- **URL spaces must be disjoint.** Axum resolves a static segment ahead of a wildcard, so the main
  component's `/{*wildcard}` and another component's `/rpc/payload` coexist fine. It is *identical*
  routes that collide.
- **Cross-component calls have no in-guest channel.** There is no WIT interface between TrailBase
  guest components. The only ways for one component to reach another are HTTP through the server
  itself (the `http.request` bridge) or a shared store. The "pass an address, not a value" design
  works — via the KV store — but the address has to be a **KV key**, not a file path (below).
- Component size is a real benefit: the generic SQL service is **0.78 MB** against the main host's
  **6.86 MB**.

## Two WASI constraints found while building the second component

Both fail in ways that surface only as TrailBase's generic
`component responded unexpectedly`, so they are worth recording:

1. **`std::process::id()` panics under `wasm32-wasip2`** — `unsupported` in
   `std::sys::pal::wasi::os`. Use a counter for unique names.
2. **The WASI runtime root is read-only.** `--runtime-root-fs` is mounted read-only, so the
   "write results to a spool file under the sandbox" plan fails with
   `Operation not permitted (os error 63)`. The shared **KV store** is the working handoff: it is
   backed by the depot and is reachable from every component, so `store.set(key, bytes)` on one
   side and `store.get(key)` on the other is the real version of "a name, not a value".

## Resolution

Both constraints are worked around in `trailbase/host-sql/` (a counter-based spool key, KV
handoff). The finding itself is **resolved** — the approach is proven, and measured in
[[component-split-and-sql-materialised-tables]].

## Evidence

- `trailbase/host-sql/` — the second component; 0.78 MB build.
- `trailbase/host-sql/src/lib.rs:20-24` — the URL space kept disjoint, with the reason.
- Server log: both components compiled and loaded; `Error calling WASM component 'sql'` naming the
  failing component.
- `trailbase/tools/split-bench.mjs` — the harness that drives both components.

## Related

- [[component-split-and-sql-materialised-tables]] — the decision this unblocks, with timings.
- [[runtime-js-single-host]] — the single-host decision this qualifies.
