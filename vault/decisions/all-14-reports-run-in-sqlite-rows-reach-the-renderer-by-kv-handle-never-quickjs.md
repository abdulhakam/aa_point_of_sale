---
title: All 14 reports run in SQLite; rows reach the renderer by KV handle, never QuickJS
type: decision
status: accepted
decided_on: 2026-09-30
created: 2026-09-30
tags: [reports, sql, wasm, quickjs, spool, performance, kv]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[report-rows-are-spooled-not-parsed]]", "[[spooling-report-rows-through-kv]]", "[[tb-0022-move-reports-to-sql]]", "[[money-is-2dp-everywhere]]", "[[guest-report-performance-options]]", "[[legacy-sql-views-differ-from-js-views]]", "[[report-logic-stays-runtime-file-based]]"]
---

# All 14 reports run in SQLite; rows reach the renderer by KV handle, never QuickJS

Every report in `compute/REPORTS` now has a SQL statement that produces its finished display rows.
JS composes the statement, calls `sqlite.spool`, and receives `{ key, rows, bytes, queryMs, writeMs }`
— a small object. The renderer reads the rows back out of the KV store and iterates them **in Rust**.
No result row is ever materialised in QuickJS.

```text
JS    compose SQL -> sqlite.spool(name, sql, cols, params)
Rust  query -> JSONL -> KV                                    (tb-ah-run-js/src/spool.rs)
JS    <- { key, rows, bytes, queryMs, writeMs }                (never rows)
Rust  render.spooled: KV key -> JSONL -> minijinja context    (tb-ah-run-js/src/render.rs)
```

Supersedes the plan in [[tb-0022-move-reports-to-sql]], which expected the legacy `sql/views/` files
to be reused. They were not reused: they are known to differ from the JS
([[legacy-sql-views-differ-from-js-views]]), so each statement was ported from `compute/` directly and
gated against it.

## Measured, in the real guest (`tools/run-spool-sweep.ps1`, 4 threads, 3 reps, wide filter)

Every report returns real rows, and **14/14 render byte-identical HTML** under both transports.

| report | rows | rows-through-JS | spooled | gain |
|---|---:|---:|---:|---:|
| payments | 26,099 | 4,364 ms | 3,636 ms | 16.7 % |
| salesreport | 8,240 | 1,644 | 1,509 | 8.2 % |
| paymentsbycompany | 32,561 | 6,009 | 5,027 | 16.3 % |
| profit | 21,823 | 6,745 | 5,610 | 16.8 % |
| itemsales | 21,823 | 6,596 | 5,672 | 14.0 % |
| stockreport | 207 | 232 | 208 | 10.3 % |
| difference | 207 | 176 | 171 | 2.8 % |
| ledgers/party | 26,099 | 17,791 | 16,932 | 4.8 % |
| ledgers/booker | 26,099 | 3,626 | 2,740 | 24.4 % |
| ledgers/area | 872 | 746 | 709 | 5.0 % |
| ledgers/general | 26,186 | 4,706 | 3,352 | 28.8 % |
| dailysale | 8,185 | 1,220 | 932 | 23.6 % |
| outstanding | 600 | 1,348 | 1,451 | **−7.6 %** |
| productsale | 205 | 188 | 196 | **−4.3 %** |
| **sum** | | **55,391 ms** | **48,145 ms** | **13.1 %** |

The gain tracks how many rows a report reads: the two 26k-row ledgers gain 5–24 %, while `stockreport`
(207 rows), `difference` (207), `productsale` (205) and `outstanding` (600) are at or below noise —
their cost was never the transport, so there was nothing to win. **Two reports are slightly slower**
through the spool (KV write plus read-back on a small result); that is real, not noise, and it is the
expected shape.

## Two things this cost that are not obvious

**`floor()` does not exist in the guest's SQLite.** TrailBase's bundled build does not compile
`SQLITE_ENABLE_MATH_FUNCTIONS`: `floor`, `ceil`, `trunc`, `iif` and `mod` are all absent (`abs`,
`sign`, `printf`, `round` are present — verified with `/bench/sqlfn` against the running guest).
node:sqlite **has** them, so the entire port verified green in Node against the wrong engine and only
failed on contact with the real one (`no such function: floor`).

`round2` is therefore rebuilt from CAST, which is SQL syntax and truncates toward zero:

```
floor(z) == CAST(z AS INTEGER) - (CASE WHEN z < 0 AND z <> CAST(z AS INTEGER) THEN 1 ELSE 0 END)
round2(v) == (CAST(t AS INTEGER) - (CASE ... )) / 100.0      where t = (((v) + EPSILON) * 100) + 0.5
```

Verified against JS `Math.round` over 5,684 values — every exact half (`v.xx5`), both signs, 5,000
random — 0 mismatches, and re-confirmed inside the running guest. The three obvious forms are each
wrong: `ROUND(v,2)` rounds half away from zero, a single `CAST(x*100 + 0.5)` truncates toward zero on
negatives, and mirrored ± branches put `-50.625` at `-50.63` instead of `-50.62`.

**A correlated subquery can be slower than the JS it replaces.** `ledgers/party`'s balance was first
written inline and appeared FOUR times per row (twice for `balance`, once per copy of `t` inside the
round2 template, and twice more for `balanceText`), each a correlated `MAX` plus a correlated `SUM`.
That is O(rows × dates) and it **exceeded TrailBase's own 20 s request timeout** on 26,099 rows — the
SQL was over 100× slower than the JS, where the same work is one `Map` lookup. Computed once per row in
a CTE it renders in 12.9 MB inside the budget. A port is not automatically faster; the shape of the
query decides, and only the running guest shows it.

## What is NOT verified

- **Five tolerated float differences, all exact-half-paisa.** One party of 872 has a true group
  difference of exactly 2774.495; JS's accumulation order lands on 2774.494999999999 → 2774.49 and
  SQLite's `SUM` order on 2774.4950000000026 → 2774.50. Same mathematics, different float addition
  order, one paisa. Forcing SQLite's order was tried and is **worse** — an ordered window `SUM`
  changed 664 credits and 754 balances versus 1, because it perturbs every group rather than only the
  boundary ones. Reported by the gate rather than hidden.
- **Totals are computed by the consumer, not the statement.** A report statement returns rows; the
  row-shaped total is summed from them the way the JS reduces it. Each report reduces differently
  (see `compareTotals` in `tools/verify-spool-reports.mjs`), and applying one formula to all fourteen
  reports the same way reports a real mismatch twice or hides it.
- **The spooled path is not yet wired into the live report pages.** `/bench/spool` exercises it; the
  page routes still call `A.service.run`. Enabling it per report is the next step, not this one.

## Related

- [[report-rows-are-spooled-not-parsed]] — the handle decision, measured on one report.
- [[spooling-report-rows-through-kv]] — the mechanism, the gates, and the porting rules.
- [[tb-0022-move-reports-to-sql]] — the parent task, updated with what superseded it.
- [[money-is-2dp-everywhere]] — the rule `round2` implements.