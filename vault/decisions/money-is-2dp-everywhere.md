---
title: Money is 2 decimal places everywhere — stored, transported and displayed
type: decision
status: accepted
decided_on: 2026-09-27
created: 2026-09-27
tags: [money, floats, precision, reports, data-integrity]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[report-parity-flakes-on-float-arithmetic]]", "[[tb-0015-integer-cents-for-money]]", "[[tb-0022-move-reports-to-sql]]", "[[reports-and-ledgers]]", "[[sql-review-2026-10-02]]"]
---

# Money is 2 decimal places everywhere — stored, transported and displayed

## Decision (owner, 2026-09-27)

**No money value may carry more than two decimal places at any point**: not in the database, not
in API/report payloads, not in rendered output. Insignificant digits (beyond 2) must not exist
anywhere.

Concretely:

1. **Writes** round every money field to 2 dp before insert/update, so the depot never stores a
   sub-cent amount.
2. **Report/API data** carries money already rounded to 2 dp (the JS `round2`), not raw float
   residue — `result.rows[].amount = 3987.68` and never `3987.6899999999996`.
3. **Display** formats money to 2 dp (`money` / `printf('%.2f')` in templates).
4. Existing rows with sub-cent values are **backfilled** to 2 dp (a data migration).

## Why this also fixes the flakiness

The former Node-vs-guest differential flaked on exactly this: one side emitted an **unrounded**
money value while the other emitted the rounded one ([[report-parity-flakes-on-float-arithmetic]]).
If money is rounded to 2 dp in the data on both sides, the last-bit residue cannot appear and the
comparison is stable. Expected side effect: `USE_SQL_VIEWS` can be turned on without the flake
([[tb-0022-move-reports-to-sql]]). **It never was:** the flag and its `.sql` views were deleted
2026-10-02 — see [[legacy-parity-checks-waived]].

## Caveat to watch — CORRECTED 2026-10-01, the magnitude is not a cent

Rounding **unit prices** to 2 dp changes derived totals where the current data has more precision
(e.g. a `cost_price` of `6.375` becomes `6.38`). The owner has chosen this rule, so the change is
intended.

**What the original caveat got wrong:** it said a total built from such a price "shifts by a cent".
That is per-line. Measured on this depot, the shift compounds.

`node trailbase/tools/audit-money-columns.mjs` and the copy-and-diff that followed it
([[tb-0015-integer-cents-for-money]]) found **9,247 rows** carrying more than 2 dp, concentrated in
the per-unit columns — 28% of `transactions.cost_price`, 11% of `transactions.price`, 37% of
`items.cost_price`, with `items.sale_price` and `transactions.price` holding values like `85.4166`
that repeat and have no exact decimal form at all. Rounding those to 2 dp in a COPY of the depot, and
diffing every report total before against after:

| report | total | before | after |
|---|---|---|---|
| `outstanding` | `invoice` | 26,077,761.96 | **27,108,986.16** (+1,031,224.20) |
| `outstanding` | rows | 600 | **607** |
| `profit` | `profit` | 3,440,456.64 | **3,399,919.29** (−537.35) |
| `ledgers/general` | `recievable` | 3,702,090.02 | **3,702,010.35** |
| `payments` | `invoiceTotal` | 59,452,995.79 | **59,453,475.53** |
| `ledgers/party` | `balance` | 2,460.00 | 2,459.96 |

**13 of 14 report totals move.** The direction is systematic: most of the affected values sit on a
positive half-paisa (`.875`, `.375`, `.125`, `.4166`), so half-up rounds them up, and 9,247 lines of
that bias is the million.

`outstanding` gaining 7 rows is the clearest sign that this is not a display concern: the report
selects parties whose balance rounds to at least 1, so a per-unit price rounding across two decimal
places changes **which parties exist in the report**.

So the rule is still the owner's to make, but it is not the mechanical change the note described, and
it should not be executed as a blind backfill. See [[tb-0015-integer-cents-for-money]] for the
re-scoping and the recommendation.

## Where the rule applies, and where it does not (owner, 2026-10-01)

The rule is a rule about **amounts**: a number that is summed, transported or displayed must be exactly
2 dp, and it now is — verified at the read boundary, and exact integer paisas at the report totals
([[a-reports-totals-come-from-a-sqlite-statement-that-wraps-the-report]]).

A **unit price or cost is a rate, not an amount**, and stays `REAL` with more precision than a paisa.
Its precision is real — a cost of `36.875` is three decimals because it is a cost per unit — and it is
consumed by a multiplication, so the rounding boundary is the multiplication, which is what the
prelude's `line_totals` already does per line.

That was decided against a measurement, not a preference. Rounding the per-unit columns moves 9,247
rows and 13 of 14 report totals, including **+1,031,224.20** on `outstanding.invoice`, **−537.35** on
reported profit, and it **adds 7 parties** to `outstanding` — that report selects parties whose
balance rounds to at least 1, so a per-unit price rounding changes which parties are in the report.
The numbers are in [[tb-0015-integer-cents-for-money]].

Percentages (`discount_1`, `discount_2`) and quantities (`qty`, `scheme`, `box_size_qty`) are also
rates and are likewise left `REAL`. One `discount_1` is `1.75555` and two `qty` are `16.735` and
`0.075`; fractional cartons are real.

## What was missing, and is now fixed: the WRITE path

Point 1 of the decision says writes round every money field to 2 dp before insert. That was not true,
and why is worth recording.

`U1790300100__round_money_to_2dp.sql` implements the rule as a scaffold backfill. It ran when the
tables were **empty**, so it rounded nothing. The v1 importer then wrote money through `Number(v)` with
no rounding at all and reintroduced the residue — 9,247 rows, sitting behind a read boundary that hid
them. A rule enforced only at the read boundary is not enforced; it is hidden.

- The importer's write path is fixed: `app/plugins/import-from-v1/index.html` has a `money()` coercer
  on the amount fields only.
- `U1790402000__round_amount_columns_to_whole_paisas.sql` cleans up the amounts that import left
  behind — 2 `payments.amount` rows, `1551.375` and `3987.696`. `payments.amount` now audits clean.

That moved four report totals by exactly one paisa each, and it cut the divergence from the old JS
reference from **nine totals to one**. The eight that now agree are the ones whose float accumulation
had been fed residue. The one remaining is `productsale.amount`, where the exact paisa total is
`29988457.51` and the float sum of 205 rows is `29988457.52`.

`invoices.invoiceNo` stays `REAL`. It is an identifier, every value is already integral, so there is no
drift to fix, and a `REAL`→`INTEGER` change means rebuilding a record-API table on live data for no
accuracy gain.

## Evidence

- `trailbase/tools/audit-money-columns.mjs` — how much of each numeric column is already whole paisas,
  and by how much the rest is not. Re-runnable against any depot.
- The Node-vs-guest differential harness (`trailbase/tools/guest-parity.mjs`, removed with the
  Node app) recorded `3987.6899999999996 vs 3987.69` on `reports/paymentsbycompany`
  ([[guest-app-host-port]]).
- `trailbase/runtime/app/compute/format.js` — `round2`, `money`.
- [[tb-0015-integer-cents-for-money]] — the measurement, and why integer cents were not adopted.

## Related

- [[report-parity-flakes-on-float-arithmetic]] — the flake this removes.
- [[tb-0015-integer-cents-for-money]] — re-scoped; the storage-level form, and why not this one.
- [[tb-0022-move-reports-to-sql]] — unblocked by it.
