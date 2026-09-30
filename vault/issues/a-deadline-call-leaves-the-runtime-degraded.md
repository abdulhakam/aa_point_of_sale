---
title: A guest call past its deadline leaves the runtime degraded until restart
type: issue
status: verified
created: 2026-09-30
tags: [trailbase, guest, quickjs, deadline, performance, defect]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[snapshot-persistence-hits-the-20s-deadline]]", "[[clean-slate-benchmark-cycle]]", "[[guest-report-performance-options]]", "[[a-base64-alphabet-error-is-silent]]"]
---

# A guest call past its deadline leaves the runtime degraded until restart

## Symptom

When a guest route exceeds the ~20 s WASM call deadline, the host does not simply return a 500.
Afterwards:

- some later requests fail **fast** (5 ms, 3 ms, 2 ms) with a 500 — too fast to be any real
  computation, so they are the runtime rejecting work rather than doing it;
- eventually **every** route fails, including `GET /healthz`, with
  `Error calling WASM component 'tb-ah-run-js': /healthz`;
- at least once the whole `trail` process was **gone** (zero processes, connection refused), not
  merely unhealthy;
- the log carries a panic from the host's own HTTP layer, not from the guest:

```
thread '<unnamed>' (1) panicked at wstd-0.5.6/src/http/server.rs:177:16:
I/O error while writing the body: Kind(ConnectionReset)
```

A restart is required to recover.

## Why this matters more than the 500 itself

The 20 s deadline is already known and recorded
([[snapshot-persistence-hits-the-20s-deadline]]). What is new is the **blast radius**: the failure is
not confined to the offending request. `/healthz` is a one-line JSON response that touches no report
and no database, so it failing proves the runtime itself — not one report — is broken.

This also makes deadline-adjacent measurements untrustworthy. Several apparent results during this
session were artefacts of it:

- a report recorded as `cold 68 ms, status 500, 876 rows` — self-contradictory, because the status
  was captured from the first rep while the row count came from a later successful one;
- fast 500s interleaved with successes on the same report in one run;
- an apparent "regression" that disappeared when the two arms were interleaved.

## Confound to be aware of when re-measuring

The degradation was observed while **another process was also benchmarking the same server on
:4000**. Concurrent load plausibly contributes — four runtime threads, several 20 s calls in flight —
and it is not separated out. What is *not* in doubt is the sequence: a deadline error is followed by
fast 500s and then by `/healthz` failing, and a restart clears it. What is not yet established is
how much concurrent load is required to trigger it, or whether a single request can.

## What is needed to settle it

1. Reproduce with **no other client** on the server: one request to `/reports/profit` on a cold cache
   key, then poll `/healthz`.
2. If a single request is enough, the host's deadline path is the defect and needs an upstream
   report — the panic is inside `wstd`'s server, so the guest cannot catch it.
3. If it needs concurrency, then the deadline is being enforced per *runtime* rather than per
   *request*, and one saturated runtime takes its neighbours down with it.

Until this is settled, **any benchmark of the heavy reports should record whether the server was
otherwise idle, and should assert `/healthz` after each measured report** — a run in which
`/healthz` degrades is measuring a dying runtime, and its numbers should be discarded.

## Related

- [[clean-slate-benchmark-cycle]] — the methodology note; a cold-run protocol needs this check added.
- [[snapshot-persistence-hits-the-20s-deadline]] — the original deadline finding this extends.