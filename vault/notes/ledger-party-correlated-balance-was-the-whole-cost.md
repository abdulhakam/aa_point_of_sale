---
title: The party ledger's correlated balance, and the overclaim that came with it
type: note
status: active
created: 2026-10-04
updated: 2026-10-04
tags: [pos, sql, performance, ledger, correlated-subquery, window-function, correction]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[report-cost-on-a-whole-database]]", "[[reports-and-ledgers]]", "[[tb-0032-manifest-first-refactor]]", "[[three-reference-docs-lost-their-line-structure]]"]
---

# The party ledger's correlated balance, and the overclaim that came with it

`ledgers/party` was the slowest report in the system — **69.1 s cold** on a whole-database import,
against a ~20 s WASM call deadline. Its cause was a correlated subquery, twice per output row. It is
now a single window pass and a join. The interesting part is not the fix; it is that **the fix is
worth about 9%, and the first account of it was wrong by a factor of three.**

## What was there

`app/reports/sql/reports/ledger_party.sql`, CTE `party_balanced`:

```sql
COALESCE((
  SELECT SUM(pp.running) FROM party_prefix pp
  WHERE pp.party = pr.party
    AND pp.payment_date = (SELECT MAX(pp2.payment_date) FROM party_prefix pp2
                           WHERE pp2.party = pr.party AND pp2.payment_date <= pr.payment_date)
), 0) AS balance_raw
```

`EXPLAIN QUERY PLAN` on the whole-database statement showed why the shape is worse than it reads:

```text
SEARCH pp  USING AUTOMATIC COVERING INDEX (party=? AND payment_date=?)
SEARCH pp2 USING AUTOMATIC COVERING INDEX (party=?)
… eight such lines, one per correlated lookup
```

`AUTOMATIC COVERING INDEX` means SQLite **materialises an ephemeral index per invocation** — it cannot
keep an index on a CTE — so this was two index builds, per row, over 26,525 rows. That is a genuine
O(rows × dates) term and it was worth removing on its own terms.

An earlier revision of the same file had this expression **inline four times** (twice for `balance`,
once per copy of `t` inside the round2 template, and twice more for `balanceText`), with a comment
stating that hoisting it to one place had fixed a 20 s timeout. **That comment was wrong**, and this
note exists so the wrongness is on the record rather than deleted: one pass is still one pass.

## What replaced it

`party_prefix.running` at date *d* **is** the total of that party's deltas for dates ≤ *d*. So the
balance at a row's own `payment_date` is just the running total *of that date* — no `MAX` needed. The
only reason the correlated form reached backwards for a `MAX` is that a row dated between two payment
dates had no prefix row to join. So mark every output row's date into the timeline as a zero delta,
and equality becomes sufficient:

```sql
party_marked AS (
  SELECT party, payment_date, SUM(CASE WHEN paid = 0 THEN amount ELSE -amount END) AS delta
  FROM party_rows GROUP BY party, payment_date
  UNION ALL
  SELECT party, payment_date, 0 AS delta
  FROM party_rows
  WHERE (:party = '' OR party = :party)
    AND (:from = '' OR payment_date >= :from || ' 00:00:00')
    AND (:to   = '' OR payment_date <= :to   || ' 23:59:59.999Z')
)
```

then one window pass over it, grouped by `(party, payment_date)`, joined back on `(party,
payment_date)`. The plan afterwards has **one** `AUTOMATIC COVERING INDEX` — built once — instead of
eight per row.

Two properties are deliberate, because each was the subject of an earlier bug recorded in the file:

- **The deltas are not date-filtered; the markers are.** A balance is cumulative, so a report
  filtered to March must still count the payments that arrived in February. Filtering the deltas would
  silently turn every opening balance into a within-window balance.
- **`GROUP BY party, payment_date` before the window.** That is what makes "the value at this date"
  equal "the total through this date". Windowing over ungrouped rows carries a partial sum from a
  sibling row and yields a plausible, wrong balance.

## How correctness was established

The self-consistency gate **cannot see this change** — `verify-spool-reports.mjs` asserts the SQL
agrees with itself, and both forms agree with themselves. So the old expression and the new one were
run **side by side over the whole database**, compared in paisas, on three filter cases:

| filter | rows | old | new | differing |
|---|---|---|---|---|
| 2024-01-01 … 2026-10-04 | 26,525 | 13.9 s | 12.7 s | **0** |
| unfiltered | 26,526 | 13.4 s | 11.9 s | **0** |
| 2025 only | 14,916 | 11.1 s | 10.5 s | **0** |

The unfiltered case returns one row more than the date-bounded one because a payment carries
`payment_date` of `1195-12-31`, which sorts before 2024 — the trap the file's own header comment warns
about.

Gates, all re-run after the change: `verify-spool-reports.mjs` **14 passed, 0 failed**, 72 binds;
`verify-prelude.mjs` **PASS**.

## The overclaim, and why it matters

**First account, written into the SQL comment:** *"the whole reason this report took 69 s"*, on the
strength of the query plan alone. That was not measured, and it is wrong. The measurement is 13.9 s →
12.7 s for the balance arm: **about 9%**, not 3×. The whole report statement is 12–21 s warm and up to
69 s cold, so the correlated subquery was never most of it.

**What is most of it** is the shared `prelude.sql` — `payments_base` / `payments_view` over 26,525
rows, including `WHERE p.invoice IS NULL OR p.invoice IN (SELECT id FROM committed)`, a per-row
membership test against a subquery on the largest table in the database. Every payments-reporting
report pays it: `payments`, `salesreport`, `booker`, `party`, `general`, `outstanding`,
`paymentsbycompany`, `itemsales`, `profit`.

This is the same failure the vault already has a note about —
[[settle-structural-claims-with-the-owning-artifact]]: **a proxy signal pointed the right way and was
cheap, which is exactly what made it dangerous.** `EXPLAIN QUERY PLAN` is strong evidence that a
pattern is bad; it is not evidence of how much of the total it explains. The number had to come from
running both arms, and it took a minute.

The corrected claim is now in the SQL file, and [[report-cost-on-a-whole-database]] carries the
measurement.

## What is still open

The prelude, not this file, is the report cost. The answer is already chosen —
[[component-split-and-sql-materialised-tables]] (open decision 2, sequence step 17) — and
[[report-cost-on-a-whole-database]] is the argument for doing step 17 before step 16.

## Related

- [[report-cost-on-a-whole-database]] — every statement's cost, and the legacy comparison.
- [[reports-and-ledgers]] — the arithmetic, including the `payment_date` vs `created` trap.
- [[settle-structural-claims-with-the-owning-artifact]] — the rule this note is an instance of.