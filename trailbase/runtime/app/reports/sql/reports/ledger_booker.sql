-- ledger/booker — the display rows, entirely in SQLite.
--
-- Port of `buildLedgerBooker` (compute/views.js:344) + `reportLedgerBooker` + `ledgerRow`
-- (compute/reports.js:353, :325). The view chain comes from the shared `prelude.sql`, which is
-- composed in front of this file by `lib/spoolreports.js`, so `payments_view` and the invoice money
-- chain are written and parsed once rather than copied per report.
--
-- Column names here MUST match the manifest in `lib/spoolreports.js`, positionally. The host asserts
-- every row's width and refuses to run on a mismatch, so drift is a loud error rather than silently
-- mislabelled money.
--
-- NOT a CTE named `booker`: a CTE whose name equals one of its own output columns shadows that
-- column inside its own WHERE clause, so `booker = ...` silently resolves to the CTE and every
-- filter matches every row.

-- This file contributes only a final SELECT: every CTE it needs is in `prelude.sql`. The prelude
-- ends its CTE list with a trailing comma, so the statement continues from it — which is why there
-- is no `WITH` and no leading `,` here.
SELECT
  pv.id AS id,
  substr(pv.payment_date, 1, 10) AS date,
  (CASE WHEN pv.description = 'payment' THEN 'Payment' ELSE 'Invoice' END) AS entry,
  -- round2, then the formatted twin the template prints (ledgerRow:331-332). Both come from the
  -- same `credit`; the JS recomputes rather than reusing, so both are reproduced.
  (CAST((((pv.credit) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) - (CASE WHEN (((pv.credit) + 2.220446049250313e-16) * 100) + 0.5 < 0 AND (((pv.credit) + 2.220446049250313e-16) * 100) + 0.5 <> CAST((((pv.credit) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) THEN 1 ELSE 0 END)) / 100.0 AS credit,
  printf('%.2f', pv.credit) AS creditText,
  (CAST((((pv.debit) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) - (CASE WHEN (((pv.debit) + 2.220446049250313e-16) * 100) + 0.5 < 0 AND (((pv.debit) + 2.220446049250313e-16) * 100) + 0.5 <> CAST((((pv.debit) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) THEN 1 ELSE 0 END)) / 100.0 AS debit,
  printf('%.2f', pv.debit) AS debitText,
  COALESCE(pn.name, '') AS party,
  COALESCE(bn.name, '') AS booker,
  -- `invoiceNo(invoiceMap, r.invoice)` (reports.js:328): the human invoice number for the payment's
  -- invoice, or "" when there is none. `invoice_totals` carries it; without this the template's
  -- invoice column would be blank for every row.
  COALESCE(it.invoiceNo, '') AS invoice,
  pv.invoice AS invoiceId
FROM payments_view pv
LEFT JOIN (SELECT id, name FROM parties) pn ON pn.id = pv.party
LEFT JOIN (SELECT id, name FROM order_bookers) bn ON bn.id = pv.booker
LEFT JOIN invoice_totals it ON it.id = pv.invoice
WHERE
  -- reportLedgerBooker's filters. The booker filter compares the booker **id**
  -- (`r.booker === f.booker`), not the name, so it matches on the id and the name is display only.
  --
  -- `created` is TEXT in ISO form, so these bounds are string comparisons, exactly as `inDateRange`
  -- does them (`' 00:00:00'` low, `' 23:59:59.999Z'` high).
  (:booker = '' OR pv.booker = :booker)
  AND (:from = '' OR pv.payment_date >= :from || ' 00:00:00')
  AND (:to = '' OR pv.payment_date <= :to || ' 23:59:59.999Z')
-- reportLedgerBooker sorts by compareText(date). `lower()` is the cheap key and matches for the ISO
-- dates this column holds; the case tie-break in compareText is unreachable for `YYYY-MM-DD`.
ORDER BY lower(substr(pv.payment_date, 1, 10)), substr(pv.payment_date, 1, 10);