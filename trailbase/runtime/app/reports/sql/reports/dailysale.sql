-- daily sale — sale invoices with their total, entirely in SQLite.
--
-- Port of `reportDailySale` (compute/reports.js:465), reading `invoiceView`.
--
-- `i.dated` (reports.js:469) is `inv.dated || inv.created` (views.js:98) — the invoice's OWN dated
-- column when set, otherwise its created. The prelude's `invoice_view` carries `created` only, so
-- `dated` is added here; `COALESCE(dated, created)` reproduces the JS `||`, which also falls back
-- for an empty string, hence the second COALESCE.
--
-- `i.total` is `round2(s)` — the sum of ALREADY-ROUNDED line totals BEFORE the invoice discount
-- chain (views.js:107). That is NOT `final_total`, and not `unrounded_total`: using either changed
-- this report's total by the invoice discount amount on every row.

, sale_invoices AS (
  SELECT
    iv.id,
    iv.invoiceNo,
    iv.party,
    iv.booker,
    COALESCE(NULLIF(iv.dated, ''), iv.created) AS dated,
    (CAST((((iv.s) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) - (CASE WHEN (((iv.s) + 2.220446049250313e-16) * 100) + 0.5 < 0 AND (((iv.s) + 2.220446049250313e-16) * 100) + 0.5 <> CAST((((iv.s) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) THEN 1 ELSE 0 END)) / 100.0 AS total,
    pn.name AS party_name,
    an.name AS area_name,
    bn.name AS booker_name,
    ar.section AS section_id
  FROM invoice_s iv
  LEFT JOIN (SELECT id, name FROM parties) pn ON pn.id = iv.party
  LEFT JOIN (SELECT id, name FROM areas) an ON an.id = (SELECT area FROM parties WHERE id = iv.party)
  LEFT JOIN (SELECT id, name FROM order_bookers) bn ON bn.id = iv.booker
  -- reports.js:471-477: the area/section filter resolves through the PARTY's area, and section
  -- through THAT area — not through the invoice. So both joins key off the party's area.
  LEFT JOIN (SELECT id, section FROM areas) ar ON ar.id = (SELECT area FROM parties WHERE id = iv.party)
  WHERE
    -- reports.js:468: sale invoices only.
    iv.type = 1
    AND (:from = '' OR dated >= :from || ' 00:00:00')
    AND (:to = '' OR dated <= :to || ' 23:59:59.999Z')
    AND (:booker = '' OR iv.booker = :booker)
    AND (:area = '' OR an.id = :area)
    AND (:section = '' OR ar.section = :section)
)
SELECT
  id,
  invoiceNo,
  COALESCE(party_name, '') AS party,
  COALESCE(area_name, '') AS area,
  COALESCE(booker_name, '') AS booker,
  total,
  printf('%.2f', total) AS totalText,
  party AS party_id,
  (SELECT area FROM parties WHERE id = party) AS area_id,
  booker AS booker_id
FROM sale_invoices
-- reports.js:488 sorts by `num(a.invoiceNo) - num(b.invoiceNo)`, a NUMERIC sort. SQLite's default
-- order on a mixed text/number column is not numeric, so the key is cast — otherwise 10 sorts before
-- 9 and the total (which sums in this order) is unchanged but the page order is wrong.
ORDER BY CAST(invoiceNo AS REAL), id;