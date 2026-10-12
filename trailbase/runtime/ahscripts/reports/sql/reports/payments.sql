-- payment rows — the display rows shared by `payments` and `salesreport`.
--
-- Port of `paymentRow` + `paymentFilters` (compute/reports.js:99, :116). `reportPayments` and
-- `reportSalesPayments` build the SAME rows from the SAME filters; they differ only in an extra
-- paid/type restriction (reports.js:146) and their totals, so the statement is written once.
--
-- The two shared reports are distinguished by a `:salesOnly` parameter rather than two files, so the
-- row set provably cannot drift between them.

, pay_filtered AS (
  SELECT
    pv.id,
    pv.payment_date,
    pv.type,
    pv.invoice,
    pv.invoiceNo,
    pv.party,
    pv.party_type,
    pv.booker,
    pv.area,
    pv.section,
    pv.amount,
    pv.paid,
    pv.description,
    COALESCE(pn.name, '') AS party_name,
    COALESCE(an.name, '') AS area_name,
    COALESCE(sn.name, '') AS section_name,
    COALESCE(bn.name, '') AS booker_name
  FROM payments_view pv
  LEFT JOIN (SELECT id, name FROM parties) pn ON pn.id = pv.party
  LEFT JOIN (SELECT id, name FROM areas) an ON an.id = pv.area
  LEFT JOIN (SELECT id, name FROM sections) sn ON sn.id = pv.section
  LEFT JOIN (SELECT id, name FROM order_bookers) bn ON bn.id = pv.booker
  WHERE
    -- reportPayments:135 inDateRange on `created`.
    (:from = '' OR pv.payment_date >= :from || ' 00:00:00')
    AND (:to = '' OR pv.payment_date <= :to || ' 23:59:59.999Z')
    -- reportSalesPayments:146 — an extra restriction ONLY on the sales report: unpaid, and of type
    -- recieving (1) or return (2). `reportPayments` omits it, hence the parameter.
    AND (:salesOnly = '' OR (pv.paid = 0 AND (pv.type = 1 OR pv.type = 2)))
    -- paymentFilters (reports.js:116-128): one nullable predicate per filter. Ids are BLOB; `type`
    -- is the raw integer code, and the filter arrives as TEXT so it is CAST.
    AND (:booker = '' OR pv.booker = :booker)
    AND (:party = '' OR pv.party = :party)
    AND (:area = '' OR pv.area = :area)
    AND (:section = '' OR pv.section = :section)
    AND (:type = '' OR pv.type = CAST(:type AS INTEGER))
    -- The three-way invoice match (reports.js:124): invoice id, the return-reference id, or the
    -- human invoice number as a string. TWO binds, because the two halves compare different types —
    -- see the note in lib/spoolreports.js.
    --
    -- `invoiceNo` is a REAL in the database, so `CAST(invoiceNo AS TEXT)` is "3840.0" while the JS
    -- value is the NUMBER 3840 and `String()` gives "3840". Comparing the raw cast against a typed
    -- number therefore matched nothing. The expression below is the same integer-normalising CASE the
    -- display column above uses, so both sides render the number the same way.
    AND (:invoiceId = '' OR pv.invoice = :invoiceId OR CAST(pv.invoiceNo AS REAL) = CAST(:invoiceNo AS REAL))
)
SELECT
  id,
  -- The PAYMENT date, not the row's insert time. pay_filtered projects payment_date;
  -- created was never in scope here, and v1's inDateRange ran on created where
  -- created WAS the business date.
  substr(payment_date, 1, 10) AS date,
  -- paymentsTypeLabel (reports.js:50): a 2x2 over (type, description). The else branch is the
  -- return label, which is what a type=2 payment gets regardless of description.
  (CASE type
     WHEN 0 THEN (CASE WHEN description = 'payment' THEN 'Purchase Payment' ELSE 'Purchase' END)
     WHEN 1 THEN (CASE WHEN description = 'payment' THEN 'Sale Payment' ELSE 'Sale' END)
     ELSE 'Return' END) AS type,
  -- `invoiceNo(ix.invoiceMap, p.invoice)` (reports.js:104) yields a JS NUMBER, which serialises
  -- without a decimal point. `CAST(... AS TEXT)` on a REAL gives "152.0", so an INTEGER cast is
  -- used when the number has no fractional part; CAST(x AS INTEGER) alone would truncate a real
  -- invoice number, so the fractional case falls back to TEXT.
  CASE WHEN CAST(invoiceNo AS REAL) = CAST(CAST(invoiceNo AS INTEGER) AS REAL)
       THEN CAST(CAST(invoiceNo AS INTEGER) AS TEXT)
       ELSE CAST(invoiceNo AS TEXT) END AS invoice,
  invoice AS invoiceId,
  area_name AS area,
  section_name AS section,
  party_name AS party,
  booker_name AS booker,
  amount,
  printf('%.2f', amount) AS amountText,
  description,
  -- Raw fields the totals need. `paymentsTotals` reads type/paid/party_type from the RAW rows
  -- (reports.js:132-133), because paymentRow replaces them with display values — so they must be
  -- carried, or the totals would sum display labels. `type_code` is the RAW type: `type` above is
  -- the display label, and the totals branch on the code.
  paid,
  -- `type_code` is the RAW type; `type` above is the display label, and the totals branch on the
  -- code. There is no `pv` alias here -- the FROM is `pay_filtered`, which selected these through.
  type AS type_code,
  party_type
FROM pay_filtered
-- reportPayments applies NO sort (reports.js:137), so the row order is `payments_view` order, which
-- is `payments.id DESC` (lib/data.js:90) — and `paymentsTotals` accumulates in that order.
ORDER BY id DESC;