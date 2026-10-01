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
WITH totals_src AS (SELECT * FROM ( <the report statement> ) AS t),
     tiers     AS (SELECT COUNT(*) AS rowCount,
                         SUM(CAST(x * 100 + 0.5 AS INTEGER)) AS recieving_c,
                         …                                      FROM totals_src)
SELECT COUNT(*) AS rowCount, printf('%.2f', s.recieving_c / 100.0) AS recieving, …
FROM (SELECT recieving_c - recieved_c - recievingReturns_c AS totalRecieving_c, … FROM tiers) AS s
```

The totals are **values**, not addresses: one row of formatted strings, and QuickJS holds a dozen of
them. That is not "results in JS" — it is a scalar aggregate, and it is what the totals strip and the
page payload need.

## The arithmetic is integer paisas, and that is the accuracy standard

Every amount becomes a whole number of **paisas** inside the `tiers` layer, the sums are integer
sums, and the division by 100 happens once on the way out. A total is therefore *the exact sum of the
rows behind it*, and its value does not depend on the order SQLite happened to add in.

The alternative — a float `SUM` of two-decimal amounts — is not a rounding preference, it is a
correctness bug with a small magnitude: representation error accumulates, and where the true total
lands near a half-paisa the answer flips. On this depot exactly one party in 872 has a group sum on
such a boundary, and the float form put the area-ledger credit total a paisa away from the true
figure. Reproducible, and for no reason a bookkeeper could name
([[report-parity-flakes-on-float-arithmetic]]).

**The standard for a total is therefore absolute, not "matches the old JS".** `compute/reports.js`
accumulates floats in row order and rounds once at the end, so it is an *approximation* of the same
quantity; reproducing its drift would be agreement with an approximation, not accuracy. Nine totals
differ from it by a paisa and the SQL is right in every case. The gate therefore proves the SQL is
exact rather than proving it agrees:

- **exact** — the total equals the integer paisa sum of its rows, reduced independently;
- **sound** — a derived total satisfies its `{op, terms}` definition over the SQL's own other totals;
- **corroborated** — a second, independently written paisa construction produces the same integers,
  which is what covers a `CASE` bucket that cannot be reduced from rows in JS.

Ties are broken **half up**, the accounting convention, and are chosen on merit. On the values the
money rule already guarantees — the 2 dp projections — a tie cannot occur at all, so the rule only
decides genuinely sub-paisa input. The general ledger is the one report where it matters, because its
account columns are raw (1 dp, e.g. `2422.5`) rather than rounded, and it is worth exactly one paisa
there.

## Why the totals statement WRAPS the report rather than restating it

Because a total computed over a *different* row set from the one the report prints is a wrong total
that looks right. The wrap makes that impossible: the aggregate reads the very statement the page
renders, so the two cannot drift.

The per-report knowledge is a small declarative spec in the registry — a `cents` map of per-row
expressions, a `derived` map of `{op, terms}` over the paisa sums, and a `consts` map. It is data
rather than functions precisely so the gate can evaluate the same definitions independently. A second
`.sql` file would be a place for the filters to be typed twice and diverge.

`derived` being data also collapsed the float form's `round2(round2(a) - round2(b))` into a single
subtraction of integers: the nesting existed only to correct a float sum, and there is no float sum
left to correct.

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

- **aggregate** (13 reports) — the `tiers`/`s` form above. Always returns one row; `SUM` over an empty
  set is NULL and `printf('%.2f', NULL)` is `0.00`, which is the JS default.
- **pick** (`ledgers/party`, one report) — the total is the **last row's** balance, so the value is
  read from the materialised CTE by a scalar subquery. No window functions: **the guest's SQLite rejects
  `COUNT(*) OVER ()` at prepare time**, which surfaced as a page dying in 8 ms with no cause. And the
  CTE body is `SELECT * FROM ( … )`, not a bare nested `WITH … AS ( <report> )`, because SQLite
  re-evaluated the inner `WITH` per reference instead of materialising it — 8.5 s against 0.2 s.

## The fallback

`useJs: true` on a report page definition, or `compute.useJs: true` on a declarative page, re-enables
`compute/reports.js` for that page alone. It is normalised to a strict boolean by `lib/pages.js` and
read through `reportPages.useJsFor()`, so a stray non-empty value cannot switch a money report's
execution path. It is an escape hatch, not a second implementation to maintain.

Its totals can differ from the spooled ones by a paisa, for the reason above. That is expected of a
fallback that is being retired, not a defect in either.
