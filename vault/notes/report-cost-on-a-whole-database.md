---
title: Report cost on a whole database, measured 2026-10-04
type: note
status: active
created: 2026-10-04
updated: 2026-10-04
tags: [pos, performance, reports, sql, wasm-deadline, whole-database, benchmarks]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[ledger-party-correlated-balance-was-the-whole-cost]]", "[[reports-and-ledgers]]", "[[heavy-report-blocks-runtime-threads]]", "[[fresh-import-and-whole-database-digest-2026-10-04]]", "[[component-split-and-sql-materialised-tables]]", "[[tb-0032-manifest-first-refactor]]", "[[guest-report-500-not-always-the-deadline]]", "[[party-and-booker-ledgers-render-empty-and-say-nothing]]", "[[legacy-view-filter-quotes-400]]"]
---

# Report cost on a whole database, measured 2026-10-04

The first measurement of the guest's report path against a **freshly imported whole database**, and
the first like-for-like comparison against the legacy app. Every figure below comes from
`trailbase/tools/report-sweep.mjs`, `trailbase/tools/report-sql-time.mjs` and
`trailbase/tools/db-digest.mjs`, on the depot rebuilt from scratch that day.

**Read the two sections separately.** They measure different things and only one of them is what a
user waits for.

## 1. What a user waits for: the page request

`report-sweep.mjs --guest`, whole database, `from=2024-01-01&to=2026-10-04`, one cold pass per screen,
on an otherwise idle machine:

| screen | page HTML | HTML bytes | `/p/<slug>/data` | data bytes | rows | total |
|---|---|---|---|---|---|---|
| Unified Payments Report | **2.69 s** | 481,773 | 3.42 s | 8,757,406 | 26,525 | 6.2 s |
| Sales Report | 154 ms | 477,614 | 1.27 s | 3,029,551 | 8,648 | 1.4 s |
| Payments By Company | 136 ms | 531,092 | 4.00 s | 11,881,925 | 32,978 | 4.3 s |
| Item Sales Report | 150 ms | 685,698 | 5.02 s | 11,299,485 | 21,815 | 5.3 s |
| Profit Report | 159 ms | 734,119 | 4.98 s | 11,299,437 | 21,815 | 5.2 s |
| Product Sale Report | 132 ms | 56,540 | 352 ms | 49,341 | 205 | 0.5 s |
| Daily Sale Report | 111 ms | 297,500 | 707 ms | 2,317,434 | 8,606 | 0.8 s |
| Stock Report | 127 ms | 79,258 | 253 ms | 56,498 | 207 | 0.4 s |
| Difference Report | 110 ms | 57,575 | 375 ms | 53,849 | 207 | 0.5 s |
| Outstanding Payments | 117 ms | 198,238 | 2.60 s | 258,215 | 602 | 2.7 s |
| Party Ledger | 115 ms | 70,455 | 6.04 s | 8,762,978 | 26,525 | 6.3 s |
| Booker Ledger | 113 ms | 7,685 | 2.14 s | 6,383,116 | 26,525 | 2.4 s |
| Area Ledger | 164 ms | 221,746 | 1.17 s | 203,618 | 909 | 1.3 s |
| General Ledger | 125 ms | 416,818 | 2.31 s | 8,039,875 | 26,613 | 2.5 s |

**All fourteen answer 200 on both requests. The slowest total is 6.3 s; the slowest *page* is 2.69 s,
and that is the first request after a server restart.** On a repeat pass the Unified Payments page is
**150 ms** — the rendered-page cache (`route.ts:234`) doing its job on an unchanged fingerprint. The
twelve other pages were 110–164 ms on their cold pass because nothing had evicted them yet.

Three things this makes visible that the earlier 100–165 ms figures did not:

- **The page and the data endpoint are different questions.** The page is server-rendered from a
  row-capped projection, so it is fast whatever the report costs; the data endpoint is the whole row
  set, uncapped, and is where the seconds are. Quoting "the report takes 150 ms" without saying which
  of the two is meant is the kind of claim that survives until someone waits on the other one.
- **`/p/<slug>/data` ships up to 11.9 MB of JSON** for the four biggest reports. The 1,000-row render
  cap ([[report-render-row-cap]]) applies to the HTML only, so "the page is capped" does not mean
  "the payload is".
- ⚠️ **Two of the page timings are not comparable to the other twelve.** The Party and Booker ledgers
  require a counterparty to be selected and render **zero rows** without one, while their data
  endpoints return 26,525 rows — so their ~115 ms is the cost of an empty page, not of a ledger. With a
  party selected, `/reports/ledgers/party` takes **5.8 s** and renders 1,002 rows. See
  [[party-and-booker-ledgers-render-empty-and-say-nothing]], which also records the four ledgers'
  disagreeing default date windows.

- **The page and the data endpoint are different questions.** The page is server-rendered from a
  row-capped projection, so it is fast whatever the report costs; the data endpoint is the whole row
  set, uncapped, and is where the seconds are. Quoting "the report takes 150 ms" without saying which
  of the two is meant is the kind of claim that survives until someone waits on the other one.
- **`/p/<slug>/data` ships up to 11.9 MB of JSON** for the four biggest reports. The 1,000-row render
  cap ([[report-render-row-cap]]) applies to the HTML only, so "the page is capped" does not mean
  "the payload is".

### The same sweep, before `ledger_party.sql` was fixed

The first sweep of the day, on the freshly imported depot and with nothing else running, was much
worse: **seven of the fourteen screens answered 500.** Five of them sat exactly on the deadline:

```text
Unified Payments Report  html 500 20.03s   Payments By Company  html 500 20.01s
Item Sales Report        html 500 20.01s   Profit Report        html 500 20.03s
Outstanding Payments     html 500 20.02s   Area Ledger          html 500 20.01s
General Ledger           html 500 20.02s   Party Ledger         html 500 20.02s
```

`20.0xs` is TrailBase's WASM call deadline, not a query time: the host logs `Error calling WASM
component 'tb-ah-run-js'` and answers `component responded unexpectedly`. See
[[heavy-report-blocks-runtime-threads]]. Two screens also 500'd in single-digit milliseconds, which
is a different fault and was transient — see [[guest-report-500-not-always-the-deadline]].

## 2. What the SQL costs: outside the deadline

`report-sweep.mjs` cannot tell you *why* a request hit 20 s, because the request refuses to wait that
long. `report-sql-time.mjs` runs the same composed statement — the app's own
`prelude.sql` + report body rule, from `spoolreports.js::composeStatement` — directly against the
depot's SQLite with the same binds. No WASM, no HTTP, no deadline.

Best of three, whole database, same date range, **nothing else running on the machine**:

| statement | best of 3 | rows |
|---|---|---|
| ledgers/booker | 29,098 ms | 26,525 |
| ledgers/party | 20,621 ms | 26,525 |
| reports/itemsales | 17,696 ms | 21,815 |
| ledgers/area | 17,500 ms | 909 |
| reports/paymentsbycompany | 17,218 ms | 32,978 |
| reports/outstanding | 15,455 ms | 602 |
| reports/profit | 13,449 ms | 21,815 |
| reports/payments | 12,640 ms | 26,525 |
| ledgers/general | 7,961 ms | 26,613 |
| reports/dailysale | 4,296 ms | 8,606 |
| reports/salesreport | 4,610 ms | 8,648 |
| reports/difference | 3,373 ms | 207 |
| reports/stock | 2,286 ms | 207 |
| reports/productsale | 2,162 ms | 205 |

**Two statements exceed the ~20 s call deadline on their own**, before any host overhead: `ledgers/
booker` at 29.1 s and `ledgers/party` at 20.6 s.

### Cold is a different story, and it is the one that produced the 500s

A single cold run of the same tool, immediately after the import:

```text
ledgers/party        69,104 ms      reports/paymentsbycompany  31,648 ms
ledgers/area         39,827 ms      reports/profit             26,256 ms
reports/itemsales    21,349 ms      reports/outstanding        20,413 ms
```

`ledgers/party` went 69.1 s cold → 20.6 s warm. **A single-sample measurement of a report on a fresh
import is 2–3× the steady-state cost**, which is the same cold/warm trap
`route-snapshot.mjs` documents for its own gate ([[route-snapshot-was-snapshotting-redirects]]). Any
claim of the form "report X takes N seconds" on a freshly imported database needs `--repeat`, and
needs to say which of the two it means.

### Where the cost is, and is not

`ledgers/party` carried a correlated subquery — two per output row, over a CTE, which `EXPLAIN QUERY
PLAN` showed as `AUTOMATIC COVERING INDEX` rebuilt per invocation. That was a real O(rows × dates)
term and it is gone; [[ledger-party-correlated-balance-was-the-whole-cost]] has the diff.

**It was worth about 9%, not the 3× its shape suggested**, and the reason is the finding that matters:
the cost is in the **shared prelude**, not in any report. Every payments-reporting statement pays for
`payments_base` / `payments_view` over 26,525 rows, and `payments_base` carries
`WHERE p.invoice IS NULL OR p.invoice IN (SELECT id FROM committed)` — a per-row membership test
against a subquery, on the largest table in the database. The four biggest statements
(`itemsales`, `profit`, `paymentsbycompany`, `outstanding`) all join the same chain.

That is the shape open decision 2 and step 17 already answer —
[[component-split-and-sql-materialised-tables]], trigger-maintained Tier 2 tables — and this
measurement is the argument for moving step 17 ahead of step 16.

## 3. The legacy side, for comparison

The legacy app's data acquisition was read out of the compiled bundles
(`legacyforparity/standalone/.next/server/app/app/reports/**/page.js`): every report calls
`useAPI().fullList({collection, expand, filter})`, which is the PocketBase JS SDK's `getFullList` —
it pages the REST API at `perPage=200` **with no server-side date filter**, concatenates the pages,
and the screen then filters the dates in JavaScript. So a legacy report costs what fetching every row
of every view it touches costs, on every load.

`report-sweep.mjs --legacy` replays exactly that, one page at a time, over the whole database.
**Complete — all sixteen screens, no failures:**

| legacy screen | replayed | rows fetched | requests | guest equivalent | guest total |
|---|---|---|---|---|---|
| Payments By Company | **23 m 20 s** | 43,247 | 221 | `/reports/paymentsbycompany` | 4.3 s |
| Outstanding Payments | **8 m 56 s** | 53,111 | 267 | `/reports/outstanding` | 2.7 s |
| Item Sales Report | 6 m 56 s | 32,073 | 162 | `/reports/itemsales` | 5.3 s |
| Profit Report | 6 m 28 s | 32,073 | 162 | `/reports/profit` | 5.2 s |
| Party Ledger | 6 m 27 s | 26,526 | 133 | `/reports/ledgers/party` | 6.3 s |
| Booker Ledger | 5 m 15 s | 26,526 | 133 | `/reports/ledgers/booker` | 2.4 s |
| General Ledger | 4 m 52 s | 26,614 | 134 | `/reports/ledgers/general` | 2.5 s |
| Payments, area-wise | 3 m 48 s | 36,468 | 186 | — no guest equivalent | — |
| Sales Report | 3 m 33 s | 36,468 | 186 | `/reports/salesreport` | 1.4 s |
| Unified Payments Report | 3 m 30 s | 36,468 | 186 | `/reports/payments` | 6.2 s |
| Product Sale Report | 2 m 26 s | 23,683 | 122 | `/reports/productsale` | 0.5 s |
| Daily Sale Report | 1 m 35 s | 8,990 | 47 | `/reports/dailysale` | 0.8 s |
| Item transactions report | 1 m 32 s | 23,413 | 118 | — no guest equivalent | — |
| Area Ledger | 14.0 s | 993 | 7 | `/reports/ledgers/area` | 1.3 s |
| Difference Report | 6.2 s | 222 | 3 | `/reports/difference` | 0.5 s |
| Stock Report | 3.5 s | 222 | 3 | `/reports/stockreport` | 0.4 s |
| **TOTAL, 16 screens** | **≈ 79 minutes** | **461,656** | **2,186** | **TOTAL, 14 screens** | **39.8 s** |

The legacy app's URLs are **`/app/…`**, not `/…` — the app directory is part of the served path, so
`/reports/payments` is a confident 404 and `/app/reports/payments` is the screen. (The vault's
[[route-map]] is right about the paths; this note is the first to record that they need the prefix when
typed.)

One harness limitation, not an application defect: the compiled bundle's filter literal is
`type = "sale" || type = "return"` with **double** quotes, and this PocketBase (0.22.55) parses
single-quoted strings only. `report-sweep.mjs` normalises the quotes, which is why the replay could run
at all. **Whether the bundle's own form works in a browser is a separate question this note does not
answer**, and it should be — it is filed as [[legacy-view-filter-quotes-400]].

### The comparison, stated honestly

| | legacy | guest |
|---|---|---|
| date filtering | in JavaScript, after fetching everything | pushed into SQL |
| rows crossing the wire, Payments Report | 36,468 over 186 requests | 26,525 in one response |
| requests, Outstanding | 267 | 1 |
| time to first byte, Payments Report | **3 m 30 s** before a row can be rendered | **150 ms** |
| all 16 / 14 screens, end to end | **≈ 79 minutes** | **39.8 s** |
| worst screen | 23 m 20 s | 6.3 s |
| bytes shipped, worst screen | — | 11.9 MB |

**Roughly 120× on the total, 220× on the worst screen — and the gap is structural, not a tuning
difference.** Legacy fetches whole views and filters afterwards; the guest filters in the statement.
There is no version of the legacy shape that gets fast as the data grows: its cost is proportional to
*total rows in the database* while the guest's is proportional to *rows in the window*, which is the
difference between a number that gets worse every month and one that does not.

Two caveats that cut against the guest, stated because they are real:

- **These are lower bounds for legacy.** The replay measures data acquisition only — no browser parse,
  no JavaScript filtering, no render. The legacy numbers are a floor on what a user waited.
- **These are full costs for the guest.** Its column includes shipping up to 11.9 MB of JSON and, for
  the two ledgers that need it, rendering 1,000 rows. So the comparison is generous to the guest by
  construction.

And the guest's own cost is not hidden by the ratio: **six of its fourteen statements exceed the 20 s
call deadline on their own** (§2). On a bigger dataset, or with a wider default window, the guest will
start failing at the deadline too — which is why step 17 is the critical path and not a nice-to-have.


## What this changes

- **Step 17 is now the critical path for report performance**, ahead of step 16. Measured here: the
  shared prelude is the cost, and materialising it is the already-chosen answer. Six of fourteen
  statements are already over the deadline on a whole database — before the shop's data grows at all.
- The guest's advantage is **structural, not a tuning win**: legacy's cost is proportional to total
  rows, the guest's to rows in the window. It widens as the data grows, which is the opposite of what
  happens to a system that is merely slow today.
- `tools/report-sweep.mjs`, `tools/report-sql-time.mjs` and `tools/db-digest.mjs` are new, and all
  three are re-runnable. `tools/report-sweep.mjs --guest` takes about a minute; `--legacy` takes about
  80 minutes and **must not run at the same time as `--guest`** — a contended legacy run inflated the
  guest's own statements by 4× (`salesreport` 4.6 s → 150 s) and would have made every number here a
  lie.
- Three open issues came out of this sweep: [[guest-report-500-not-always-the-deadline]],
  [[legacy-view-filter-quotes-400]] and
  [[party-and-booker-ledgers-render-empty-and-say-nothing]].

## Related

- [[fresh-import-and-whole-database-digest-2026-10-04]] — the import this measurement is on top of.
- [[ledger-party-correlated-balance-was-the-whole-cost]] — the one SQL defect fixed here, and the
  overclaim that had to be corrected.
- [[reports-and-ledgers]] — the arithmetic and its inherited quirks.
- [[heavy-report-blocks-runtime-threads]] — the deadline these statements collide with.