---
title: TrailBase guest JS is slow, single-threaded per request, and has a ~20s call deadline
type: issue
status: known-limitation
severity: high
created: 2026-09-26
tags: [trailbase, wasm, guests, performance, limitations]
related_to: ["[[trailbase-guest-wasm-spike-results]]", "[[trailbase-guest-wasm-runtime-defaults]]"]
---

# TrailBase guest JS is slow, single-threaded per request, and has a ~20s call deadline

## The limitation

A `jco`-componentized JS guest runs business code on one StarlingMonkey instance per request, and
that instance is both slow and deadline-bounded:

1. **Throughput is roughly 1 million simple loop iterations per second.** `/spike/busy?n=3000000`
   (an integer add/mod loop) completes in ~3.0 s; `n=20000000` took 15.9 s. Anything
   CPU-bound — report aggregation, a large reduce — is measured in seconds, not milliseconds.
2. **The guest clock does not advance within a single turn.** A
   `while (Date.now() - start < ms) {}` busy-wait never exits, because `Date.now()` is frozen for
   the duration of a synchronous turn. `/spike/cpu?ms=100` (a 0.1 s busy-wait) hangs and is killed
   at the deadline. Fixed-iteration loops are fine; clock-based loops are not.
3. **A guest call has a ~20 s deadline.** `/spike/cpu?ms=100`, `?ms=500` and `?ms=2000` all
   return HTTP **500** with body `component responded unexpectedly` after ~20 s, and TrailBase logs
   `WARN trailbase_wasm_runtime_axum Error calling WASM component 'spike_component': /spike/cpu`.
4. Requests **do** run in parallel with `--runtime-threads=4` (two 3.0 s CPU requests finished in
   3.5 s wall, not 6.0 s), so the limit is per-request latency, not total throughput.

## What it costs

- Report/ledger arithmetic must not be a long synchronous guest handler: at ~10⁶ iter/s a
  whole-table pass over a real `transactions` table can exceed the 20 s deadline and return a 500.
  The plan's answer is to keep heavy aggregation in SQLite (materialised views) and shard work into
  job steps ([[trailbase-guest-wasm-runtime-defaults]]).
- A handler that blocks the clock cannot be used to fake a delay or a timeout; it must `await` a
  timer instead (`/spike/sleep` with `setTimeout` overlapped correctly: two 1500 ms sleeps in
  1792 ms).
- The timeout is a cliff: a slowly-terminating handler does not degrade, it fails the whole call.

## Evidence

- `guests/src/index.ts` — `/spike/cpu` (clock busy-wait), `/spike/busy` (fixed-iteration loop),
  `/spike/sleep` (async), `/spike/now`.
- [[trailbase-guest-wasm-spike-results]] § S5 and § Extra findings, with the exact request timings
  and the server log lines.
- Runtime: `trail v0.33.22-0-g3dfb2f70`, `--runtime-threads=4`, non-AOT component
  (`sha256 276D1E1C…`).

## Related

- [[trailbase-guest-wasm-runtime-defaults]] — the mitigation (SQL-side aggregation, sharded jobs,
  never block the thread).
- [[trailbase-drop-sql-views]] and [[reports-and-ledgers]] — the arithmetic that would otherwise run
  in the guest.
