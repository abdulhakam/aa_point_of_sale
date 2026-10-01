---
title: A report's totals come from a second SQLite statement that wraps the report, and JS keeps only the labels
type: decision
status: accepted
decided_on: 2026-10-01
created: 2026-10-01
tags: [reports, sql, totals, sqlite, quickjs, performance]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[report-rows-are-spooled-not-parsed]]", "[[spooling-report-rows-through-kv]]", "[[tb-0022-move-reports-to-sql]]", "[[payments-report-totals-computed-from-display-rows]]", "[[report-parity-flakes-on-float-arithmetic]]", "[[money-is-2dp-everywhere]]", "[[six-report-defects-the-empty-filter-parity-gate-could-not-see]]"]
---

# A report's totals come from a second SQLite statement that wraps the report, and JS keeps only the labels

## The decision

A report runs **two** statements against SQLite:

1. the report statement, capped by `LIMIT` for the page and spooled by address;
2. a **totals statement** that wraps the report statement and reduces it to one row of scalars.

```sql
SELECT COUNT(*) AS rowCount,
       printf('%.2f', SUM(credit)) AS credit,
       printf('%.2f', SUM(debit))  AS debit
FROM ( <the report statement> ) AS t
```

The totals are **values**, not addresses: one row of formatted strings, and QuickJS holds a dozen of
them. That is not "results in JS" — it is a scalar aggregate, and it is what the totals strip and the
page payload need.

## Why the totals statement WRAPS the report rather than restating it

Because a total computed over a *different* row set from the one the report prints is a wrong total
that looks right. The wrap makes that impossible: the aggregate reads the very statement the page
renders, so the two cannot drift.

The per-report knowledge is a small declarative spec in the registry — which aggregate expression
produces which key — not a second `.sql` file. A file would be a place for the filters to be typed
twice and diverge.

The alternative was copying the report's projection into a totals file. Rejected: the `outstanding`
and `stockreport` projections are long, and the money rule would then exist in two files per report.

## The row cap is a `LIMIT`, not a slice

The page renders at most `RENDER_MAX_ROWS`. Slicing in JS would have to bring all 26k rows into
QuickJS to drop most of them — the exact cost the spool removes. So the cap goes on the statement, and
the **uncapped** totals statement supplies the full count, which is how the page can still say
"showing first 1000 of 26,099".

## What stays in JS, and why

- **Label wiring.** `report-pages.js` keeps `totals: (t) => [{ rows: [{ label: "Final Balance", value: t.balance }] }]`.
  That is presentation — it reads `t.<key>` and pairs it with a label. It is already zero-arithmetic
  in the existing code, so moving it to SQL would move **display strings** into the database and leave
  the browser's `data-total-key` contract with nothing to read.
- **The general ledger's opening row**, which echoes three filter inputs and queries nothing.
- **Filter composition** — which parameters the statement declares and in what order.

What is gone from JS: every arithmetic operation. The route no longer calls `A.service.run` at all
unless a page sets `useJs: true`.

## Cost, measured

On this depot over all 14 reports, the aggregate pass is within noise of a bare `COUNT(*)` over the
same statement — **5,401 ms against 5,320 ms** for the whole set — because it reads the same CTEs and
never materialises a row. Two passes is not two times the cost. A `SELECT COUNT(*) FROM ( … )` is not
a proxy for a full row scan, and measuring it as one would have been the wrong conclusion.

## Two shapes

- **aggregate** (13 reports) — `SUM`/`COUNT` over the wrapped statement. Always returns one row;
  `SUM` over an empty set is NULL and `printf('%.2f', NULL)` is `0.00`, which is the JS default.
- **pick** (`ledgers/party`, one report) — the total is the **last row's** balance, so the value is
  read from a materialised CTE by a scalar subquery. No window functions: **the guest's SQLite rejects
  `COUNT(*) OVER ()` at prepare time**, which surfaced as a page dying in 8 ms with no cause. And the
  CTE body is `SELECT * FROM ( … )`, not a bare nested `WITH … AS ( <report> )`, because SQLite
  re-evaluated the inner `WITH` per reference instead of materialising it — 8.5 s against 0.2 s.

## The fallback

`useJs: true` on a report page definition, or `compute.useJs: true` on a declarative page, re-enables
`compute/reports.js` for that page alone. It is normalised to a strict boolean by
`lib/pages.js` and read through `reportPages.useJsFor()`, so a stray non-empty value cannot switch a
money report's execution path. It is an escape hatch, not a second implementation to maintain.
