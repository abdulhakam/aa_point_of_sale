---
title: Persisting the report snapshot to SQLite does not beat the 20 s call deadline
type: issue
status: open
severity: high
created: 2026-09-28
updated: 2026-09-28
tags: [reports, performance, guest, wasm, deadline, materialization]
related_to: ["[[new-system-report-timings]]", "[[guest-report-performance-options]]", "[[runtime-js-single-host]]", "[[compiled-artifacts-are-generic-capabilities]]", "[[trailbase-guest-cpu-js-limits]]"]
---

# Persisting the report snapshot to SQLite does not beat the 20 s call deadline

## What was built (2026-09-28)

A generic **materialised-snapshot** capability, implemented entirely in runtime files (no host
rebuild), to work around the host's `thread_local` QuickJS state
(`trailbase/host/src/runtime.rs`), where each of the 4 runtime threads has its own snapshot and
therefore rebuilt every view inside the request:

- `app/lib/reports.js` — the built views are persisted to `mview(name, data)` (one JSON blob per
  view) with a `mview_meta` fingerprint/version. `getViews` hydrates **per view, lazily** from the
  store when the fingerprint matches; the build path upserts (merge, never shrink) and the
  `POST /jobs/reconcile` minutely job drives `refresh` off the request path.
- `ahscripts/routes/_app/route.ts` — the reconcile route calls `A.service.refresh(db)` so the
  snapshot is materialised by the job, not by a report request.

This is a genuine generic capability (stores view rows as opaque JSON) and a real improvement — the
heavy reports stopped erroring outright and the store converges to all 14 views.

## The finding

The largest views are enormous JSON blobs, and **hydrating them is itself multi-second**, so a heavy
report still crosses the ~20 s call deadline. Store contents on the production depot:

| view | size |
|---|---|
| paymentsInvoicesReport | 17.1 MB |
| transactionsReport | 13.7 MB |
| paymentsView | 13.7 MB |
| transactionView | 11.7 MB |
| ledgerParty / ledgerBooker / ledgerJournal | 8.7 / 8.3 / 6.4 MB |

Measured (production depot, 60k rows, fresh filters, post-restart so hydration is exercised):

| report | before (in-memory per-thread) | after (persisted snapshot) |
|---|---|---|
| stockreport | 86 ms warm / 4.8 s build | **2.0 s** (hydrate 3/3) — slower cold |
| difference | 104 ms | 4.7 s |
| ledgers/area | 99 ms | 11.7 s |
| payments | 3.9 s | 4.4 s |
| ledgers/general | 4.1 s | 13.9 s |
| itemsales | **500 @ 20 s** | 16.8 s (200) |
| profit | **500 @ 20 s** | 16.7 s (200) or **500** |
| paymentsbycompany | **500 @ 20 s** | **500 @ 20 s** |

So the capability moved the failure boundary but did not clear it, and it made the small reports
*slower on a cold thread* (JSON.parse of a multi-MB blob replaces a 100 ms result). A failed heavy
call also leaves the runtime wedged (`wstd` `ConnectionReset` panic; subsequent calls fail fast
until restart).

## Conclusion

The bottleneck is **not** view *building* alone — it is QuickJS doing per-row shaping, the
multi-MB JSON crossing into QuickJS, and the minijinja render of ~21k rows, all inside the
unchangeable ~20 s per-call deadline ([[trailbase-guest-cpu-js-limits]]).

The fix is the one already ranked in [[guest-report-performance-options]]: keep the heavy work out
of QuickJS — aggregate/serve from SQL against the materialised tables, render fewer rows
(pagination/cap), or move compute native. Persisting the snapshot is a useful building block (a
shared, inspectable store) but not the answer by itself.

## Evidence

- `trailbase/runtime/app/lib/reports.js` — `mview` persistence + per-view hydration.
- `trailbase/runtime/ahscripts/routes/_app/route.ts` — reconcile drives `refresh`.
- `trailbase/traildepot/data/main.db` — `mview` (14 views, sizes above), `mview_meta`.
- Server log `[mview] hydrate 3/3`, `[mview] persist N views`, and the 20 s `Error calling WASM
  component` for `profit` / `paymentsbycompany`.
- [[new-system-report-timings]] — the measured tables.
