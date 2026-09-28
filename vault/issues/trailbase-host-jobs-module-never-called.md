---
title: The host's whole `jobs` module is dead code, so init-gating never runs
type: issue
status: open
severity: medium
created: 2026-09-28
updated: 2026-09-28
tags: [trailbase, wasm, host, jobs, scheduler, init, dead-code]
related_to: ["[[trailbase-runtime-js-scheduler-not-running-jobs]]", "[[jobs-in-process-durable-queue]]", "[[runtime-js-guest-platform]]", "[[trail-runtime-js-reference]]"]
---

# The host's whole `jobs` module is dead code, so init-gating never runs

## The finding

[[trailbase-runtime-js-scheduler-not-running-jobs]] records that `ahscripts/jobs/*.js` files are
discovered but never executed, and calls the problem *mitigated* because the poller was rewritten to
bypass it. It blames file **discovery**. The larger fact is that the module is not called at all:

- `trailbase/host/src/jobs.rs:24` defines `check_and_run_due_jobs`, the only entry point.
- `trailbase/host/src/lib.rs:64-89` `job_handlers()` returns **one** job,
  `Job::minutely("queue_poller", …)`, whose body calls
  `crate::runtime::run_route("/ahscripts/routes/_app/route.ts", "POST", …)`.
- Nothing in the crate calls `check_and_run_due_jobs`. Grep across `host/src` returns the
  definition and one internal call site only.

So the following never execute:

| Never runs | Consequence |
|---|---|
| `init_jobs_table` (`jobs.rs`) | the host's own `_jobs` table is never created. The app's queue uses its own tables from `U1790300000__create_job_tables.sql`, so this is invisible today — but it means the host's job machinery is not merely bypassed, it is absent. |
| `collect_jobs` / `is_job_due` | the `ahscripts/jobs/*.js` authoring surface ([[runtime-js-guest-platform]] lists it as a supported path) is unusable, not just broken. |
| `crate::init::ensure_global_init` (`init.rs:24`, called at `jobs.rs:29`) | **the init-gating half.** The KV `server_start_time` / `last_init_time` protocol in `init.rs` never runs from the live path, so `ahscripts/init/*.js` runs only via `runtime::init()` on the first request rather than at server start. |

## What it costs

The recorded mitigation is sound and `jobs-check.mjs` passes, so the durable queue
([[jobs-in-process-durable-queue]]) is fine. What is lost is:

- **A documented capability that does not exist.** `runtime-js-guest-platform.md` and
  `trailbase/host/README.md:20` both advertise `ahscripts/jobs/*.ts` as a place to put scheduled
  work. It cannot work, for a different reason than the note gives.
- **Init is first-request, not start-up.** Anything that assumes "init already ran" (a migration
  step, a seed, a KV warm) has a window where it has not, and a cold server has no such window at
  all until something requests.
- **`init.rs:50` prints a warning** — "ensure_global_init called but server_start_time not set in
  KV" — for a condition that can now only arise from the dead path, so the log line is a red
  herring.

## The fix

Decide the surface, then make the code match the decision:

- **Delete** `jobs.rs` and the `ensure_global_init` call chain, and remove `ahscripts/jobs` from
  the documented authoring surfaces. The poller route stays.
- **Or** call `check_and_run_due_jobs` from `job_handlers` in addition to the poller, and
  root-cause the discovery bug the earlier note says was never root-caused.

The choice belongs to the owner; it is recorded in [[trailbase-runtime-js-scheduler-not-running-jobs]]
as an open question.

## Evidence

- `trailbase/host/src/jobs.rs:24,29` — the definition and its internal call to
  `ensure_global_init`.
- `trailbase/host/src/lib.rs:64-89` — the only registered job, and it does not go through
  `jobs.rs`.
- `trailbase/host/src/init.rs:24,50` — `ensure_global_init` and its warning.
- Grep of `host/src` for `check_and_run_due_jobs` / `ensure_global_init`, 2026-09-28: 4 hits, all
  in `init.rs` and `jobs.rs`, none in `lib.rs`.

## Related

- [[trailbase-runtime-js-scheduler-not-running-jobs]] — the earlier, narrower finding this
  amends.
- [[trailbase-host-getscripts-reads-wrong-root]] — the other upstream relic found in the same pass.
