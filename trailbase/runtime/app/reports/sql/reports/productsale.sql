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
    AND (:from = '' OR tv.created >= :from || ' 00:00:00')
    AND (:to = '' OR tv.created <= :to || ' 23:59:59.999Z')
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
  printf('%.2f', sg.amount) AS amountText,
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