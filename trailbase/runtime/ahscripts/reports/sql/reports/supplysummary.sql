-- supply summary — per-item units and amount for a SUBMITTED SET of sale invoices, entirely in SQLite.
--
-- Same money path as productsale.sql (transaction_view's raw line `total`), but the invoice set is the
-- caller's SELECTION rather than a date/booker/area filter. `:invoices` is ONE delimited string of HEX
-- invoice ids — `|HEX|HEX|` — matched with instr(), so a whole list binds as a single text parameter
-- and `tv.invoice` (a BLOB) is compared by its hex. The output is grouped by item ONLY, as the report
-- requires: no invoice ever appears in the result.

, supply_picked AS (
  SELECT
    tv.item,
    tv.qty,
    tv.total
  FROM transaction_view tv
  WHERE
    -- sale invoices only (INVOICE_TYPE.sale = 1), the same restriction productsale.sql makes.
    tv.inv_type = 1
    -- The pick-list date range, bound so the scan is restricted to the range the operator was shown
    -- (idx_invoices_dated) instead of the whole ledger. The invoice-set match below is not sargable
    -- (it is a function of the column), so this range is what keeps the report off the 20 s deadline.
    AND (:from = '' OR tv.dated >= :from || ' 00:00:00')
    AND (:to = '' OR tv.dated <= :to || ' 23:59:59.999Z')
    AND instr(:invoices, '|' || hex(tv.invoice) || '|') > 0
),
supply_grouped AS (
  SELECT
    item,
    SUM(qty) AS units,
    SUM(total) AS amount
  FROM supply_picked
  GROUP BY item
)
SELECT
  sg.item AS id,
  COALESCE(it.name, '') AS name,
  sg.units,
  sg.amount,
  COALESCE(it.box_size_qty, 0) AS box_size_qty,
  (CASE WHEN COALESCE(it.box_size_qty, 0) = 0 THEN 1 ELSE it.box_size_qty END) AS box,
  -- Round half-up with the prelude's money rule FIRST, then printf for the trailing zeroes; exactly
  -- the construction productsale.sql uses, so the column here and there cannot disagree.
  printf('%.2f',
    (CAST((((sg.amount) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER)
     - (CASE WHEN ((((sg.amount) + 2.220446049250313e-16) * 100) + 0.5) < 0
              AND ((((sg.amount) + 2.220446049250313e-16) * 100) + 0.5) <> CAST(((((sg.amount) + 2.220446049250313e-16) * 100) + 0.5) AS INTEGER)
             THEN 1 ELSE 0 END)) / 100.0
  ) AS amountText,
  -- qtyDisplay: "[-]N ctn(s) M unit(s)", same as productsale.sql.
  (CASE WHEN sg.units < 0 THEN '-' ELSE '' END)
  || CAST(CAST(ABS(COALESCE(sg.units, 0)) / (CASE WHEN COALESCE(it.box_size_qty, 0) = 0 THEN 1 ELSE it.box_size_qty END) AS INTEGER) AS TEXT)
  || CASE WHEN CAST(ABS(COALESCE(sg.units, 0)) / (CASE WHEN COALESCE(it.box_size_qty, 0) = 0 THEN 1 ELSE it.box_size_qty END) AS INTEGER) = 1 THEN ' ctn ' ELSE ' ctns ' END
  || CAST(CAST(ABS(COALESCE(sg.units, 0)) % (CASE WHEN COALESCE(it.box_size_qty, 0) = 0 THEN 1 ELSE it.box_size_qty END) AS INTEGER) AS TEXT)
  || CASE WHEN CAST(ABS(COALESCE(sg.units, 0)) % (CASE WHEN COALESCE(it.box_size_qty, 0) = 0 THEN 1 ELSE it.box_size_qty END) AS INTEGER) = 1 THEN ' unit' ELSE ' units' END
  AS qtyText
FROM supply_grouped sg
LEFT JOIN items it ON it.id = sg.item
-- Only items with POSITIVE units are reported, matching productsale.sql.
WHERE sg.units > 0
ORDER BY lower(COALESCE(it.name, '')), COALESCE(it.name, '');
