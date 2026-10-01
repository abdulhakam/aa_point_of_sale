---
title: A report's total can disagree with the sum of its own printed column
type: issue
status: open
severity: medium
created: 2026-10-01
updated: 2026-10-01
tags: [reports, money, rounding, productsale, paisa]
related_to: ["[[money-is-2dp-everywhere]]", "[[sql-rounding-differs-from-js-round2]]", "[[report-page-definitions-duplicated-and-already-divergent]]"]
---

# A report's total can disagree with the sum of its own printed column

## The defect

`/reports/productsale` (Product Sale Report) prints 205 rows, each with a 2 dp `amountText`, and a
`Total` that is **not the sum of those 205 printed numbers**. Measured 2026-10-01 on the production
depot:

```text
rows the report shows:                     205
1. sum of round2(per-row), in paisa:       29,988,457.51
2. reported Total  toCents(SUM(float)):    29,988,457.52
3. sum of the per-row PRINTED amounts:     29,988,457.50
```

So the total is **2 paisa above** what a user adding up the column gets, and **1 paisa above** the
correctly-rounded per-row sum.

Exactly one row is responsible:

```text
item 116023525354   raw = 134116.525   printed = 134116.52   delta = -0.01
```

`134116.525` sits exactly on a half-paisa boundary. `printf('%.2f', …)` rounds it **down** to
`134116.52`, while the repo's own `round2` (round-half-up, `compute/format.js:9`) and the prelude's
`toCents` both round it **up** to `134116.53`. The printed column and the total are using two
different rounding rules on the same value.

## What this is not

It is **not** the 1-paisa SQL-vs-JS difference the parity gate reports
(`productsale.amount 29988457.51 (js 29988457.52)`). The probe settled that separately: both the SQL
and the JS sum the same binary floats, so they differ by accumulation order, not by a rule
difference. That is float noise on a 30-million total and is not worth chasing.

This issue is the *other* one — a visible inconsistency inside a single rendered page.

## Root cause

Two rounding rules coexist:

| | rule | on `134116.525` |
|---|---|---|
| `printf('%.2f', x)` (SQLite/C) | round-half-to-even on the decimal repr | `134116.52` |
| `round2` / `toCents` (the app's money rule) | round-half-up | `134116.53` |

`transaction_view.total` is a REAL expression, so a value landing exactly on `.xx5` is not a
coincidence to be dismissed — it is the case the two rules disagree on by construction. The vault
already records that money is round-half-up everywhere ([[money-is-2dp-everywhere]]), which makes
`printf` the outlier.

## Why it matters

A report whose footer does not add up to its own body is the kind of thing an operator notices
immediately and stops trusting. It is 2 paisa on 30 million — immaterial as money, material as
credibility, and it will be reported as "the totals are wrong" with no way to reproduce it.

## Options

1. **Render the column with the app's money rule instead of `printf`.** Replace
   `printf('%.2f', sg.amount)` in `productsale.sql` with the prelude's `toCents`-style expression
   divided by 100, so the printed value and the total round identically. Fixes the visible
   inconsistency at its source.
2. **Compute the total as the sum of the printed column.** Guaranteed self-consistent, and it makes
   the footer authoritative by construction. Changes the total by the 1 paisa the gate already
   flags.
3. **Leave it**, on the grounds that 2 paisa is immaterial.

Option 1 is the smallest and preserves the existing total. Option 2 is the stronger guarantee and is
the one that makes "the footer equals the column" an invariant rather than a coincidence — but it
should be decided together with the `productsale.amount` drift, not separately.

## The general rule this suggests

A report's total should be provably the sum of the values it prints. Today it is a separate
aggregate over the same rows, computed with a different rounding construction. That is a structural
gap, not a one-row bug: **no gate compares a rendered report's footer against its own column.**

## Status

Open, unfixed. Found by `trailbase/tools/paisa-probe.mjs` (written during the same session as
[[report-page-definitions-duplicated-and-already-divergent]]), not by an existing gate.

## Evidence

- `trailbase/runtime/app/reports/sql/reports/productsale.sql` — `printf('%.2f', sg.amount) AS amountText`.
- `trailbase/runtime/app/compute/format.js:9` — `round2` is `Math.round((v + EPSILON) * 100) / 100`.
- `trailbase/runtime/app/lib/spoolreports.js` — `toCents` is `((x) * 100 + 0.5)` with a negative-half
  correction, i.e. round-half-up.
- `trailbase/tools/paisa-probe.mjs` — reproduces all three totals and names the offending row.