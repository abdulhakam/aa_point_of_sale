---
title: paymentsbycompany performance — what was measured, what was changed, what was rejected
type: note
status: active
created: 2026-10-02
tags: [reports, performance, sql, sqlite, spool, paymentsbycompany, benchmark]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[reports-and-ledgers]]", "[[a-reports-totals-come-from-a-sqlite-statement-that-wraps-the-report]]", "[[heavy-report-blocks-runtime-threads]]", "[[guest-report-performance-options]]", "[[imported-invoices-are-all-drafts-so-every-report-is-empty]]", "[[report-render-row-cap]]"]
---

# paymentsbycompany performance — what was measured, what was changed, what was rejected

2026-10-02. `paymentsbycompany` has the worst reputation in the vault — it is the report the
performance notes name when they say a report could not finish
([[heavy-report-blocks-runtime-threads]], [[new-system-report-timings]]). With the ledger restored
([[imported-invoices-are-all-drafts-so-every-report-is-empty]]) and real numbers available again,
this is what it actually costs and what could be taken out.

## First: the 12-second figure was wrong

An earlier note this session recorded `paymentsbycompany` at "**12.2 s warm**". That was wrong on both
counts and is corrected here rather than quietly replaced:

- It was the **JSON API** `/p/reports/paymentsbycompany/data`, not the page. That endpoint is
  **uncapped by design** ("an API consumer asked for the rows, so it gets every row") and no browser
  code uses it — the page is server-rendered. It returns 13,862 rows and 5.2 MB.
- It was **cold**: taken while the snapshot was still rebuilding after `mview` had been cleared.
  Warm, the same call is ~2–3 s, and the page the user actually opens is far cheaper.

The page is 126–172 ms warm. That is the number that matters.

## Where the time goes

The report is **one row per (payment, company) pair** — a payment is allocated across the companies
on its invoice in proportion to each company's share. 26,526 payments fan out to 13,862 rows.

Measured in-server (`/bench/spool`, which reports `queryMs`/`writeMs` for the spool) and against the
depot directly with `node:sqlite`:

| Stage | Cost |
|---|---|
| Row query, `LIMIT 1000` (the page) | ~0.5 s cold, ~0.1 s served |
| Totals statement (a second full pass over the same CTEs) | ~0.5 s cold |
| `writeMs` — shaping rows into the spool | ~0.1–0.3 s |

**The page caps at 1,000 rows but cannot avoid computing all 13,862**: the `ORDER BY` decides *which*
1,000. And the totals need every row anyway, so the second pass is inherent to the current design —
the page's footer must describe the whole filtered set, not the page of rows.

## Changed

**1. `company_share` now reads `net_rounded` instead of `transactions_report`** —
`trailbase/runtime/app/reports/sql/reports/payments_by_company.sql`.

It needs three things: the line's `net_amount`, the item's `category` (which is where `company` comes
from — `transactions_report` joins `items` for it) and the invoice's `unrounded` (already carried as
`unrounded_total` by `net_line`, with the same COALESCE the old `ic.unrounded` guard applied). All
three exist two CTEs earlier. Reading `transactions_report` dragged in `allocated`, `alloc_rounded`
and `profit_rounded`, so SQLite computed the invoice-discount allocation, the cost line and the
profit for all 23,413 transaction rows in order to throw three of the four away.

Grouping on `unrounded_total` (already COALESCE'd to 0) instead of the raw `ic.unrounded` merges
nothing: NULL and 0 take the same branch of the CASE and cannot both occur for one invoice, since it
is the same join key.

**2. The totals statement no longer carries the report's `ORDER BY`** —
`trailbase/runtime/app/lib/spoolreports.js`, `source()`.

An aggregate sums `SUM(CAST(x * 100 ± 0.5 AS INTEGER))` — **integer paisas** — so the order rows
arrive in cannot change a total. Sorting the 13,862-row fan-out to keep three sums was 121 ms of a
518 ms pass. The `pick` shape (the ledgers) deliberately keeps its sort: its `ORDER BY … LIMIT 1`
re-orders anyway, but there is no measurement here to say the sort is free there.

Result, controlled A/B in one process, 9 interleaved reps, medians:

| Arm | Before | After |
|---|---|---|
| Page query (`LIMIT 1000`) | 724 ms | **524 ms** |
| Totals pass | 872 ms | **749 ms** |
| **A cold page load** | **1596 ms** | **1273 ms (−20%)** |

Rows identical (all 13,862, byte for byte) and totals identical.

**A trap worth recording:** the first attempt broke 18 of the gate's checks with
`near "tiers": syntax error`. Every report's `ORDER BY` is preceded by a `--` comment block, so
stripping it left the statement ending *inside* a comment, and the wrap's closing `) AS t)` was
commented out. The strip has to append a newline. `tools/verify-spool-reports.mjs` is what caught
it, and it is why the newline is commented in the source rather than left as tidiness.

## Rejected, with the measurement

| Tried | Result |
|---|---|
| Push the date window and the type admit-list into the CTE, above the fan-out | **Slower** — 462 ms against 429 ms on the page arm, 621 against 563 uncapped. Every payment on this depot falls inside 2026, so the filter removes nothing and the extra predicate only stops SQLite folding the join |
| The same, with `LEFT JOIN company_share` tightened to `JOIN` | **Silently wrong** — 13,452 rows instead of 13,862. An invoice with no lines contributes a row with a NULL company through the LEFT JOIN; the inner join drops it. Caught by comparing output, not by timing |
| Replace `(SELECT id AS ref_id, name FROM parties)` subqueries with direct table joins | **Slower** — 943 ms against 760 ms. The subquery projects two columns; the direct join makes SQLite carry the whole row, and `parties` also makes bare `created` ambiguous |
| Drop `lower()` from the `ORDER BY` | No measurable change. Every stored date is ISO, so it cannot alter the collation |

## What is left

The cost that remains is intrinsic to the shape of the report: fan 26,526 payments out over their
invoices' companies, sort the result, and aggregate all of it. The two passes are now ~1.27 s cold
and the page serves in ~130 ms warm.

If it ever needs to be faster still, the lever is **not** more SQL tuning — it is the double pass.
Summing the totals from the spooled rows instead of a second SQL execution would remove ~750 ms of
cold cost, and would be *more* trustworthy (same rows, same pass) rather than less. It was not done
here because it moves the money rules from SQL into JS, and the paisa-integer discipline that
[[a-reports-totals-come-from-a-sqlite-statement-that-wraps-the-report]] exists to enforce is
precisely what that change would put at risk.

The other thing worth knowing: `/p/<slug>/data` is uncapped and returns 5.2 MB for this report. It
is an API for programmatic consumers and the browser does not use it, so its cost is not on the
user's path — but it is the slowest thing in the app if anyone does call it.

## Gates

`node tools/verify-spool-reports.mjs` from `trailbase/`, after the change:

```text
14 passed, 0 failed, 0 not ported
totals compared against the column they print: 13
binds verified: 72
totals: 15 proven the exact paisa sum of their rows, 26 corroborated by a second construction
```

Every report page and ledger still renders in the app: 91–504 ms warm, all `200`.