-- outstanding payments — per-party balance, entirely in SQLite.
--
-- Port of `buildOutstanding` (compute/views.js:431) + `reportOutstanding` (compute/reports.js:493).
--
-- Two distinct thresholds, and they are NOT the same test:
--   - per INVOICE (views.js:447): `unpaid - paid >= 1` decides whether that invoice's NUMBER appears
--     in the row's `invoice_nos` list;
--   - per PARTY (views.js:476): `|balance| < 1` DROPS the row entirely.
-- Conflating them would change which rows exist and which numbers they list.

, per_invoice AS (
  -- views.js:437-443: unpaid/paid summed per (party, invoice) over recieving payments.
  SELECT
    party,
    invoice,
    SUM((CASE WHEN paid = 0 THEN amount ELSE 0 END)) AS unpaid,
    SUM((CASE WHEN paid = 1 THEN amount ELSE 0 END)) AS paid,
    MAX(invoiceNo) AS invoiceNo
  FROM payments_view
  WHERE type = 1 AND invoice IS NOT NULL
  GROUP BY party, invoice
),
outstanding_nos AS (
  -- views.js:445-452, then joined per party at views.js:477-480.
  --
  -- `String(Math.trunc(num(invoiceNo)))` (views.js:450) TRUNCATES toward zero, which is what
  -- SQLite's CAST(... AS INTEGER) does, so 8586.9 becomes "8586".
  --
  -- The list is sorted NUMERICALLY (`Number(a) - Number(b)`, views.js:480). `group_concat` cannot
  -- take an ORDER BY, and its natural order is the order rows arrive, which is text — so "10" would
  -- sort before "9". The ORDER BY therefore lives in a subquery whose rows arrive already sorted,
  -- and `group_concat` then concatenates them in that order. That is a documented-but-fragile use of
  -- group_concat, and the alternative (a recursive CTE over a number sequence) is far more machinery
  -- for the same string.
  SELECT
    party,
    GROUP_CONCAT(no, ',') AS invoice_nos
  FROM (
    SELECT DISTINCT
      pi.party AS party,
      CAST(CAST(pi.invoiceNo AS REAL) AS INTEGER) AS sort_key,
      CAST(CAST(pi.invoiceNo AS REAL) AS INTEGER) AS no
    FROM per_invoice pi
    WHERE pi.unpaid - pi.paid >= 1
    ORDER BY pi.party, sort_key
  )
  GROUP BY party
),
party_grouped AS (
  -- views.js:457-470: the per-party accumulators. `booker` is LAST-WRITTEN wins (views.js:464), so
  -- it needs the row with the greatest id among those that set it.
  SELECT
    party,
    SUM((CASE WHEN type = 1 AND paid = 0 THEN amount ELSE 0 END)) AS invoice_total,
    SUM((CASE WHEN type = 1 AND paid = 1 THEN amount ELSE 0 END)) AS paid_total,
    SUM((CASE WHEN type = 2 AND party_type = 0 THEN amount ELSE 0 END)) AS return_total
  FROM payments_view
  WHERE party IS NOT NULL AND (type = 1 OR type = 2)
  GROUP BY party
),
-- views.js:464 — `if (p.booker) e.booker = p.booker`, accumulated over paymentsView (id DESC). The value
-- that survives is the one on the FIRST payment in that order that HAS one, which is the booker of the
-- SMALLEST id among those.
--
-- `MIN(id)` is load-bearing, not decoration. SQLite's documented rule is that in an aggregate query
-- containing min() or max(), every BARE column takes its value from the row that produced the extreme
-- — so `SELECT party, booker, MIN(id) … GROUP BY party` carries the booker of the min-id row, in one
-- pass. Two things this replaces:
--   - `MIN(id) AS booker` alone, which returned that PAYMENT's id instead of its booker, so the
--     `booker` filter compared a booker id against payment ids and matched nothing;
--   - a correlated `WHERE pbp.id = (SELECT MIN(id) …)` subquery, which is correct but re-runs the whole
--     payments chain once per row: 20 s on this depot, where the GROUP BY form is milliseconds.
--
-- The bare column must therefore stay unaliased and unaggregated. Do not "tidy" it.
party_booker AS (
  SELECT party, booker, MIN(id) AS min_id
  FROM payments_view
  WHERE party IS NOT NULL AND booker IS NOT NULL AND (type = 1 OR type = 2)
  GROUP BY party
),
-- views.js:465-469: area/section come from the PARTY record, not from a payment. Joining
  -- `payments_view` directly on `party` would fan out — one row per payment of that party, which is
  -- how this first returned 22,590 rows instead of 600. The party is unique, so it is resolved once.
party_geo AS (
  SELECT
    pt.id AS party,
    pt.area AS area_id,
    ar.section AS section_id
  FROM parties pt
LEFT JOIN areas ar ON ar.id = pt.area
)
SELECT
  pg.party AS id,
  COALESCE(pn.name, '') AS party_name,
  COALESCE(onv.invoice_nos, '') AS invoice_nos,
  pg.invoice_total,
  pg.paid_total,
  (CAST((((pg.invoice_total - pg.paid_total - pg.return_total) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) - (CASE WHEN (((pg.invoice_total - pg.paid_total - pg.return_total) + 2.220446049250313e-16) * 100) + 0.5 < 0 AND (((pg.invoice_total - pg.paid_total - pg.return_total) + 2.220446049250313e-16) * 100) + 0.5 <> CAST((((pg.invoice_total - pg.paid_total - pg.return_total) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) THEN 1 ELSE 0 END)) / 100.0 AS balance,
  printf('%.2f', pg.invoice_total) AS invoice_totalText,
  printf('%.2f', pg.paid_total) AS paid_totalText,
  printf('%.2f', (CAST((((pg.invoice_total - pg.paid_total - pg.return_total) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) - (CASE WHEN (((pg.invoice_total - pg.paid_total - pg.return_total) + 2.220446049250313e-16) * 100) + 0.5 < 0 AND (((pg.invoice_total - pg.paid_total - pg.return_total) + 2.220446049250313e-16) * 100) + 0.5 <> CAST((((pg.invoice_total - pg.paid_total - pg.return_total) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) THEN 1 ELSE 0 END)) / 100.0) AS balanceText,
pb.booker AS booker_id,
  pg2.area_id AS area_id,
  pg2.section_id AS section_id,
  -- The RAW sum behind `balance` (views.js:475). JS accumulates per party in payments_view order
  -- (payments.id DESC) and SQLite's SUM makes no such promise, so on an exact half-paisa boundary
  -- the two round to opposite sides — measured at 2774.495, party HUNAIN G/S. Carried so the gate can
  -- tell that boundary apart from a real paisa, since the rounded outputs carry no fraction of
  -- their own.
  pg.invoice_total AS invoice_raw,
  pg.paid_total AS paid_raw,
  pg.return_total AS return_raw
FROM party_grouped pg
LEFT JOIN (SELECT id, name FROM parties) pn ON pn.id = pg.party
LEFT JOIN outstanding_nos onv ON onv.party = pg.party
LEFT JOIN party_booker pb ON pb.party = pg.party
LEFT JOIN party_geo pg2 ON pg2.party = pg.party
WHERE
  -- views.js:476: the PARTY threshold. `ABS(balance) < 1` drops the row.
  ABS(pg.invoice_total - pg.paid_total - pg.return_total) >= 1
  AND (:booker = '' OR pb.booker = :booker)
  AND (:area = '' OR pg2.area_id = :area)
  AND (:section = '' OR pg2.section_id = :section)
-- reportOutstanding sorts by compareText(party_name) (reports.js:509) and the totals sum the
-- rounded per-row values in that order (reports.js:510).
ORDER BY lower(COALESCE(pn.name, '')), COALESCE(pn.name, '');