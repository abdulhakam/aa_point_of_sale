---
title: runtime-js `ahscripts/jobs` scheduler does not run its job files
type: issue
status: mitigated
severity: medium
created: 2026-09-26
updated: 2026-09-26
tags: [trailbase, wasm, rquickjs, jobs, scheduler, limitations]
related_to: ["[[jobs-in-process-durable-queue]]", "[[trail-runtime-js-reference]]"]
---

# runtime-js `ahscripts/jobs` scheduler does not run its job files

## Status: mitigated

The file-discovery path is still broken, but the background poller now works by **bypassing it**:
`lib.rs`'s `job_handlers` no longer calls `crate::jobs::check_and_run_due_jobs`; its minutely `Job`
calls the app's own `/jobs/reconcile` route directly via `crate::runtime::run_route` with a
synthetic `user`, and logs `queue: reconciled N step(s)`.

Verified: force a step's lease to expire, then make **no** app request for ~75 s and read the job
with `GET /jobs/{id}?reconcile=0` — the step is `done` with `attempt = 2` (`jobs-check.mjs` with
`POLLER_TEST=1`). So due work and retries now progress on the scheduler tick, not only on an
inbound request.

The rest of this note records the original finding, which still applies to `ahscripts/jobs`.

## The limitation (file discovery)

The `runtime-js` host registers a minutely `Job` whose handler historically called
`check_and_run_due_jobs` (`src/jobs.rs`). That function did run — its
`/ahscripts/init directory not found` message appears on the server log — but a `.js` file placed
at `/ahscripts/jobs/reconcile.js` was **never executed**:

- A probe route listed the directory as `["reconcile.js"]`, so the file is visible.
- Over multiple minute ticks, the `_jobs` registry stayed **empty** and no
  `Running job: /ahscripts/jobs/reconcile.js` line appeared, so `collect_jobs`/`is_job_due` never
  produced a run (the first run should always be due).
- The file was removed rather than left in place looking active.

The cause was not root-caused (candidates: `is_dir()`/`extension` handling on the WASI preopen, or
the preopen path not matching `/ahscripts/jobs` for the Rust scheduler while the JS `fs` sees it).

## What it costs

The `ahscripts/jobs` authoring surface is unusable, so a project cannot add its own scheduled jobs
that way. The workaround above covers this app's need (queue reconcile); a fix would restore the
general mechanism.

## Evidence

- Probe output: `{"jobsDir":["reconcile.js"],"registry":[]}` and stuck `running` steps after a
  75 s wait with no app requests (before the workaround).
- After the workaround: the log shows `queue: reconciled 1 step(s)` with no intervening request,
  and `jobs-check.mjs` `POLLER_TEST=1` passes.
- `trailbase/host/src/jobs.rs` — the broken discovery; `trailbase/host/src/lib.rs` — the workaround.

## Related

- [[jobs-in-process-durable-queue]] — the queue this polls.
- [[trail-runtime-js-reference]] — the host and its other measured behaviour.
