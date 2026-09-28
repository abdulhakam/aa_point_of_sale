-- Money is 2 decimal places everywhere: round existing values that carry insignificant digits.
--
-- Owner rule: no money value may have more than 2 decimals in the database (see
-- vault/decisions/money-is-2dp-everywhere.md). This backfill is idempotent — each statement only
-- touches rows that actually differ, so re-running is a no-op.
--
-- Deliberately NOT touched:
--   * `invoiceNo` — a human sequence; rounding it is meaningless and it is never fractional.
--   * `qty`, `scheme`, `box_size_qty` — quantities, not money.
--
-- Percentages (`discount_1`, `discount_2`) are included because they are operator-entered display
-- values; sub-2dp percentages are equally "insignificant digits".

UPDATE "items"
   SET "cost_price" = ROUND("cost_price", 2),
       "sale_price" = ROUND("sale_price", 2)
 WHERE "cost_price" <> ROUND("cost_price", 2)
    OR "sale_price" <> ROUND("sale_price", 2);

UPDATE "payments"
   SET "amount" = ROUND("amount", 2)
 WHERE "amount" <> ROUND("amount", 2);

UPDATE "expenses"
   SET "amount" = ROUND("amount", 2)
 WHERE "amount" <> ROUND("amount", 2);

UPDATE "invoices"
   SET "discount_1" = ROUND("discount_1", 2),
       "discount_2" = ROUND("discount_2", 2),
       "discount_rs" = ROUND("discount_rs", 2)
 WHERE "discount_1" <> ROUND("discount_1", 2)
    OR "discount_2" <> ROUND("discount_2", 2)
    OR "discount_rs" <> ROUND("discount_rs", 2);

UPDATE "transactions"
   SET "cost_price" = ROUND("cost_price", 2),
       "price" = ROUND("price", 2),
       "discount_1" = ROUND("discount_1", 2),
       "discount_2" = ROUND("discount_2", 2),
       "discount_rs" = ROUND("discount_rs", 2)
 WHERE "cost_price" <> ROUND("cost_price", 2)
    OR "price" <> ROUND("price", 2)
    OR "discount_1" <> ROUND("discount_1", 2)
    OR "discount_2" <> ROUND("discount_2", 2)
    OR "discount_rs" <> ROUND("discount_rs", 2);
