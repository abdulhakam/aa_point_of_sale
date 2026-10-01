-- area ledger — per-party credit/debit, entirely in SQLite.
--
-- Port of `buildLedgerArea` (compute/views.js:418) + `reportLedgerArea` (compute/reports.js:366).
--
-- Note the report filters the SOURCE payments (type = recieving, date range, area, section) and
-- then groups — the preserved `ledger_area.sql` grouped arbitrary view columns instead, which is
-- why the JS comment at reports.js:368-369 says so. The grouping below is on `party`, which is what
-- the JS accumulates into.

, area_payments AS (
  SELECT
    pv.party,
    pv.paid,
    pv.amount,
    COALESCE(pn.name, '') AS party_name
  FROM payments_view pv
  LEFT JOIN (SELECT id, name FROM parties) pn ON pn.id = pv.party
  WHERE
    -- reports.js:371: recieving payments only.
    pv.type = 1
    AND (:from = '' OR pv.created >= :from || ' 00:00:00')
    AND (:to = '' OR pv.created <= :to || ' 23:59:59.999Z')
    AND (:area = '' OR pv.area = :area)
    AND (:section = '' OR pv.section = :section)
    -- reports.js:377 skips payments with no party.
    AND pv.party IS NOT NULL
),
area_grouped AS (
  -- views.js:376-382: credit where paid, debit where not. These accumulate in `payments_view`
  -- order (id DESC) inside the JS; SQLite's SUM has no defined order, so the per-group money is
  -- the same set of additions either way but the FLOAT SUM ORDER can differ in the last bits. The
  -- totals are round2'd, so this only shows if a group lands on a half-paisa boundary.
  --
  -- The RAW sums are kept under distinct names (`credit_sum`, `debit_sum`) because `balance` is
  -- round2(debit - credit) over the RAW sums (views.js:389) while `credit`/`debit` are each
  -- round2'd on their own (views.js:387-388). Collapsing them to one column silently computes
  -- balance from the rounded pair and lands a paisa away on 1 of 872 parties.
  SELECT
    party,
    party_name,
    SUM((CASE WHEN paid = 1 THEN amount ELSE 0 END)) AS credit_sum,
    SUM((CASE WHEN paid = 1 THEN 0 ELSE amount END)) AS debit_sum
  FROM area_payments
  GROUP BY party, party_name
)
SELECT
  party AS id,
  party_name AS party,
  -- THE PER-GROUP round2 IS LOAD-BEARING, and it is not cosmetic.
  --
  -- `reportLedgerArea` rounds each group's credit/debit (reports.js:387-388) and the TOTALS then sum
  -- those ROUNDED per-row values (reports.js:396-398). Rounding only the final sum instead is a
  -- different computation: summing the raw floats gives 25,943,447.691, which round2s to
  -- 25,943,447.69, against the JS 25,943,447.70. One paisa, and a money total.
  (CAST((((credit_sum) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) - (CASE WHEN (((credit_sum) + 2.220446049250313e-16) * 100) + 0.5 < 0 AND (((credit_sum) + 2.220446049250313e-16) * 100) + 0.5 <> CAST((((credit_sum) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) THEN 1 ELSE 0 END)) / 100.0 AS credit,
  (CAST((((debit_sum) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) - (CASE WHEN (((debit_sum) + 2.220446049250313e-16) * 100) + 0.5 < 0 AND (((debit_sum) + 2.220446049250313e-16) * 100) + 0.5 <> CAST((((debit_sum) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) THEN 1 ELSE 0 END)) / 100.0 AS debit,
  -- views.js:389/392: `balance = round2(e.debit - e.credit)` over the **raw** group sums.
  --
  -- The EPSILON in `round2` is not decoration — it is what decides exact half-paisa boundaries, and
  -- it must be added to the VALUE before scaling, exactly as `Math.round((num(v) + EPSILON) * 100)`
  -- does. Measured on this depot: one party in 872 has a true difference of exactly 2774.495.
  -- The JS accumulation lands on 2774.494999999999 (below the boundary -> 2774.49) while SQLite's
  -- SUM order lands on 2774.4950000000026 (above -> 2774.50). Same mathematics, different float
  -- addition order, one paisa apart. Adding the epsilon to the whole difference reproduces the JS.
  (CAST((((debit_sum - credit_sum) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) - (CASE WHEN (((debit_sum - credit_sum) + 2.220446049250313e-16) * 100) + 0.5 < 0 AND (((debit_sum - credit_sum) + 2.220446049250313e-16) * 100) + 0.5 <> CAST((((debit_sum - credit_sum) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) THEN 1 ELSE 0 END)) / 100.0 AS balance,
  printf('%.2f', (CAST((((credit_sum) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) - (CASE WHEN (((credit_sum) + 2.220446049250313e-16) * 100) + 0.5 < 0 AND (((credit_sum) + 2.220446049250313e-16) * 100) + 0.5 <> CAST((((credit_sum) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) THEN 1 ELSE 0 END)) / 100.0) AS creditText,
  printf('%.2f', (CAST((((debit_sum) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) - (CASE WHEN (((debit_sum) + 2.220446049250313e-16) * 100) + 0.5 < 0 AND (((debit_sum) + 2.220446049250313e-16) * 100) + 0.5 <> CAST((((debit_sum) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) THEN 1 ELSE 0 END)) / 100.0) AS debitText,
  printf('%.2f', (CAST((((debit_sum - credit_sum) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) - (CASE WHEN (((debit_sum - credit_sum) + 2.220446049250313e-16) * 100) + 0.5 < 0 AND (((debit_sum - credit_sum) + 2.220446049250313e-16) * 100) + 0.5 <> CAST((((debit_sum - credit_sum) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) THEN 1 ELSE 0 END)) / 100.0) AS balanceText,
  -- The RAW pair, carried so the float-sum ORDER is inspectable rather than only observable as a
  -- one-paisa mismatch. `tools/verify-spool-reports.mjs` uses these as the boundary evidence: the
  -- rounded outputs (2774.49 vs 2774.50) carry no fractional part of their own, so the boundary can
  -- only be seen in the raw sums behind them.
  credit_sum AS credit_raw,
  debit_sum AS debit_raw
FROM area_grouped
-- reports.js:394 sorts by compareText(party), and the totals sum the ROUNDED per-row values in that
-- order (reports.js:396-398), so the order is part of the money.
ORDER BY lower(party_name), party_name;