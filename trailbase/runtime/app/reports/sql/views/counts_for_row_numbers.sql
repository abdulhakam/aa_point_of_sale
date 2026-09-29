SELECT cast(`id` as text) `id`,`areas`,`sections`,`categories`,`purchase_invoices`,`sale_invoices`,`return_invoices`,`items`,`order_bookers`,`parties`,`recieving_payments`,`sending_payments` FROM (SELECT (ROW_NUMBER() OVER()) as id,
(SELECT COUNT (id) FROM areas) as areas,
(SELECT COUNT (id) FROM sections) as sections,
-- The legacy `categories` collection IS the company list, and on this system it maps
-- onto `companies` (migrations/main/U1790300400__map_pocketbase_categories_to_companies.sql).
-- Only the SOURCE table is remapped; the output column keeps the legacy name `categories`,
-- because that is the field the report shape consumes and the name PocketBase produced.
(SELECT COUNT (id) FROM companies) as categories,
(SELECT COUNT (id) FROM invoices WHERE type=0) as purchase_invoices,
(SELECT COUNT (id) FROM invoices WHERE type=1) as sale_invoices,
(SELECT COUNT (id) FROM invoices WHERE type=2) as return_invoices,
(SELECT COUNT (id) FROM items) as items,
(SELECT COUNT (id) FROM order_bookers) as order_bookers,
(SELECT COUNT (id) FROM parties) as parties,
(SELECT COUNT (id) FROM payments WHERE type = 1) as recieving_payments,
(SELECT COUNT (id) FROM payments WHERE type = 0) as sending_payments)
