-- Dashboard tile counts.
--
-- The last JavaScript-built view the app actually read (`buildCounts` in `app/compute/views.js`).
-- Eleven numbers, one row, no joins — which is why it is a statement rather than a function: there is
-- no arithmetic to express in JavaScript, only eleven COUNTs that the database is better at doing.
--
-- `categories` keeps its LEGACY key while reading `companies`, because that is the field name the tile
-- and the report shape consume; the list itself is the same one (vault/decisions/categories-is-the-company-list.md).
--
-- Standalone: it needs no prelude, because nothing here is derived — every number is a row count on a
-- base table, which is the definition of something a view layer used to be asked to do for nothing.

SELECT
  (SELECT COUNT(*) FROM sections)                            AS sections,
  (SELECT COUNT(*) FROM areas)                                AS areas,
  (SELECT COUNT(*) FROM companies)                            AS categories,
  (SELECT COUNT(*) FROM parties)                              AS parties,
  (SELECT COUNT(*) FROM order_bookers)                        AS order_bookers,
  (SELECT COUNT(*) FROM items)                                AS items,
  (SELECT COUNT(*) FROM invoices WHERE type = 0)              AS purchase_invoices,
  (SELECT COUNT(*) FROM invoices WHERE type = 1)              AS sale_invoices,
  (SELECT COUNT(*) FROM invoices WHERE type = 2)              AS return_invoices,
  -- Payment type is the raw code, num()-coerced on the JS side (views.js `relId` + `=== 1`).
  -- 1 = recieving, 0 = sending; anything else is neither and is deliberately not counted.
  (SELECT COUNT(*) FROM payments WHERE type = 1)              AS recieving_payments,
  (SELECT COUNT(*) FROM payments WHERE type = 0)              AS sending_payments;
