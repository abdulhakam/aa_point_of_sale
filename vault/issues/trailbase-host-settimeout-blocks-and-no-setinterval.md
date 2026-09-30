---
title: `setTimeout` blocks the request and `setInterval` does not exist
type: issue
status: open
severity: medium
created: 2026-09-28
updated: 2026-09-28
tags: [trailbase, wasm, host, quickjs, timers, deadline, limitations]
related_to: ["[[trailbase-guest-cpu-js-limits]]", "[[snapshot-persistence-hits-the-20s-deadline]]", "[[trail-runtime-js-reference]]"]
---

# `setTimeout` blocks the request and `setInterval` does not exist

## The finding

`trailbase/tb-ah-run-js/src/api/time.rs:14,21-22`:

```rust
// But for scripts, we can just map them to sleep for now or warn.
// setInterval is dangerous if blocking.
```

`setTimeout(fn, ms)` is implemented by **sleeping the calling thread** and then running the callback
inline. It is not a timer. Two consequences:

- **It spends the call deadline.** The guest call is killed at ~20 s
  ([[trailbase-guest-cpu-js-limits]]). A report that uses `setTimeout` to stagger work — the
  obvious way to avoid a long synchronous pass — burns its budget on sleeping and is then killed
  anyway, so the workaround is strictly worse than the problem.
- **It blocks the request, so concurrency collapses.** The QuickJS context is `thread_local`
  (`runtime.rs`), so a sleeping route occupies one of the four runtime threads for the duration.

`setInterval` is not implemented at all, and the comment says why: a repeated callback on a
thread-local context has no obvious safe home.

## What it costs

- No documented statement that timers are unavailable or blocking, so the natural JS instinct
  ("I'll chunk this loop") leads straight into the deadline that
  [[snapshot-persistence-hits-the-20s-deadline]] and [[report-performance-baseline]] are already
  fighting.
- `trailbase/tb-ah-run-js/README.md:23-25` advertises `time.sleep` and `setTimeout` in the same list with
  no distinction, which reads as "both are available and cheap".
- The `use trailbase_wasm::time::{Duration, Timer}` import at `lib.rs:11` is commented out, so the
  SDK's real timer is not wired either.

## The fix

Document it first, decide second:

- `trailbase/tb-ah-run-js/README.md` and [[runtime-js-guest-platform]] should say plainly: `setTimeout`
  sleeps, `setInterval` is absent, neither is usable inside a request, and the work-splitting tools
  are the job queue (`/jobs/reconcile`, [[jobs-in-process-durable-queue]]) or the report worker
  pool.
- If a non-blocking timer is genuinely wanted, the SDK's `Timer` is the route (uncomment
  `lib.rs:11`), and it needs a design for callbacks that outlive the request.

## Evidence

- `trailbase/tb-ah-run-js/src/api/time.rs:14,21-22` — the sleep mapping and the `setInterval` comment; read
  2026-09-28.
- `trailbase/tb-ah-run-js/src/lib.rs:11` — the commented-out SDK timer import.
- `trailbase/tb-ah-run-js/src/runtime.rs` — the `thread_local` QuickJS context.
- [[trailbase-guest-cpu-js-limits]] — the ~20 s call deadline.

## Related

- [[jobs-in-process-durable-queue]] — the mechanism that does exist for deferring work.
- [[trailbase-guest-cpu-js-limits]] — the deadline timers interact with.
