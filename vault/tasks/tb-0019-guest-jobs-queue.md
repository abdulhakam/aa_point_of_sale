---
title: TB-0019 Guest durable job queue
type: task
status: done
priority: medium
created: 2026-09-26
tags: [trailbase, wasm, rquickjs, jobs, queue, phase-6]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[jobs-in-process-durable-queue]]", "[[guest-app-host-port]]"]
---

# TB-0019 Guest durable job queue

Phase 6: a durable job queue with leases, retries and idempotent steps on the guest host.

## Subtasks

- [x] Migration: `job`, `job_step` (unique idempotency key, lease, attempt), `job_artifact`
      (`U1790300000__create_job_tables.sql`)
- [x] Atomic claim via `UPDATE … RETURNING`; expired leases re-dispatched
- [x] Idempotent effects (`INSERT OR IGNORE` on a unique step key), bounded retries with backoff
- [x] API: `POST /jobs`, `GET /jobs/{id}`, `GET /jobs/{id}/result`, `POST /jobs/{id}/cancel`,
      `POST /jobs/reconcile`, `POST /jobs/{id}/steps/{seq}/recover`
- [x] Tests: `trailbase/src/tools/jobs-check.mjs` — completion, result, one artifact per step,
      **genuine** idempotency under forced re-dispatch (attempt→2, artifacts unchanged), error paths
- [x] A background poller — the host's minute `Job` now calls the app's reconcile route directly
      (the `ahscripts/jobs` discovery is broken; [[trailbase-runtime-js-scheduler-not-running-jobs]]).
      Verified by `jobs-check.mjs` with `POLLER_TEST=1` (forced-due step completes with no request)
- [x] Worker fan-out — `reconcile` can dispatch claimed steps to `POST /worker/{pool}/step` over
      `http.request`, opt-in via `?fanout=1&concurrency=N`; self-directed across runtime threads,
      not separate components. Verified in `jobs-check.mjs`.
- [x] Vault: decision `jobs-in-process-durable-queue`; plan Phase 6 updated

## Outcome

See [[jobs-in-process-durable-queue]]. Deviation from the plan: steps run **in-process** (no HTTP
fan-out) because the host's `fetch` is a stub; the queue is still durable, leased and idempotent.
`jobs-check.mjs` passes; the guest smoke is 65/65.

## Related

- [[jobs-in-process-durable-queue]] — the design and its limits.
- [[guest-app-host-port]] — the host this lives in.
