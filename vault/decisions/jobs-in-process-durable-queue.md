---
title: Jobs run in-process on a durable, leased, idempotent SQLite queue
type: decision
status: accepted
decided_on: 2026-09-26
created: 2026-09-26
tags: [trailbase, wasm, rquickjs, jobs, queue, idempotency, phase-6]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[guest-app-host-port]]", "[[runtime-js-single-host]]", "[[trailbase-guest-error-string-opaque]]"]
---

# Jobs run in-process on a durable, leased, idempotent SQLite queue

## Context

The plan's Phase 6 wanted a durable queue plus **HTTP fan-out** to worker components
([[trailbase-guest-wasm-runtime-defaults]]). In the guest those two halves are separable: the
durability is a schema concern, but the fan-out assumed the host could POST to itself — and the
runtime-JS host's `fetch` is a stub ([[trail-runtime-js-reference]]). Phase 0's S6 spike proved a
guest *can* reach itself, but that bridge is not implemented in this host.

## Decision

Implement the queue as **durable steps executed in-process**, with no worker fan-out:

- **Schema** (`trailbase/migrations/main/U1790300000__create_job_tables.sql`):
  `job` (submitted unit), `job_step` (the unit of work — `idempotency_key UNIQUE`, `state`,
  `attempt`, `lease_until`), `job_artifact` (`step_key UNIQUE` — the recorded effect).
- **Atomic claim** with one statement, which the guest can run through its read channel:
  `UPDATE job_step SET state='running', attempt=attempt+1, lease_until=? WHERE id = (SELECT … due …)
  RETURNING …`. A step is due when it is `pending` with an elapsed lease, or `running` with an
  expired lease (so a crashed/lost worker is re-dispatched).
- **At-least-once + idempotent effects.** Every step's effect is `INSERT OR IGNORE`d into
  `job_artifact` under its `idempotency_key`, so re-running a step never double-applies.
- **Retries with backoff**, bounded by `MAX_ATTEMPTS`; on exhaustion the step is `failed` and the
  job is `failed`. Errors are read from the queue's own bookkeeping, not from
  `Error.message` ([[trailbase-guest-error-string-opaque]]).
- **Reconcile on demand and on a schedule**: job routes reconcile before answering
  (`GET /jobs/{id}`; `?reconcile=0` inspects without reconciling), and `POST /jobs/reconcile` runs
  the loop explicitly. A minutely host `Job` also calls that route directly, so due steps and
  retries progress without a request — the host's own `ahscripts/jobs` file-discovery is broken, so
  the poller bypasses it ([[trailbase-runtime-js-scheduler-not-running-jobs]]).
  `POST /jobs/{id}/steps/{seq}/recover` forces a step back to due **and resets the job to
  `running`** — the claim query joins on job state, so without that the recovered step would never
  be re-claimed.

API: `POST /jobs`, `GET /jobs/{id}`, `GET /jobs/{id}/result`, `POST /jobs/{id}/cancel`
(all behind the app's auth gate).

## Consequences

**Accepted**

- The queue is durable and resumable across restarts, and every step is idempotent by
  construction.
- No second component, no cross-component HTTP, no port plumbing.
- Tests: `trailbase/tools/jobs-check.mjs` — submit → done, correct result, one artifact per step,
  and a **genuine** re-dispatch after a forced lease expiry: the recovered step's `attempt` goes to
  **2** (it really re-ran) while `artifacts` stays **4** (the UNIQUE key blocked a second effect).
  Unknown job/401/404 paths are covered too.

- **Worker fan-out is available, opt-in.** `reconcile(db, { origin, concurrency })` claims up to
  `concurrency` steps and POSTs each to `POST /worker/{pool}/step` (over `http.request`), so step
  work can run on other runtime threads; without `origin` it runs inline. The endpoint is internal
  (no session; the call is server-to-self) and only executes an **already-claimed** step by id,
  idempotently — it cannot create work. `POST /jobs/reconcile?fanout=1&concurrency=N` selects it.

**Given up / to watch**

- The fan-out is self-directed: it spreads steps across the component's `--runtime-threads`, not
  across separate `worker` components as the plan imagined, and it is off unless requested.
- Long CPU-bound step work still contends with serving (the ~1M ops/s and 20 s deadline limits from
  [[trailbase-guest-cpu-js-limits]] apply).

## Evidence

- `trailbase/migrations/main/U1790300000__create_job_tables.sql`.
- `trailbase/runtime/ahscripts/lib/queue.js` — specs, claim, run, execute, finalize, recover, fan-out.
- `trailbase/runtime/ahscripts/routes/_app/route.ts` — the `/jobs` routes and `/worker/{pool}/step`.
- `trailbase/tb-ah-run-js/src/api/fetch.rs` — `http.postJson` (login) and `http.request` (fan-out).
- `trailbase/tools/jobs-check.mjs` — all checks pass, including the fan-out path
  (`?fanout=1&concurrency=3`: three due steps dispatched, `artifacts` unchanged, job done).
- The guest smoke (`trailbase/tools/guest-smoke.mjs`) passes in full (69/69 when this was
  written).

## Related

- [[guest-app-host-port]] — the app host this queue lives in.
- [[runtime-js-single-host]] — why there is one component rather than a worker fan-out.
- [[trailbase-guest-error-string-opaque]] — the error-shape rule the retry logic follows.
