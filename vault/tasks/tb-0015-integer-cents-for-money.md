---
title: TB-0015 Money storage — re-scoped: the drift is in unit prices, and cents would be wrong there
type: task
status: done
priority: high
created: 2026-09-26
updated: 2026-10-01
tags: [schema, money, floating-point, trailbase, correctness, data-migration]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[trailbase-pocketbase-data-compatibility]]", "[[data-model]]", "[[component-split-and-sql-materialised-tables]]", "[[money-is-2dp-everywhere]]", "[[a-reports-totals-come-from-a-sqlite-statement-that-wraps-the-report]]", "[[trailbase-stale-depot-skips-migration]]", "[[reports-and-ledgers]]"]
---

# TB-0015 Money storage — re-scoped

**CLOSED as re-scoped.** Integer cents were declined by the owner on 2026-10-01 after measurement: the drift is
in the per-unit columns, where cents would be wrong. What was actually missing was the WRITE path, and that
is now fixed. The measurement, the decision and what remains are below.

## What the task assumed

> Every monetary column is `REAL`… `printf("%.2f")` was used to *hide* accumulated error. Moving
> prices and amounts to `INTEGER` cents is both more correct and faster, and is a mechanical change
> while the database is still empty.

Three of those clauses are now false. The database is **not** empty (60,245 records); the change is
**not** mechanical (measured below); and the drift is **not** where integer cents would fix it.

## The measurement

`node trailbase/tools/audit-money-columns.mjs trailbase/traildepot/data/main.db` — re-runnable against
any depot. A value is "not 2 dp" when `x * 100` is not an integer.

| column | rows | not 2 dp | share |
|---|---|---|---|
| `items.cost_price` | 207 | 77 | 37.2% |
| `transactions.cost_price` | 23,421 | 6,576 | **28.1%** |
| `transactions.price` | 23,421 | 2,573 | 11.0% |
| `items.sale_price` | 207 | 18 | 8.7% |
| `payments.amount` | 26,526 | 2 | 0.01% |
| `expenses.amount` | 88 | 0 | 0% |
| `invoices.discount_rs` | 8,935 | 0 | 0% |
| `invoices.discount_1` | 8,935 | 1 | 0.01% |
| `transactions.qty` | 23,421 | 2 | 0.01% |

**The columns where integer cents would be correct are already clean.** Amounts — what is actually
summed — are whole paisas to within three rows in 35,000. There is no drift there to recover.

**The drift is entirely in the per-unit columns**, and it is not noise:
`transactions.price` holds values to 3, 4, 5 and 6+ decimal places, the last being repeating
fractions (`85.4166`, `54.1666`, `41.6666`) with no exact decimal form at all. `items.cost_price`
holds 3, 4, 5, 6+ and 7 dp values. A cost of `36.875` is three decimals because it is a **cost per
unit**, and the profit line multiplies it by a quantity — so the sub-paisa precision is load-bearing
by construction.

## What enforcing the rule actually costs

[[money-is-2dp-everywhere]] mandates 2 dp everywhere including storage, and its caveat says a total
built from a `6.375` cost "shifts by a cent". That is per-line. Rounding every money column to 2 dp in
a **copy** of the depot touched **9,247 rows** and moved **13 of 14 report totals**:

| report | total | before | after | move |
|---|---|---|---|---|
| `outstanding` | `invoice` | 26,077,761.96 | 27,108,986.16 | **+1,031,224.20** |
| `outstanding` | rows | 600 | 607 | **+7 rows** |
| `profit` | `profit` | 3,440,456.64 | 3,399,919.29 | −537.35 |
| `payments` | `invoiceTotal` | 59,452,995.79 | 59,453,475.53 | +479.74 |
| `ledgers/general` | `recievable` | 3,702,090.02 | 3,702,010.35 | −79.67 |
| `ledgers/booker` | `balance` | 3,148,776.08 | 3,149,414.91 | +638.83 |

Two things make this a decision rather than a migration:

- **The shift is systematic.** Most affected values sit on a positive half-paisa, so half-up rounds
  them all up, and 9,247 lines of one-directional bias is the million.
- **Rows appear and disappear.** `outstanding` selects parties whose balance rounds to at least 1, so
  a per-unit price rounding changes *which parties are in the report*. A storage-encoding choice is
  altering the contents of a financial report, not just its formatting.

## The decision (owner, 2026-10-01): leave prices REAL, round at the multiplication

A unit price is a **rate**, not an amount. Its precision is real — a cost of `36.875` is three
decimals because it is a cost per unit — and it is consumed by a multiplication, so the rounding
boundary is the multiplication, which the prelude's `line_totals` already does per line.

**Integer cents are not adopted.** So the task's original mechanism is closed as declined, and what
remains is the write path, which is where the rule was actually not being enforced.

## The real gap: the rule was only ever enforced at the READ boundary

`U1790300100__round_money_to_2dp.sql` implements the owner's rule as a scaffold backfill. It ran when
the tables were **empty**, so it rounded nothing. The v1 importer then wrote money through
`Number(v)` with no rounding at all and reintroduced the residue — 9,247 rows, hidden behind a read
boundary that rounds per line. A rule enforced only where you read is not enforced; it is concealed.

The 9,247 sub-paisa rows are therefore **not** a defect under the decision: they are unit prices and
rates, which stay REAL on purpose. The two genuine strays were `payments.amount` at `1551.375` and
`3987.696`, which are amounts.

## Done

- [x] Measure which columns carry sub-paisa values, and what enforcing 2 dp would cost
- [x] **Owner decision**: leave unit prices REAL; round amounts; percentages and quantities are rates
- [x] Fix the write path — `app/plugins/import-from-v1/index.html` has a `money()` coercer on the
      amount fields (`payments.amount`, `expenses.amount`, `invoices.discount_rs`,
      `transactions.discount_rs`), so the import cannot reintroduce what the backfill cleaned
- [x] `U1790402000__round_amount_columns_to_whole_paisas.sql` — idempotent backfill for the amounts the
      import left behind. `payments.amount` now audits clean; 2 rows changed
- [x] Record the unit convention in [[money-is-2dp-everywhere]]: amounts are whole paisas, per-unit
      prices and percentages and quantities are REAL rates rounded at the multiplication
- [x] Correct [[money-is-2dp-everywhere]]'s caveat, which said a total built from a `6.375` cost
      "shifts by a cent" — measured, it is +1,031,224.20 on one report
- [x] Keep `tools/audit-money-columns.mjs` as the standing check

## Consequence worth keeping

The amount backfill moved four report totals by exactly one paisa each, and cut the divergence from
the retired JS reference from **nine totals to one**. The eight that now agree are the ones whose
float accumulation had been fed residue — so a two-row data fix removed eight of the nine "known
paisa differences" that were previously written off as inherent to the float reference. The one
remaining is `productsale.amount`, where the exact paisa total is `29988457.51` against a float sum of
`29988457.52`.

## Not done, and why

- **`invoiceNo` → `INTEGER`** — declined. It is an identifier, every value is already integral, so
  there is no drift to fix, and changing a column type means rebuilding a record-API table on live data
  with the checksum hazard attached ([[trailbase-stale-depot-skips-migration]]) for no accuracy gain.
- **`qty` / `scheme` precision** — not needed. They are quantities; `16.735` and `0.075` are fractional
  cartons and REAL is the right type. Recorded rather than converted.
- **`discount_1` of `1.75555`** — a percentage, i.e. a rate, and left REAL with the rest of them.

## Residual risk, restated honestly

The *storage* is not where a paisa is lost. Amounts are whole paisas, per-unit precision is real and
intended, the read boundary rounds per line, and the report totals are integer paisas
([[a-reports-totals-come-from-a-sqlite-statement-that-wraps-the-report]]). The remaining risk is a
**code** risk — new arithmetic that forgets a `round2`, or a `SUM` written outside the totals statement
— and the mitigation is the gate, which now proves every report total is the exact paisa sum of its
rows.

## Related

- [[money-is-2dp-everywhere]] — the accepted rule, its corrected caveat, and the write-path fix.
- [[a-reports-totals-come-from-a-sqlite-statement-that-wraps-the-report]] — the totals that are already
  exact.
- [[trailbase-pocketbase-data-compatibility]] — why `REAL` in the first place.
- [[trailbase-stale-depot-skips-migration]] — the checksum hazard that made this cheap at scaffold time.
