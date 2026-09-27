---
title: AOT-compiled JS guests are larger and much slower to load
type: issue
status: known-limitation
severity: medium
created: 2026-09-26
tags: [trailbase, wasm, guests, aot, startup, limitations]
related_to: ["[[trailbase-guest-wasm-spike-results]]", "[[trailbase-guest-wasm-runtime-defaults]]"]
---

# AOT-compiled JS guests are larger and much slower to load

## The limitation

`jco componentize --aot` is strictly worse than the default (non-AOT) build on this runtime, on
both size and startup:

| Build | Size | Cold load | Warm load (same process) |
|---|---|---|---|
| non-AOT | 16,272,911 B (15.5 MiB) | 39.7 s | 0.61 s |
| `--aot` | 30,707,669 B (29.3 MiB) | 89.9 s | 2.08 s |

- AOT roughly doubles the file (the embedded StarlingMonkey engine is precompiled).
- Cold load is **2.3× longer** (89.9 s vs 39.7 s). The component is loaded twice per start
  (compile, then reload), so the cost is paid inside the server's startup path.
- No persistent compiled-artifact cache was observed: changing the component causes a fresh
  compile on the next start, for both builds.

## What it costs

- Every server restart (and every component change) pays the cold-load time; with `--aot` that is
  ~90 s per JS component before the server listens.
- The doubled file size matters because the plan budgets N component copies (memory/startup per
  copy) and because the depot is offline/self-contained.

## Evidence

- [[trailbase-guest-wasm-spike-results]] § S8, with the sizes and the `Loaded component … in: Xs`
  log lines.
- `guests/package.json` scripts `build:wasm` and `build:wasm:aot`; the component was built both ways
  from the same `dist/index.js`.
- Runtime `trail v0.33.22-0-g3dfb2f70`, non-AOT component `sha256 276D1E1C…`.

## Related

- [[trailbase-guest-wasm-runtime-defaults]] — default to non-AOT.
- [[trailbase-guest-cpu-js-limits]] — the other measured guest-performance limit.
