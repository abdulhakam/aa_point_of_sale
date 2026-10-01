---
title: "A heavy report blocks the other runtime threads, so concurrent requests fail fast"
type: issue
status: resolved
severity: high
created: 2026-09-29
updated: 2026-09-29
tags: [reports, performance, concurrency, quickjs, trailbase, demo]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[report-build-cold-cache-near-the-call-deadline]]", "[[snapshot-persistence-hits-the-20s-deadline]]", "[[tb-0022-move-reports-to-sql]]", "[[tb-0028-guest-transactional-screens-and-mobile]]", "[[component-split-and-sql-materialised-tables]]"]
---

# A heavy report blocks the other runtime threads, so concurrent requests fail fast

Measured 2026-09-29 on the loaded production depot (8,935 invoices, 23,421 transactions, 26,526
payments) with `--runtime-threads=4`, while building [[tb-0028-guest-transactional-screens-and-mobile]].

## What happens

The four reports the vault already flags as over the deadline — `profit`, `itemsales`,
`paymentsbycompany`, `ledgers/general` — each fail cold at **~20.3 s** with
`component responded unexpectedly`. That is the documented deadline problem
([[report-build-cold-cache-near-the-call-deadline]]).

The new finding is what happens to the *other* requests while one of those is running. Three report
requests issued back to back, where the first is heavy:

| Request | Result | Elapsed |
| --- | --- | --- |
| `/reports/profit` (all dates) | 500 `component responded unexpectedly` | 20 279 ms |
| `/reports/itemsales?from=2026-09-01&to=2026-09-02` | 500 `component responded unexpectedly` | **187 ms** |
| `/reports/paymentsbycompany?from=2026-09-01&to=2026-09-02` | 500 `component responded unexpectedly` | **218 ms** |
| the same two, retried one at a time | **200** (1 081 ms / 724 ms) | |

The filtered versions are *not* slow — the same query returns in about a second when nothing heavy
is in flight. So the 200 ms failures are not a compute failure at all: the runtime is saturated, and
a request that cannot get a thread is dropped rather than queued.

## Why it matters for the demonstration

An operator opening two report tabs, or a supervisor checking a report while someone else is on the
profit screen, gets a bare 500. It looks like a bug in the app and it is not one — it is the same
root cause as the deadline: the report arithmetic (60k rows shaped in QuickJS) runs *on the request
path* and holds a runtime thread ([[tb-0022-move-reports-to-sql]]).

## What would fix it

Only moving the compute off the request thread does, and that is the tracked work:

1. **SQL materialised tables** maintained by triggers (step 16–17), so a report is a small read.
2. Failing that, the already-built durable queue ([[jobs-in-process-durable-queue]]) plus a
   page-level "building" response: the report page renders a placeholder, the job writes the result,
   the client polls. `route.ts` already does exactly this for the invoice-document rebuild, which is
   why `POST /invoice-doc/rebuild` survives a 3–10 s rebuild while an equivalent report page does not
   ([[jobs-in-process-durable-queue]]).

## Measured: the rest of the reports are fine

| Report | Cold | Note |
| --- | --- | --- |
| `stockreport` | 209 ms | |
| `difference` | 670 ms | |
| `outstanding` | 214 ms | |
| `payments` | 281 ms | |
| `dailysale` | 335 ms | |
| `productsale` | 1 082 ms | |
| `salesreport` | 1 141 ms | |
| `ledgers/area` | 1 392 ms | |
| `profit` / `itemsales` / `paymentsbycompany` / `ledgers/general` | 20 s+ | **fail cold** |

Note that `route.ts` already caps the *table body* at 1 000 rows with a "show all" link
([[report-render-row-cap]]); the cost is in computing the rows, not in the ones rendered.

## Related

- [[report-build-cold-cache-near-the-call-deadline]] — the deadline itself, measured 2026-09-24.
- [[tb-0022-move-reports-to-sql]] — the fix, 4/15 boxes.


## RE-VERIFIED 2026-10-01: the deadline half is fixed, and the blocking half no longer reproduces

Both halves of this note are stale against the running app.

**The four reports that used to fail the 20 s deadline now return 200 in 100-165 ms** on the
production depot:

```text
profit            200  165 ms
itemsales         200  138 ms
paymentsbycompany 200  100 ms
ledgers/general   200  107 ms
```

**The blocking half no longer reproduces.** An uncapped `payments` (26,108 rows, 10 MB) was started
and a light `/dashboard` was requested 700 ms later, while the heavy report was still running:

```text
light /dashboard during heavy: 200 in 64 ms
heavy                          = 200
```

A light route is no longer starved. The SQL spool is why: the rows never enter QuickJS, they are
serialised in Rust and handed over by KV address, so a heavy report no longer occupies a runtime
thread for its whole duration ([[spooling-report-rows-through-kv]]).

The engine limits themselves stand - TrailBase's guest is single-threaded per request with a ~20 s
call deadline ([[trailbase-guest-cpu-js-limits]]) - and an uncapped 10 MB report is still slow
(2.8 s warm, 7.5 s cold). But the specific failure this note recorded, and the deadline failures, are
no longer what happens.

One process note worth keeping: the first measurement of `?all=1` returned 404 for all four reports,
and a re-test moments later returned 200 with the full row count. The cause was not identified, and
the honest reading is that **a single 404 from this app is not necessarily reproducible** and should
be retried before being treated as a finding. An earlier test in the same session also passed an
HTML-escaped href (`&#x2f;…&amp;…`) literally and produced a nonsense result.
