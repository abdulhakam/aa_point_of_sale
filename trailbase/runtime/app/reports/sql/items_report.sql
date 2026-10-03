-- item rows for the invoice-entry item list and the inventory screen.
--
-- The other JavaScript-built view the app still read (`buildItemsReport` in
-- `app/compute/views.js`). Its signed quantity is NOT re-derived here: it comes from the prelude's
-- `stock_deltas`, which is a direct port of the same sign rules and is checked against the JS builder
-- by `tools/verify-prelude.mjs`. Re-deriving it in this file would create a third copy of the rule and a
-- way for the two to disagree — which is the whole failure class `[[tb-0032]]` exists to remove.
--
--   return (2): +q for a customer, -q for a supplier
--   difference (3): +q
--   sale (1): -q
--   purchase and anything else: +q
--
-- It composes with the prelude (its body opens with its own CTE), so it is read the same way the report
-- statements are. `category` stays the RAW id, not the company name: `/inventory` resolves it against
-- `refs.companies` and the entry form needs the id to post back.
--
-- This is deliberately NOT the same row shape as `items.sql`. That one is the Stock/Difference report's
-- DISPLAY row (rounded money, a qtyText string, a tone class); this one is the row two editing screens
-- need. They share `stock_deltas` and nothing else, and merging them would mean the report gained
-- columns the screens do not print and the screens gained rounding they must not do.

, item_base AS (
  SELECT
    it.id,
    it.name,
    it.created,
    it.updated,
    it.cost_price,
    it.sale_price,
    it.box_size_qty,
    it.category
  FROM items it
)
SELECT
  ib.id,
  ib.name,
  ib.created,
  ib.updated,
  ib.cost_price,
  ib.sale_price,
  ib.box_size_qty,
  ib.category,
  -- `signed.get(it.id) || 0` in JS: an item with no movement reads 0, not NULL.
  COALESCE(sd.qty, 0) AS qty
FROM item_base ib
LEFT JOIN stock_deltas sd ON sd.item = ib.id
-- Same order the inventory screen and the entry form's item list both present: by name.
ORDER BY lower(ib.name), ib.name;
