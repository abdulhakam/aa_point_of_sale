-- refs: the reference lists behind every filter dropdown and every management picker.
--
-- This file is the DEFINITION of what `refs` is. Before it, the list was written twice in
-- JavaScript — `buildRefs` named the nine keys, and `VIEW_DEPS.refs.tables` named the nine tables —
-- and the two could disagree, which is the same duplication class that
-- [[tb-0032-manifest-first-refactor]] exists to remove.
--
-- It is a `.sql` file rather than a hand-written statement per table for a concrete reason: the nine
-- tables have different column counts, so they cannot be UNION ALL'd with `SELECT *`, and spelling
-- out each table's columns here would duplicate `pragma_table_info` and drift from it the first time
-- a migration adds a column. So this returns the (key, table) pairs and the loader reads each table
-- through the same `readTable` the rest of the guest uses. The definition moves to SQL; the transport
-- stays shared. Anything that changes WHAT refs is — a new list, a renamed table, a different key —
-- is a change to this file alone.
--
-- The renames are not cosmetic and must not be "tidied":
--   bookers       -> `order_bookers`   the key the templates read; the table is order_bookers
--   partyTypes    -> `party_types`     camelCase in the key, snake_case in the table
--   invoiceTypes  -> `invoice_types`
--   paymentTypes  -> `payment_types`
-- There is deliberately NO `categories` entry. The legacy `categories` collection maps onto
-- `companies`, and every consumer of a company list reads `refs.companies` — adding a third name for
-- the same rows is how the duplication started.

SELECT 'sections' AS ref_key, 'sections' AS table_name
UNION ALL SELECT 'companies', 'companies'
UNION ALL SELECT 'areas', 'areas'
UNION ALL SELECT 'parties', 'parties'
UNION ALL SELECT 'bookers', 'order_bookers'
UNION ALL SELECT 'items', 'items'
UNION ALL SELECT 'partyTypes', 'party_types'
UNION ALL SELECT 'invoiceTypes', 'invoice_types'
UNION ALL SELECT 'paymentTypes', 'payment_types';