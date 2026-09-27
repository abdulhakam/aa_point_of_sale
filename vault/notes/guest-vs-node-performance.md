---
title: Guest vs Node performance on the same depot
type: note
status: active
created: 2026-09-27
tags: [trailbase, wasm, rquickjs, performance, benchmarks, parity]
related_to: ["[[guest-app-host-port]]", "[[trail-runtime-js-reference]]", "[[trailbase-guest-cpu-js-limits]]", "[[reports-and-ledgers]]"]
---

# Guest vs Node performance on the same depot

⚠️ **Historical comparison.** The Node column below measured the **former Node frontend**
(`frontend-ssr`, removed 2026-09-27) against the **guest frontend** ([[runtime-js-guest-platform]]),
both serving the same TrailBase depot (`trailbase/traildepot` copy: 8,927 invoices, 23,413
transactions, 26,526 payments). The Node app no longer exists in the tree, so its numbers are kept
as a historical baseline; the guest's absolute measurements stand on their own.

Tool: `runtime-js/tools/perf-compare.mjs` — itself removed with the Node baseline, since it needed
both apps running. Environment: `trail v0.33.22`, guest `--runtime-threads=4`, Node 24
(`WORKER_THREADS=4`), Windows, one shared dev machine. "Cold" = the first request to that endpoint
in the run; "warm" = median of 3 repeats.

| Endpoint | Node cold/warm (historical) | Guest cold/warm |
|---|---|---|
| `/healthz` | 19 / **7 ms** | 55 / **28 ms** |
| `/dashboard` | 2945 / **6 ms** | 3343 / **29 ms** |
| `/reports/profit?from=…&to=…` (server-rendered HTML, 21,815 rows) | 4170 / **2617 ms** | **18722** / **4577 ms** |
| `/p/reports/profit/data?from=…&to=…` (JSON + select tables) | 458 / **418 ms** | 2434 / **3319 ms** |
| `/management/items` | 44 / **33 ms** | 91 / **73 ms** |
| `/reports/status` | 3 / **3 ms** | 28 / **24 ms** |

Runtime-level numbers measured earlier ([[trail-runtime-js-reference]],
[[trailbase-guest-cpu-js-limits]]): component cold load **2.4–9.7 s** for the Rust+QuickJS guest
versus **39.7 s** for the 16 MB `jco`/StarlingMonkey component (warm load 0.2–0.37 s); QuickJS vs
StarlingMonkey on the same loop only ~1.1×; a guest call has a **~20 s deadline**; guest JS runs at
roughly **1×10⁶ simple loop iterations/s**.

## How to read this

The Node figures below are the historical baseline (see the note at the top).

- **Baseline overhead is ~20–30 ms per request** in the guest vs ~3–7 ms in Node — every guest
  request re-evaluates the dispatcher file and goes through QuickJS, where Node is JIT-compiled.
- **Warm guest costs are dominated by serialising large payloads across the JS↔Rust boundary**,
  not by the report math:
  - `/reports/profit` warm 4.6 s: the computed result (21,815 rows) is JSON-stringified in QuickJS
    and parsed by Rust for `minijinja`. The report itself is already a KV cache hit.
  - `/p/reports/profit/data` warm 3.3 s: the endpoint ships the select-source tables to the
    browser (tens of thousands of rows), so it re-reads and re-serialises them each request.
  - Small endpoints (`/dashboard` warm 29 ms, `/management/items` 73 ms, `/reports/status` 24 ms)
    show the compute is cheap once payloads are small.
- **The cold profit report is 18.7 s — within 1.3 s of the 20 s guest call deadline.** Building
  the views in the guest interpreter over this data is the cost, and it is a single request. The
  Node service does that work **off the request path** in `worker_threads`, which is why its cold
  is 4.2 s and warm 2.6 s.
- Node's warm profit render (2.6 s) is also high: it renders 21,815 rows. The guest's 4.6 s is the
  same render plus the boundary serialisation.

## Caveats

- Single run on a shared machine; treat as orders of magnitude, not precise constants. Cold
  depends on request ordering within the run (a later endpoint can reuse views an earlier one
  built).
- The guest's `/p/.../data` warm benefits from the KV report cache but still pays the table read
  and serialisation; the cache removes the report math, not the payload.
- The Node numbers (historical) depended on its warm-snapshot state (`REFRESH_INTERVAL_SECONDS=60`,
  `WORKER_THREADS=4`).
- Both apps ran the **same** `compute/` code (the guest's copy is
  `runtime-js/site/app/compute/`); the difference was the runtime (interpreter vs JIT, single
  request thread vs a worker pool), not the logic.

## Implications

- Keep heavy aggregation in SQL or off the request path; a cold guest report on production-sized
  data is close to the 20 s cliff ([[trailbase-guest-cpu-js-limits]]).
- The remaining data-layer optimization named in the plan — **materialising the derived views as
  SQLite tables** ([[guest-fingerprint-refresh]] § open) — is the way to move the cold cost out of
  the JS interpreter.
- Shrinking the page-data payload (or gzipping it) would cut the largest warm cost
  ([[guest-app-host-port]] § still to do).

## Related

- [[guest-app-host-port]] — what was measured.
- [[trail-runtime-js-reference]] — the runtime-level measurements.
- [[trailbase-guest-cpu-js-limits]] — why long synchronous work is dangerous.
