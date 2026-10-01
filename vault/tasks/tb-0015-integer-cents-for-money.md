---
title: TB-0015 Money storage — re-scoped: the drift is in unit prices, and cents would be wrong there
type: task
status: blocked
priority: high
created: 2026-09-26
updated: 2026-10-01
tags: [schema, money, floating-point, trailbase, correctness, data-migration]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[trailbase-pocketbase-data-compatibility]]", "[[data-model]]", "[[component-split-and-sql-materialised-tables]]", "[[money-is-2dp-everywhere]]", "[[a-reports-totals-come-from-a-sqlite-statement-that-wraps-the-report]]", "[[trailbase-stale-depot-skips-migration]]", "[[reports-and-ledgers]]"]
---

# TB-0015 Money storage — re-scoped

**Status: blocked on an owner decision.** The task as written should not proceed: its premise does not
survive measurement, and executing it would move reported money by material amounts. What follows is
the measurement and the recommendation.

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

## Recommendation: split the rule by what the number IS

The rule's real requirement is that **no amount which is summed, transported or displayed carries
residue** — and that is already guaranteed, verified, at the read boundary, and now exact at the
totals ([[a-reports-totals-come-from-a-sqlite-statement-that-wraps-the-report]]).

A unit price is a **rate**, not an amount. Its precision is real and it is consumed by a
multiplication, so the right place to round it is the multiplication — which is exactly what
`line_totals` already does, per line, in the prelude, and what the smoke suite pins.

So:

- **Amounts** (`payments.amount`, `expenses.amount`, `invoices.discount_rs`) → whole paisas. 3 stray
  rows to fix, then round on write. Cheap, and it makes the stored value independent of a rounding
  rule.
- **Unit prices and costs** (`items.*`, `transactions.price`, `transactions.cost_price`) → **leave
  `REAL`**, and record explicitly that they are deliberately finer than a paisa. Converting them
  costs over a million in one report and is wrong.
- **Percentages and quantities** (`discount_1`, `discount_2`, `scheme`, `qty`) → not money. One
  `discount_1` of `1.75555` and two fractional `qty` values need a precision decision, not a
  conversion.
- **`invoices.invoiceNo`** → `INTEGER`. It is an identifier (1 … 20,240,501), every value is already
  integral, and `REAL` there is pure PocketBase residue.

## Subtasks

- [x] Measure which columns actually carry sub-paisa values, and what enforcing 2 dp would cost
- [ ] **Owner decision** on the four-way split above, and on whether `outstanding` gaining 7 parties
      is acceptable — it changes a report's contents, not just its numbers
- [ ] Fix the three amount rows (`payments.amount` 1551.375, 3987.696; `invoices.discount_1` 1.75555)
- [ ] Round money on write, so point 1 of [[money-is-2dp-everywhere]] becomes true
- [ ] `invoices.invoiceNo` → `INTEGER`
- [ ] Precision decision for `qty` / `scheme` (fractional cartons are real: 0.075, 16.735)
- [ ] Document the unit convention in [[data-model]]: amounts are paisas, unit prices are rates finer
      than a paisa, and the rounding boundary is the multiplication
- [ ] If the owner still wants integer cents, write it as a migration over live data with a
      reconciliation, and expect the shifts above — not as a scaffold-era edit

## Risk if skipped

Lower than this note originally claimed, and worth restating honestly: the *storage* is not where a
paisa is lost. Amounts are already whole paisas; per-unit precision is real and intended; and the
read boundary rounds per line and the totals are integer paisas. The residual risk is a **code** risk
— new arithmetic that forgets a `round2`, or a `SUM` written outside the totals statement — and the
mitigation for that is the gate, which now proves every report total is the exact paisa sum of its
rows.

## Related

- [[money-is-2dp-everywhere]] — the accepted rule, and the corrected magnitude of its caveat.
- [[a-reports-totals-come-from-a-sqlite-statement-that-wraps-the-report]] — the totals that are already
  exact.
- [[trailbase-pocketbase-data-compatibility]] — why `REAL` in the first place.
- [[trailbase-stale-depot-skips-migration]] — the checksum hazard that made this cheap at scaffold time.
