-- transaction rows — the display rows shared by `profit` and `itemsales`.
--
-- Port of `transactionsRows` + `txRow` (compute/reports.js:247, :214). Both reports consume the
-- SAME row set and differ only in their totals, so it is written once here and both reference it
-- (see the registry in `lib/spoolreports.js`, which points both at this file).
--
-- `transactionsRows` filters to sale|return FIRST (reports.js:250) — that is what makes
-- `itemsales`' `returns` total possible at all.
--
-- NOTE: this file opens with CTEs, NOT `WITH`. `prelude.sql` already opened the clause, and two
-- `WITH` keywords in one statement is a syntax error. The loader concatenates prelude + this file.

, tx_filtered AS (
  SELECT
    tr.id,
    tr.dated,
    tr.type,
    tr.invoice,
    -- ⚠️ `invoiceNo` is a REAL, so selecting it raw printed "1.0", "2.0", "3840.0" — visible on the
    -- Profit Report and the Item Sales Report, which both read this file, while the reports reading
    -- `payments.sql` and `payments_by_company.sql` printed the integer text. The legacy column reads
    -- `S 8606`. This is the same normalisation those two files already do, copied rather than invented:
    -- integer-valued numbers become integer TEXT, and a genuinely fractional number falls back to TEXT
    -- so nothing is silently rounded away. Found by diffing this screen against
    -- `vault/attachments/legacy-ui/09-reports-profit.png` on 2026-10-05.
    --
    -- Still short of legacy, which prefixes the invoice TYPE letter and renders the number as a link to
    -- the invoice. Recorded as a discrepancy rather than half-done here.
    CASE WHEN CAST(tr.invoiceNo AS REAL) = CAST(CAST(tr.invoiceNo AS INTEGER) AS REAL)
         THEN CAST(CAST(tr.invoiceNo AS INTEGER) AS TEXT)
         ELSE CAST(tr.invoiceNo AS TEXT) END AS invoiceNo,
    tr.party,
    tr.item,
    tr.price,
    tr.qty,
    tr.scheme,
    tr.cost_price,
    tr.company,
    tr.area,
    tr.section,
    tr.booker,
    tr.net_amount,
    tr.final_amount,
    tr.profit,
    COALESCE(bn.name, '') AS booker_name,
    COALESCE(pn.name, '') AS party_name,
    COALESCE(an.name, '') AS area_name,
    COALESCE(sn.name, '') AS section_name,
    COALESCE(it.name, '') AS item_name,
    COALESCE(cn.name, '') AS company_name,
    COALESCE(it.box_size_qty, 0) AS box_size_qty
  FROM transactions_report tr
  LEFT JOIN (SELECT id, name FROM order_bookers) bn ON bn.id = tr.booker
  LEFT JOIN (SELECT id, name FROM parties) pn ON pn.id = tr.party
  LEFT JOIN (SELECT id, name FROM areas) an ON an.id = tr.area
  LEFT JOIN (SELECT id, name FROM sections) sn ON sn.id = tr.section
  LEFT JOIN (SELECT id, name, box_size_qty FROM items) it ON it.id = tr.item
  LEFT JOIN (SELECT id, name FROM companies) cn ON cn.id = tr.company
  WHERE
    -- reports.js:250: sale (1) or return (2) only.
    (tr.type = 1 OR tr.type = 2)
    -- reports.js:251 inDateRange on `created`.
    AND (:from = '' OR tr.dated >= :from || ' 00:00:00')
    AND (:to = '' OR tr.dated <= :to || ' 23:59:59.999Z')
    -- txFilters (reports.js:203-212): one nullable predicate per filter. All are BLOB ids except
    -- `invoice`, which also matches on the human invoice number.
    AND (:booker = '' OR tr.booker = :booker)
    AND (:party = '' OR tr.party = :party)
    AND (:area = '' OR tr.area = :area)
    AND (:section = '' OR tr.section = :section)
    AND (:item = '' OR tr.item = :item)
    AND (:company = '' OR tr.company = :company)
    -- `invoice` matches the id OR the human number (reports.js:211). TWO binds, and a CAST on the
    -- number: see the note in lib/spoolreports.js — one bind cannot be both a BLOB and a number, and
    -- `CAST(invoiceNo AS TEXT)` yields "3840.0" where the JS renders "3840".
    AND (:invoiceId = '' OR tr.invoice = :invoiceId OR CAST(tr.invoiceNo AS REAL) = CAST(:invoiceNo AS REAL))
),
tx_projected AS (
  -- txRow (reports.js:214-244). `INVOICE_TYPE_LABEL[type]` is a CASE; `qtyText` is the
  -- floor/modulo pluralised concat (format.js:27-35); the nine round2 calls are the money rule.
  SELECT
    id,
    -- The INVOICE's business date, not the row's insert time. `reports.js:251` filters on
  -- `created`, which in v1 WAS the business date; in TrailBase `created` is when the row was
  -- written, so on an imported ledger "profit for September" returned nothing at all.
  substr(dated, 1, 10) AS date,
    -- INVOICE_TYPE_LABEL (reports.js:17) is LOWERCASE: purchase/sale/return/difference. These labels
    -- are not decoration -- `reportProfit` sums on `r.type === "sale"` (reports.js:260) and
    -- `reportItemSales` on `r.type !== "sale"` (reports.js:268), so a case difference here would
    -- silently flip which side of a total every row lands on.
    (CASE type WHEN 1 THEN 'sale' WHEN 2 THEN 'return' WHEN 0 THEN 'purchase' WHEN 3 THEN 'difference' ELSE '' END) AS type,
    booker_name AS booker,
    invoiceNo,
    invoice AS invoiceId,
    party_name AS party,
    company_name AS company,
    area_name AS area,
    section_name AS section,
    item_name AS item,
    item AS itemId,
    (CAST((((price) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) - (CASE WHEN (((price) + 2.220446049250313e-16) * 100) + 0.5 < 0 AND (((price) + 2.220446049250313e-16) * 100) + 0.5 <> CAST((((price) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) THEN 1 ELSE 0 END)) / 100.0 AS price,
    qty,
    -- qtyDisplay (format.js:27): "[-]N ctn(s) M unit(s)" from the item's box size.
    (CASE WHEN box_size_qty = 0 THEN 1 ELSE box_size_qty END) AS box_size,
    scheme,
    (CAST((((net_amount) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) - (CASE WHEN (((net_amount) + 2.220446049250313e-16) * 100) + 0.5 < 0 AND (((net_amount) + 2.220446049250313e-16) * 100) + 0.5 <> CAST((((net_amount) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) THEN 1 ELSE 0 END)) / 100.0 AS net_amount,
    printf('%.2f', net_amount) AS net_amountText,
    (CAST((((final_amount) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) - (CASE WHEN (((final_amount) + 2.220446049250313e-16) * 100) + 0.5 < 0 AND (((final_amount) + 2.220446049250313e-16) * 100) + 0.5 <> CAST((((final_amount) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) THEN 1 ELSE 0 END)) / 100.0 AS final_amount,
    printf('%.2f', final_amount) AS final_amountText,
    (CAST((((profit) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) - (CASE WHEN (((profit) + 2.220446049250313e-16) * 100) + 0.5 < 0 AND (((profit) + 2.220446049250313e-16) * 100) + 0.5 <> CAST((((profit) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) THEN 1 ELSE 0 END)) / 100.0 AS profit,
    printf('%.2f', profit) AS profitText,
    -- The raw type code, carried for the totals CASE. `reportProfit` sums on the LABEL "sale"
    -- (reports.js:260) and `reportItemSales` on `type !== "sale"` (reports.js:268), so both reduce
    -- to the raw code — but keeping it explicit avoids depending on a display string.
    type AS type_code
  FROM tx_filtered
)
SELECT
  id,
  date,
  type,
  -- The invoice TYPE letter (`S`/`R`/`P`/`D`), the prefix legacy renders before the number in the
  -- invoice column (`S 8606`). Derived from the already-projected lowercase `type`, so it cannot
  -- disagree with the Type column it prefixes.
  upper(substr(type, 1, 1)) AS typeLetter,
  booker,
  invoiceNo,
  invoiceId,
  party,
  company,
  area,
  section,
  item,
  itemId,
  price,
  qty,
  -- The pluralised quantity string, built in SQL from the box size.
  (CASE WHEN qty < 0 THEN '-' ELSE '' END)
  || CAST(CAST(ABS(COALESCE(qty, 0)) / box_size AS INTEGER) AS TEXT)
  || CASE WHEN CAST(ABS(COALESCE(qty, 0)) / box_size AS INTEGER) = 1 THEN ' ctn ' ELSE ' ctns ' END
  || CAST(CAST(ABS(COALESCE(qty, 0)) % box_size AS INTEGER) AS TEXT)
  || CASE WHEN CAST(ABS(COALESCE(qty, 0)) % box_size AS INTEGER) = 1 THEN ' unit' ELSE ' units' END
  AS qtyText,
  scheme,
  net_amount,
  net_amountText,
  final_amount,
  final_amountText,
  profit,
  profitText,
  type_code
FROM tx_projected
-- transactionsRows sorts by compareText(date) (reports.js:254), and `reportProfit`/
-- `reportItemSales` ACCUMULATE IN THAT ORDER (reports.js:259-261, :267-268). So the order is part
-- of the money, not presentation: SQLite's SUM has no defined order.
--
-- `lower()` is the cheap key; the case tie-break in compareText is unreachable for `YYYY-MM-DD`.
ORDER BY lower(date), date, id;