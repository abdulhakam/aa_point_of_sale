---
title: "A heavy report blocks the other runtime threads, so concurrent requests fail fast"
type: issue
status: open
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
