---
title: TB-0016 Guest-WASM Phase 0 capability spikes
type: task
status: done
priority: high
created: 2026-09-26
tags: [trailbase, wasm, guests, spike, phase-0]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[trailbase-guest-wasm-spike-results]]", "[[trailbase-guest-wasm-runtime-defaults]]"]
---

# TB-0016 Guest-WASM Phase 0 capability spikes

Run the eight capability spikes that gate the wasm app-platform plan before any build-out, and
record the results as evidence.

## Why

The plan replaces the former Node frontend (`frontend-ssr`, removed 2026-09-27) process with
TrailBase guest-WASM components whose business logic is loaded and evaluated at runtime. Two
premises were unverified and load-bearing:
that a `jco` component can `eval`/`new Function` at runtime (D2), and that a guest can read the
`app/` directory through the WASI sandbox (D4). S2–S5 were required to be *decided* before Phase 1.

## Subtasks

- [x] S1 baseline guest loads and serves
- [x] S2 cookie auth → `req.user()`; CSRF behaviour
- [x] S3 filesystem preopen scope (reads `app/`)
- [x] S4 runtime `eval` works in a `jco` component (**blocking gate for D2**)
- [x] S4b load business JS from `app/` and evaluate it (the actual D2 path)
- [x] S5 concurrent vs serialized requests for one component
- [x] S6 outbound `fetch` to self
- [x] S7 `Transaction`/`UPDATE … RETURNING` claim + error strings
- [x] S8 component size/startup, AOT on/off
- [x] Record S1–S8 results in the vault (evidence, not assertion)

## Outcome

All S1–S8 pass; D2 and D4 are confirmed and no Phase 0 fallback is needed. Results, exact commands
and observed output are in [[trailbase-guest-wasm-spike-results]]; the settled defaults are in
[[trailbase-guest-wasm-runtime-defaults]]. The four measured limitations became
[[trailbase-guest-cpu-js-limits]], [[trailbase-guest-aot-startup-cost]],
[[trailbase-guest-error-string-opaque]] and [[trailbase-guest-request-headers-bytes]].

Artifacts: `guests/` (TS + Vite + jco), spike guest `guests/src/index.ts`, scratch depot
`guests/spikes/depot/`, sandbox app dir `guests/spikes/app/`.

## Related

- [[trailbase-guest-wasm-spike-results]] — the evidence.
- [[trailbase-guest-wasm-runtime-defaults]] — the decision the spikes settled.
