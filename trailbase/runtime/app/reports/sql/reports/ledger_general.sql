-- general ledger — the journal projection, entirely in SQLite.
--
-- Port of `reportLedgerGeneral` (compute/reports.js:403), reading the `ledger_journal` view from the
-- prelude (which is itself a port of buildLedgerJournal, views.js:303-340).
--
-- This report does NOT emit an opening-balance row from SQL. `reportLedgerGeneral` returns the
-- opening row SEPARATELY as `result.opening` (reports.js:438-453) and adds it to each TOTAL
-- (reports.js:455-457) while leaving `result.rows` untouched. The opening figures come from the
-- FILTER (`f.openingRecievables` / `f.openingPayables` / `f.openingCash`), not from the data, so
-- there is nothing for SQL to contribute here and forcing it into the row set would produce a row
-- the JS does not have.

, journal_filtered AS (
  SELECT
    j.id,
    j.created,
    j.invoiceNo,
    j.description,
    j.transaction_type,
    j.account_type,
    j.accounts_recievable,
    j.accounts_payable,
    j.cash,
    j.stock
  FROM ledger_journal j
  WHERE
    -- reports.js:410: inDateRange on `created`, which for the journal is the payment_date.
    (:from = '' OR j.created >= :from || ' 00:00:00')
    AND (:to = '' OR j.created <= :to || ' 23:59:59.999Z')
)
SELECT
  id,
  substr(created, 1, 10) AS date,
  COALESCE(CAST(invoiceNo AS TEXT), '') AS invoiceNo,
  description,
  -- Aliased to the JS field NAMES (`transactionType` / `accountType`, reports.js:426-433), not to
  -- the snake_case names this CTE uses. The page's column list keys off those names, so projecting
  -- `transaction_type` left the Type and Account columns of the general ledger blank — with the row
  -- count, the money and the tone all correct.
  transaction_type AS transactionType,
  account_type AS accountType,
  accounts_recievable AS recievable,
  printf('%.2f', accounts_recievable) AS recievableText,
  accounts_payable AS payable,
  printf('%.2f', accounts_payable) AS payableText,
  cash,
  printf('%.2f', cash) AS cashText,
  stock,
  printf('%.2f', stock) AS stockText,
  -- reports.js:426-433. The label comparison is `account_type === PAYMENT_TYPE_LABEL[1]`
  -- (accounts_recievable.ts) / `[0]` (accounts_payable.ts), i.e. against the STRINGS "recieving"
  -- and "sending", while account_type holds an integer for payments. Under SQLite's cross-type
  -- comparison that is ALWAYS false, so both inner branches are dead and only the two else-branches
  -- can fire. Reproduced rather than "fixed": a payment row never gets a pos/neg/info tone, and
  -- that is what the page renders today.
  (CASE
     WHEN transaction_type IN ('payment', 'expense')
       THEN (CASE WHEN account_type = 'recieving' THEN 'pos' ELSE 'neg' END)
     WHEN account_type = 'sending' THEN 'info'
     ELSE '' END) AS tone
FROM journal_filtered
-- reports.js:435 sorts by compareText(date). `lower()` is the cheap key; the case tie-break in
-- compareText is unreachable for `YYYY-MM-DD`. The id tie-break keeps the order total, which matters
-- because the totals sum the rows in it.
ORDER BY lower(substr(created, 1, 10)), substr(created, 1, 10), id;