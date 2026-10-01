---
title: Money is 2 decimal places everywhere — stored, transported and displayed
type: decision
status: accepted
decided_on: 2026-09-27
created: 2026-09-27
tags: [money, floats, precision, reports, data-integrity]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[report-parity-flakes-on-float-arithmetic]]", "[[tb-0015-integer-cents-for-money]]", "[[tb-0022-move-reports-to-sql]]", "[[reports-and-ledgers]]"]
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
([[tb-0022-move-reports-to-sql]]).

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

## Evidence

- The Node-vs-guest differential harness (`trailbase/tools/guest-parity.mjs`, removed with the
  Node app) recorded `3987.6899999999996 vs 3987.69` on `reports/paymentsbycompany`
  ([[guest-app-host-port]]).
- `trailbase/runtime/app/compute/format.js` — `round2`, `money`.
- [[tb-0015-integer-cents-for-money]] — the storage-level form of the same goal.
- `trailbase/tools/audit-money-columns.mjs` — measures how much of each numeric column is already
  whole paisas, and by how much the rest is not. Re-runnable against any depot.

## What is and is not implemented today

The read boundary complies and has been verified: every report money value, every payload money value
and every rendered figure is 2 dp, and the report totals are integer paisas
([[a-reports-totals-come-from-a-sqlite-statement-that-wraps-the-report]]).

**The write boundary and the backfill do not.** 9,247 stored rows still carry more than 2 dp, and two
`payments.amount` values are not whole paisas at all (`1551.375`, `3987.696`), as is one
`invoices.discount_1` (`1.75555`) and two `transactions.qty` (`16.735`, `0.075`). So point 1 of the
decision — "writes round every money field to 2 dp before insert/update" — is not yet true, and point
4 — the backfill — has not been run.

## Related

- [[report-parity-flakes-on-float-arithmetic]] — the flake this removes.
- [[tb-0015-integer-cents-for-money]] — cents-as-integers is a valid implementation of this rule.
- [[tb-0022-move-reports-to-sql]] — unblocked by it.
