-- party ledger — the display rows, entirely in SQLite.
--
-- Port of `buildLedgerParty` (compute/views.js:365) + `reportLedgerParty` + `ledgerRow`
-- (compute/reports.js:341, :325).
--
-- The balance is the interesting part. `views.js:372-412` is an O(n^2) per-row correlated sum in the
-- JS ("sum every payment of that party with payment_date <= this row's date"), which it then reduces
-- to a per-distinct-date prefix sum. SQL expresses that directly as a window function, so the O(n^2)
-- is gone rather than merely optimised.
--
-- THE ORDERING TRAP, carried over from views.js:381: the delta sums on `payment_date` — NOT
-- `created` — while the rows themselves are dated on `created`. They differ (views.js:170), so
-- windowing over `created` would produce a plausible, wrong balance.

, party_rows AS (
  SELECT
    pv.id,
    pv.created,
    pv.description,
    pv.party,
    pv.paid,
    pv.amount,
    pv.credit,
    pv.debit,
    pv.payment_date,
    pv.invoice,
    COALESCE(pn.name, '') AS party_name
  FROM payments_view pv
  LEFT JOIN (SELECT id, name FROM parties) pn ON pn.id = pv.party
  -- views.js:366 filters out rows with no party.
  WHERE pv.party IS NOT NULL
),
party_deltas AS (
  -- views.js:381: `paid === 0 ? +amount : -amount`, accumulated per distinct payment_date.
  SELECT
    party,
    payment_date,
    SUM((CASE WHEN paid = 0 THEN amount ELSE -amount END)) AS delta
  FROM party_rows
  GROUP BY party, payment_date
),
party_prefix AS (
  -- The prefix sum. `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` over the per-date deltas is
  -- exactly the `acc += byDate.get(date)` loop (views.js:390).
  SELECT
    party,
    payment_date,
    SUM(delta) OVER (PARTITION BY party ORDER BY payment_date
                     ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running
  FROM party_deltas
),
party_balanced AS (
  -- `balanceFor(party, dated)` (views.js:394-408): the prefix sum at the LAST date <= this row's
  -- dated, i.e. `sum(payments of that party with payment_date <= dated)`.
  --
  -- COMPUTED ONCE PER ROW, HERE. Written inline it appeared FOUR times -- twice for `balance` (once
  -- per copy of `t` inside the round2 template) and twice more for `balanceText` -- and each is a
  -- correlated MAX plus a correlated SUM over the whole prefix table. That is O(rows x dates), and it
  -- made this report exceed TrailBase's own 20 s request timeout on 26,099 rows: the SQL was over
  -- 100x slower than the JS it replaces, where the same work is one Map lookup (views.js:390).
  --
  -- The join is EXACTLY one row: `pp.payment_date` is the maximum date <= the row's, so one
  -- `party_prefix` row matches per output row. Equality on the row's OWN payment_date would be wrong
  -- for every row sharing a date with an earlier one, which is why the MAX is here.
  SELECT
    pr.*,
    COALESCE((
      SELECT SUM(pp.running) FROM party_prefix pp
      WHERE pp.party = pr.party
        AND pp.payment_date = (SELECT MAX(pp2.payment_date) FROM party_prefix pp2
                               WHERE pp2.party = pr.party AND pp2.payment_date <= pr.payment_date)
    ), 0) AS balance_raw
  FROM party_rows pr
  WHERE
    (:party = '' OR pr.party = :party)
    AND (:from = '' OR pr.payment_date >= :from || ' 00:00:00')
    AND (:to = '' OR pr.payment_date <= :to || ' 23:59:59.999Z')
)
SELECT
  party_balanced.id AS id,
  substr(created, 1, 10) AS date,
  (CASE WHEN description = 'payment' THEN 'Payment' ELSE 'Invoice' END) AS entry,
  (CAST((((credit) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) - (CASE WHEN (((credit) + 2.220446049250313e-16) * 100) + 0.5 < 0 AND (((credit) + 2.220446049250313e-16) * 100) + 0.5 <> CAST((((credit) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) THEN 1 ELSE 0 END)) / 100.0 AS credit,
  printf('%.2f', credit) AS creditText,
  (CAST((((debit) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) - (CASE WHEN (((debit) + 2.220446049250313e-16) * 100) + 0.5 < 0 AND (((debit) + 2.220446049250313e-16) * 100) + 0.5 <> CAST((((debit) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) THEN 1 ELSE 0 END)) / 100.0 AS debit,
  printf('%.2f', debit) AS debitText,
  (CAST((((balance_raw) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) - (CASE WHEN (((balance_raw) + 2.220446049250313e-16) * 100) + 0.5 < 0 AND (((balance_raw) + 2.220446049250313e-16) * 100) + 0.5 <> CAST((((balance_raw) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) THEN 1 ELSE 0 END)) / 100.0 AS balance,
  printf('%.2f', balance_raw) AS balanceText,
  party_name AS party,
  -- `ledgerRow` (reports.js:338) resolves the booker through `ix.booker`, and `buildLedgerParty`
  -- inherits `booker` from `buildLedgerBooker` (views.js:366), which sets it from the INVOICE's
  -- booker (views.js:355) — so it is populated, not empty, and is joined through invoice_totals.
  COALESCE(bn.name, '') AS booker,
  -- `invoiceNo(invoiceMap, r.invoice)` (reports.js:328). The JS number renders without a decimal
  -- point, so an integer-valued REAL is cast back to an integer first.
  CASE WHEN it.invoiceNo IS NULL THEN ''
       WHEN CAST(it.invoiceNo AS REAL) = CAST(CAST(it.invoiceNo AS INTEGER) AS REAL)
       THEN CAST(CAST(it.invoiceNo AS INTEGER) AS TEXT)
       ELSE CAST(it.invoiceNo AS TEXT) END AS invoice,
  invoice AS invoiceId,
  -- CARRIED FOR THE TOTALS ALONE, and the report's order decides a money total, not just
  -- presentation: `reportLedgerParty` takes the LAST row's balance as `totals.balance`
  -- (reports.js:350), and the last row is decided by `payment_date ASC, id DESC`.
  --
  -- Every row shares ONE `created` on this depot, so `date` is constant and cannot pick it — an
  -- `ORDER BY date, id DESC LIMIT 1` returns the SMALLEST id in the set, which is the opposite end
  -- of the order. The payment date has to be visible to the totals statement's ORDER BY, so it is
  -- projected here. The template does not read it.
  payment_date AS paymentDate
FROM party_balanced
-- `invoice_chain`, NOT `invoice_totals`: the projection reads `invoiceNo`, which lives on the chain
-- (`invoice_totals` carries only `final_total`). The booker comes through the same join, since
-- `invoice_chain` carries it too.
LEFT JOIN invoice_chain it ON it.id = party_balanced.invoice
-- The name table's id column is ALIASED: `id` is also a column of `party_balanced`, so an
-- unqualified reference is ambiguous (`ambiguous column name: id`).
LEFT JOIN (SELECT id AS ref_id, name FROM order_bookers) bn ON bn.ref_id = it.booker
-- `reportLedgerParty` sorts by compareText(date) (reports.js:348) and the total reads the LAST
-- row's balance (reports.js:349) — so the ORDER decides the reported balance, not just presentation.
--
-- THE ORDER IS `payment_date` ASC, then `id` DESC — measured, not guessed. Two facts combine:
--
--   - `buildLedgerParty` sorts its rows by `dated` = payment_date (views.js:367);
--   - `reportLedgerParty` then sorts by `dateOnly(created)` (reports.js:348), and every row shares
--     ONE import `created` on this depot, so that key is CONSTANT and a stable JS sort leaves the
--     payment_date order untouched.
--
-- payment_date is a TEXT comparison, and it matters that it is: values go back to year 1195
-- ("1195-12-31 19:31:48.000Z"), which sorts first as a string.
--
-- The `id DESC` tie-break is NOT cosmetic. Within one payment_date (16,610 distinct dates across
-- 26,099 rows) the surviving order is `payments_view` order = `payments.id DESC` (lib/data.js:90).
-- Verified both candidates against the JS: `id DESC` matches exactly, `id ASC` does not. Getting it
-- backwards changed the last row and therefore `totals.balance` (3,148,776.08 against the JS 2,460.00)
-- while leaving every row's own values correct.
ORDER BY payment_date, id DESC;