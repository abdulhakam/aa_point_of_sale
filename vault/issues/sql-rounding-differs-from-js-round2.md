---
title: SQLite round() does not match the JS round2() — money must round in JS
type: issue
status: resolved
severity: medium
created: 2026-09-27
updated: 2026-09-27
tags: [reports, sql, rounding, parity, money]
related_to: ["[[legacy-sql-views-differ-from-js-views]]", "[[tb-0022-move-reports-to-sql]]", "[[reports-and-ledgers]]", "[[tb-0015-integer-cents-for-money]]"]
---


## RESOLVED 2026-10-01

The rule is inverted and there is nothing left to match. The user set it: **all calculations go
through SQL**, and where the JavaScript and SQL answers differ, the SQL answer is the one that stands
— the engine's float behaviour is not the standard.

Concretely, `productsale.sql` renders its column with `printf('%.2f', …)` (round-half-to-even) while
the app's money rule is round-half-up, so on a value landing exactly on `.xx5` the printed column and
the total disagree by one paisa. That is recorded separately as
[[report-total-disagrees-with-its-own-printed-column]] and is a **statement** to fix, not a
comparison against JavaScript.

# SQLite round() does not match the JS round2() — money must round in JS

## Mitigated (2026-09-27)

The extractor now emits a **JS-faithful** rounding expression instead of SQLite's `round()`:

```sql
(CASE WHEN ((COALESCE(expr, 0)) + 2.220446049250313e-16) * 100 >= 0
   THEN CAST(((COALESCE(expr, 0)) + 2.220446049250313e-16) * 100 + 0.5 AS INTEGER)
   ELSE -CAST(-(((COALESCE(expr, 0)) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) END) / 100.0
```

— `Math.round((x + EPSILON) * 100) / 100`, with `COALESCE` mirroring the JS `num()` (null → 0).

Result: **`transactionView` (23,413) and `invoiceView` (8,927) are now identical** (the latter also
needed `unrounded_total` left unrounded, as the JS keeps it), and `transactionsReport` fell
90 → **38**. Remaining rounding-related residue:

- `transactionsReport` 38 / 23,413 — `profit`/`final_amount` on some rows are `0` in SQL but
  negative in JS (e.g. `js=-27 sql=0`), i.e. a value/Null nuance in that report-level view.

## Original finding

After converting `printf('%.2f', expr)` to `round(expr, 2)`, the row differences collapsed
(`transactionView` 46,826 → 34) but a residue remained, and it was exactly rounding:

```text
transactionView  profit:      js=851.18   sql=851.17
                 net_amount:  js=1074.2   sql=1074.19
invoiceView      unrounded_total: js=283934.94999999995  sql=283934.95
```

SQLite's `round()` rounds half away from zero on the decimal representation; the JS `round2`
(`compute/format.js`) does `Math.round((v + Number.EPSILON) * 100) / 100` on the binary double.
On exact halves and values just below a cent, they disagree by one cent
(0.15 % of `transactionView`, 1.8 % of `invoiceView`, 0.38 % of `transactionsReport`).

## Consequence

Round money with the JS-equivalent expression above (done), **or** return raw values and let the JS
`round2` in the `sql+js` last mile. Do **not** use SQLite's `round()` for money.

## Evidence

- `trailbase/tools/extract-legacy-views.mjs` — `jsRoundLike` (deleted 2026-10-02 with the legacy
  view layer).
- `trailbase/tools/view-equivalence.mjs` — `transactionView` 23,413/23,413 identical (deleted
  2026-10-02 with the legacy view layer).
- `trailbase/runtime/app/compute/format.js` — `round2`.

## Related

- [[legacy-sql-views-differ-from-js-views]] — the wider "SQL ≠ JS" finding.
- [[tb-0022-move-reports-to-sql]] — the task.
- [[tb-0015-integer-cents-for-money]] — the deeper fix (store cents as integers).

