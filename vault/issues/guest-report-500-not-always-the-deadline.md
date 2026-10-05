---
title: A guest report 500 is not always the deadline
type: issue
status: open
created: 2026-10-04
updated: 2026-10-04
tags: [guest, reports, wasm, deadline, 500, transient, harness]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[report-cost-on-a-whole-database]]", "[[heavy-report-blocks-runtime-threads]]", "[[route-snapshot-was-snapshotting-redirects]]"]
---

# A guest report 500 is not always the deadline

`route-snapshot.mjs` retries a 500 twice before recording it, and its comment says why: the ~20 s
WASM call deadline makes the heavy reports "genuinely load-dependent", and a gate that cries wolf
trains you to ignore diffs. That is right, and it has a blind spot.

## What was seen

The first report sweep of 2026-10-04, against a **freshly imported** depot, produced fourteen 500s.
Seven sat exactly on the deadline — `20.01s`, `20.02s`, `20.03s` — and looked exactly like the known
deadline. **Two did not:**

```text
Sales Report        html 500   148ms  32b  "component responded unexpectedly"
Product Sale Report html 500     6ms  32b  "component responded unexpectedly"
```

A 6 ms failure is not a timeout. Nothing took twenty seconds; the component returned immediately and
the host still reported `Error calling WASM component 'tb-ah-run-js'`.

## What was ruled out

Both routes answered **200** when requested again directly, the second time within seconds:

```text
/reports/productsale?from=2024-01-01&to=2026-10-04   200  15,988ms
```

So the route, the SQL and the filter were all fine. Both reports are among the cheapest in the system
(2.2 s and 4.6 s for the statement), so this was not the deadline wearing a fast hat either.

**Not reproducible afterwards: 45 consecutive requests across the three routes — 15 each of
`/reports/productsale`, `/reports/salesreport`, `/reports/difference` — answered 200 every time**,
median 131–192 ms. That was after a server restart and after the `ledger_party.sql` change, so it
does not establish that the SQL was involved; it establishes only that the fault is gone here.

## What was not established

**The cause.** The candidates in the server log at the time, none confirmed:

- `Rusqlite: no such table: pagecache` — the rendered-page cache reads a table **no migration creates**.
  `pageCacheGet` catches it and returns `null` (`route.ts:236-241`), and `pageCachePut` creates the
  table with `IF NOT EXISTS`, so on a fresh depot the first request logs an error for every report and
  the second is clean. Handled, but it is a missing migration, and the log is noisy because of it.
- `report materialize failed: TypeError …` — a **stale call site** in `/jobs/reconcile` reading
  `snap.built.length` off a service that no longer has a `built` field. Fixed 2026-10-04; see
  [[fresh-import-and-whole-database-digest-2026-10-04]].
- `/ahscripts/init directory not found` — logged on many requests and harmless; the depot has no init
  scripts.

Neither of the first two throws into the request path, so neither obviously explains a 6 ms 500. **The
honest state is: seen twice, on the first requests against a freshly imported depot, never again in
45 requests, cause unknown.**

## Why it is filed rather than dismissed

Because the retry in `route-snapshot.mjs` now hides it. A transient 6 ms 500 is exactly what a
two-retry gate exists to absorb — which is the right behaviour for the gate, and the wrong reason to
stop looking. Recorded so that a future single-sample sweep does not quietly inherit the retry's
assumption and report "load-dependent" over something else.

**The check that would settle it** is the host's error text for the component call, which the log
prints as only `Error calling WASM component 'tb-ah-run-js': <path>` — the underlying message is not
surfaced. Until it is, a fast 500 on this host is not diagnosable from the outside.

## Related

- [[report-cost-on-a-whole-database]] — the sweep this came from, and the seven deadline 500s.
- [[heavy-report-blocks-runtime-threads]] — the deadline that *does* explain most of them.
- [[route-snapshot-was-snapshotting-redirects]] — the harness whose retry hides this class.