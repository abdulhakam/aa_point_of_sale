---
title: "`/jobs/reconcile?fanout=1` reports reconciled: 0 for steps it dispatches"
type: issue
status: open
created: 2026-09-29
tags: [jobs, queue, trailbase, test-harness]
belongs_to: "[[trailbase]]"
related_to: ["[[jobs-in-process-durable-queue]]", "[[tb-0027-materialised-invoice-documents]]", "[[trailbase-runtime-js-scheduler-not-running-jobs]]"]
---

# `/jobs/reconcile?fanout=1` reports reconciled: 0 for steps it dispatches

## The symptom

`node trailbase/tools/jobs-check.mjs` fails one check:

```
ok   result endpoint returns the merged result  200 {...}
FAIL fan-out reconcile dispatched the due steps  null
ok   fan-out preserved idempotency  artifacts=6
ok   fan-out job is done  done
```

`/jobs/reconcile?fanout=1&concurrency=3` returns:

```json
{"materialized":{"version":3,"views":1},"reconciled":0}
```

with `reconciled: 0` where `jobs-check.mjs` expects `3`.

## The work still happens

This is a **reporting** defect, not a dispatch one. The three recovered steps do get dispatched
and the job still ends `done` with all 6 artifacts, which the next two checks confirm. Only the
count in the response is wrong — `reconciled` reports 0 for a fan-out that dispatched 3.

The check reports `null` rather than `0` because `jobs-check.mjs` compares
`fan.json?.reconciled === 3` and prints `JSON.stringify(fan.json)` — so the `null` is the whole
`{"materialized":...,"reconciled":0}` body being non-`3`, not a missing field.

## Pre-existing, not caused by the invoice-document work

Reproduced with `route.ts` and `queue.js` reverted to the committed versions via
`git stash push -- trailbase/runtime/ahscripts/lib/queue.js trailbase/runtime/ahscripts/routes/_app/route.ts`.
The `invdoc.rebuild` job added to `queue.js` is not involved: the failing case submits
`demo.count`, and the fan-out path it uses is untouched by this work.

## What to check when fixing it

The fan-out branch of `reconcile` in `trailbase/runtime/ahscripts/lib/queue.js` (around line 145-165)
dispatches claimed steps to `/worker/{n}/step` over `concurrency` workers. The likely cause is
that the `reconciled` figure is accumulated from the non-fan-out branch's return value rather
than from the dispatched worker results, so a fan-out returns the count from a path that
dispatched nothing.

Either the count should be the number of steps the fan-out dispatched, or `jobs-check.mjs` should
stop asserting on it and assert on the outcome (`artifacts`, `state`) that the fan-out is
actually for. The first is a fix; the second is a test that stopped checking the thing it was
written to check. Which one is right depends on whether callers are meant to read `reconciled` as
"steps this call ran" — the `/jobs` route returns it to the caller, so it should mean that.

## Related

- [[jobs-in-process-durable-queue]] — the decision that owns the queue's contract.
- [[trailbase-runtime-js-scheduler-not-running-jobs]] — why the poller drives the route instead
  of the host's own scheduler.
