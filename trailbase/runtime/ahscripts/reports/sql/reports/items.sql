-- item rows — the display rows shared by `stockreport` and `difference`.
--
-- Port of `stockRows` (compute/reports.js:278) and the `difference` projection (:304). Both reports
-- show the same item columns and differ only in the quantity aggregate they read, so they share one
-- statement and select the aggregate with `:agg` — which makes it impossible for the two row shapes
-- to drift apart.

, item_rows AS (
  SELECT
    it.id,
    it.name,
    it.cost_price,
    it.sale_price,
    it.box_size_qty,
    it.category,
    COALESCE(cn.name, '') AS company
  FROM items it
  LEFT JOIN (SELECT id, name FROM companies) cn ON cn.id = it.category
),
item_qty AS (
  -- One place to choose the aggregate, so `:agg` is not repeated in five expressions (each repeat
  -- is a chance to mistype the CASE and, worse, to repeat it inconsistently).
  SELECT
    ir.*,
    (CASE WHEN :agg = 'difference' THEN COALESCE(dd.qty, 0) ELSE COALESCE(sd.qty, 0) END) AS qty,
    (CASE WHEN COALESCE(ir.box_size_qty, 0) = 0 THEN 1 ELSE ir.box_size_qty END) AS box,
    -- stockRows:292 `round2(qty * cost_price)`.
    --
    -- The shape MUST match the prelude's round2 exactly:
    --   floor(((x * cost) + EPSILON) * 100 + 0.5) / 100
    -- Writing it as floor(((x*cost + EPSILON) * 100 + 0.5) / 100) or moving the `+ EPSILON` inside a
    -- different bracket produced -449.995 for -1 x 450 on every negative row (207 of 207 off by half
    -- a paisa) while positives looked fine — a failure mode that is invisible until a negative qty
    -- appears, which is why it is spelled out here rather than left to be re-derived.
    (CAST(((((CASE WHEN :agg = 'difference' THEN COALESCE(dd.qty, 0) ELSE COALESCE(sd.qty, 0) END) * COALESCE(ir.cost_price, 0)) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) - (CASE WHEN ((((CASE WHEN :agg = 'difference' THEN COALESCE(dd.qty, 0) ELSE COALESCE(sd.qty, 0) END) * COALESCE(ir.cost_price, 0)) + 2.220446049250313e-16) * 100) + 0.5 < 0 AND ((((CASE WHEN :agg = 'difference' THEN COALESCE(dd.qty, 0) ELSE COALESCE(sd.qty, 0) END) * COALESCE(ir.cost_price, 0)) + 2.220446049250313e-16) * 100) + 0.5 <> CAST(((((CASE WHEN :agg = 'difference' THEN COALESCE(dd.qty, 0) ELSE COALESCE(sd.qty, 0) END) * COALESCE(ir.cost_price, 0)) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) THEN 1 ELSE 0 END)) / 100.0 AS stock_amount
  FROM item_rows ir
  LEFT JOIN stock_deltas sd ON sd.item = ir.id
  LEFT JOIN difference_deltas dd ON dd.item = ir.id
)
SELECT
  id,
  company,
  name,
  (CAST((((COALESCE(cost_price, 0)) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) - (CASE WHEN (((COALESCE(cost_price, 0)) + 2.220446049250313e-16) * 100) + 0.5 < 0 AND (((COALESCE(cost_price, 0)) + 2.220446049250313e-16) * 100) + 0.5 <> CAST((((COALESCE(cost_price, 0)) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) THEN 1 ELSE 0 END)) / 100.0 AS cost_price,
  (CAST((((COALESCE(sale_price, 0)) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) - (CASE WHEN (((COALESCE(sale_price, 0)) + 2.220446049250313e-16) * 100) + 0.5 < 0 AND (((COALESCE(sale_price, 0)) + 2.220446049250313e-16) * 100) + 0.5 <> CAST((((COALESCE(sale_price, 0)) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) THEN 1 ELSE 0 END)) / 100.0 AS sale_price,
  qty,
  COALESCE(box_size_qty, 0) AS box_size_qty,
  -- qtyDisplay (format.js:27): "[-]N ctn(s) M unit(s)".
  (CASE WHEN qty < 0 THEN '-' ELSE '' END)
  || CAST(CAST(ABS(COALESCE(qty, 0)) / box AS INTEGER) AS TEXT)
  || CASE WHEN CAST(ABS(COALESCE(qty, 0)) / box AS INTEGER) = 1 THEN ' ctn ' ELSE ' ctns ' END
  || CAST(CAST(ABS(COALESCE(qty, 0)) % box AS INTEGER) AS TEXT)
  || CASE WHEN CAST(ABS(COALESCE(qty, 0)) % box AS INTEGER) = 1 THEN ' unit' ELSE ' units' END
  AS qtyText,
  printf('%.2f', COALESCE(cost_price, 0)) AS costText,
  stock_amount,
  printf('%.2f', stock_amount) AS stockAmountText,
  -- difference only (reports.js:317): the sign drives a CSS tone.
  CASE WHEN qty < 0 THEN 'neg' WHEN qty > 0 THEN 'pos' ELSE '' END AS tone
FROM item_qty
-- Both reports sort by compareText(name) (reports.js:295, :319) and `reportStock` sums IN THAT
-- ORDER (reports.js:300). `lower()` is the cheap key; SQLite's TEXT order is byte order while JS is
-- UTF-16 code-unit order, which agree for the ASCII names here.
ORDER BY lower(name), name;