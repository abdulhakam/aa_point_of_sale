-- product supply summary — per-item units and amount, entirely in SQLite.
--
-- Port of `reportProductSale` (compute/reports.js:522), reading `transactionView` (not
-- transactions_report): it needs the RAW line `total`, and filters to sale invoices only.

, sale_lines AS (
  SELECT
    tv.item,
    tv.qty,
    tv.total
  FROM transaction_view tv
  WHERE
    -- reports.js:526: sale invoices only (INVOICE_TYPE.sale = 1).
    tv.inv_type = 1
    AND (:from = '' OR tv.dated >= :from || ' 00:00:00')
    AND (:to = '' OR tv.dated <= :to || ' 23:59:59.999Z')
    AND (:booker = '' OR tv.inv_booker = :booker)
    AND (:area = '' OR tv.party_area = :area)
    AND (:section = '' OR tv.party_section = :section)
),
sale_grouped AS (
  -- reports.js:531-534: units and amount summed per item.
  SELECT
    item,
    SUM(qty) AS units,
    SUM(total) AS amount
  FROM sale_lines
  GROUP BY item
)
SELECT
  sg.item AS id,
  COALESCE(it.name, '') AS name,
  sg.units,
  sg.amount,
  COALESCE(it.box_size_qty, 0) AS box_size_qty,
  (CASE WHEN COALESCE(it.box_size_qty, 0) = 0 THEN 1 ELSE it.box_size_qty END) AS box,
  -- The printed Amount, rounded with the MONEY RULE and only then formatted.
  --
  -- It used to be `printf('%.2f', sg.amount)`, which is round-half-to-EVEN. The totals strip rounds
  -- the same per-item amounts half-UP, so on a value landing exactly on .xx5 the column and the
  -- footer disagreed: item 116023525354 is 134116.525, printed 134116.52 against a total built from
  -- 134116.53, and the report's footer was 2 paisa above the sum of the column a user could read.
  --
  -- So round2 FIRST, then printf. After round2 the value is already 2 dp and carries no fractional
  -- tie, so printf's tie-breaking never engages and only supplies the trailing zeros. The round2
  -- expression is the prelude's money rule written out (see prelude.sql:92-125): floor() does not
  -- exist in the guest's SQLite, so it is rebuilt from CAST, which truncates toward zero.
  printf('%.2f',
    (CAST((((sg.amount) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER)
     - (CASE WHEN ((((sg.amount) + 2.220446049250313e-16) * 100) + 0.5) < 0
              AND ((((sg.amount) + 2.220446049250313e-16) * 100) + 0.5) <> CAST(((((sg.amount) + 2.220446049250313e-16) * 100) + 0.5) AS INTEGER)
             THEN 1 ELSE 0 END)) / 100.0
  ) AS amountText,
  -- reports.js:537: only items with POSITIVE units are reported, so a net-zero or return-only item
  -- disappears entirely. The filter is applied after aggregation, not before.
  -- qtyDisplay (format.js:27): "[-]N ctn(s) M unit(s)".
  (CASE WHEN sg.units < 0 THEN '-' ELSE '' END)
  || CAST(CAST(ABS(COALESCE(sg.units, 0)) / (CASE WHEN COALESCE(it.box_size_qty, 0) = 0 THEN 1 ELSE it.box_size_qty END) AS INTEGER) AS TEXT)
  || CASE WHEN CAST(ABS(COALESCE(sg.units, 0)) / (CASE WHEN COALESCE(it.box_size_qty, 0) = 0 THEN 1 ELSE it.box_size_qty END) AS INTEGER) = 1 THEN ' ctn ' ELSE ' ctns ' END
  || CAST(CAST(ABS(COALESCE(sg.units, 0)) % (CASE WHEN COALESCE(it.box_size_qty, 0) = 0 THEN 1 ELSE it.box_size_qty END) AS INTEGER) AS TEXT)
  || CASE WHEN CAST(ABS(COALESCE(sg.units, 0)) % (CASE WHEN COALESCE(it.box_size_qty, 0) = 0 THEN 1 ELSE it.box_size_qty END) AS INTEGER) = 1 THEN ' unit' ELSE ' units' END
  AS qtyText
FROM sale_grouped sg
LEFT JOIN items it ON it.id = sg.item
-- reports.js:537 filters, reports.js:545 sorts by compareText(name), and the total sums the
-- amounts in that order (reports.js:546).
WHERE sg.units > 0
ORDER BY lower(COALESCE(it.name, '')), COALESCE(it.name, '');