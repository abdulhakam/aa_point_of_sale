-- payments by company — each payment split across its invoice's companies, entirely in SQLite.
--
-- Port of `buildPaymentsInvoicesReport` (compute/views.js:200-243) + `reportPaymentsByCompany`
-- (compute/reports.js:152).
--
-- THE FAN-OUT. `buildPaymentsInvoicesReport` emits one row per (payment, company) PAIR: a payment's
-- amount is allocated across the invoice's lines in proportion to each company's share of the
-- invoice's `unrounded_total` (views.js:210-212). A payment on an invoice with three companies
-- becomes THREE rows. The row id is `${paymentId}|${companyId}` (views.js:221), not the payment id.
--
-- `paymentsInvoicesReport` is a VIEW, so it is carried in the prelude alongside the others; this
-- file is the display projection and the filters.

, company_share AS (
  -- views.js:201-213: net_amount summed per (invoice, company), then the ratio to the invoice's
  -- unrounded total. A missing company is keyed as NULL (views.js:203), which is why this groups on
  -- the COALESCE'd column rather than on the raw one.
  --
  -- `unrounded ? sum / unrounded : 0` (views.js:212) — the same zero-denominator guard the allocation
  -- uses, and it matters: SQLite would yield NULL (-> printf "0.00") where the JS yields 0.
  --
  -- READS `net_rounded`, NOT `transactions_report`. The three columns this needs — the line's
  -- `net_amount`, the item's `category` (which is where `company` comes from, transactions_report
  -- joining `items` for it) and the invoice's `unrounded` (already carried as `unrounded_total` by
  -- `net_line`, with the same COALESCE the old `ic.unrounded` guard applied) — are all available two
  -- CTEs earlier. Reading `transactions_report` instead drags in `allocated`, `alloc_rounded` and
  -- `profit_rounded`, so SQLite computes the invoice-discount allocation, the cost line and the
  -- profit for all 23,413 transaction rows to throw three of the four away. Grouping on
  -- `unrounded_total` (already COALESCE'd to 0) rather than the raw `ic.unrounded` merges nothing:
  -- NULL and 0 take the same branch of the CASE, and they cannot both occur for one invoice, since
  -- it is the same join key.
  --
  -- Measured on the production depot, 2026-10-02: 81 ms of a 595 ms page query and 78 ms of a 641 ms
  -- uncapped one, with the 13,862-row result byte-identical.
  SELECT
    nr.invoice AS invoice,
    it.category AS company,
    (CASE WHEN COALESCE(nr.unrounded_total, 0) <> 0
          THEN SUM(nr.net_amount) / nr.unrounded_total
          ELSE 0 END) AS ratio
  FROM net_rounded nr
  LEFT JOIN items it ON it.id = nr.item
  GROUP BY nr.invoice, it.category, nr.unrounded_total
),
payments_by_company AS (
  -- views.js:215-241. The type map is `typeMap[p.type] ?? p.type` (views.js:235), so an unmapped type
  -- stays NUMERIC rather than becoming NULL.
  SELECT
    -- THE ROW ID IS A BASE64 COMPOSITE, and that is load-bearing.
  --
  -- views.js:221 builds `${p.id}|${part.company ?? ""}` in JAVASCRIPT, where `p.id` is already the
  -- base64 string the host bridge produced for a BLOB (api::value_to_json URL-safe-encodes blobs).
  -- Concatenating the raw BLOB in SQL instead yields the 16 raw bytes with no separator — the id
  -- came out as `"\u0001\xf3...v?rk..."` instead of `"AaDr_azGcgi8H-ecAcNM1w|AaDr_TSUc..."`, so every
  -- row failed to join against the JS by id while the row COUNT still matched exactly. That is a
  -- particularly nasty failure: the gate reported 32,562 rows and every one "differing", which reads
  -- like a data problem rather than an encoding one.
  --
  -- `hex()` is used rather than the usual `unhex(hex(..))` dance because here the direction is
  -- BLOB -> text: `hex(blob)` returns the hex of its bytes, and base64 is derived from that.
  --
  -- SQLite has no base64() builtin, so the id is assembled as HEX and the template does not need a
  -- decode step: the guest decodes it. `lib/spoolreports.js` is the only consumer.
  hex(pv.id) || '|' || COALESCE(hex(cs.company), '') AS id,
    pv.id AS payment_id,
    pv.created,
    pv.updated,
    pv.payment_date AS dated,
    pv.invoice,
    pv.invoiceNo,
    pv.booker,
    cs.company,
    pv.party,
    pv.area,
    pv.section,
    pv.party_type,
    pv.type,
    (cs.ratio * pv.amount) AS amount,
    pv.paid,
    pv.description
  FROM payments_view pv
  LEFT JOIN company_share cs ON cs.invoice = pv.invoice
  -- views.js:218: a payment with no invoice contributes no rows at all.
  WHERE pv.invoice IS NOT NULL
)
SELECT
  pb.id,
  substr(pb.created, 1, 10) AS date,
  -- reports.js:170: `${type} payment` or `${type} invoice`.
  --
  -- `type` here is the LABEL from typeMap (views.js:235: `typeMap[p.type] ?? p.type`), NOT the raw
  -- payment type code — "sale payment", not "1 payment". That is not cosmetic: `type` is carried
  -- through `paymentsByCompany` and the totals branch on it textually
  -- (`type.startsWith("return")`, reports.js:186, :188), and the filter at reports.js:157 admits
  -- only the labels "sale" / "return" / "recieving". Emitting the code produced "1 invoice" and made
  -- the return bucket permanently empty.
  (CASE WHEN pb.description = 'payment'
        THEN (CASE pb.type WHEN 0 THEN 'purchase' WHEN 1 THEN 'sale' WHEN 2 THEN 'return' ELSE CAST(pb.type AS TEXT) END) || ' payment'
        ELSE (CASE pb.type WHEN 0 THEN 'purchase' WHEN 1 THEN 'sale' WHEN 2 THEN 'return' ELSE CAST(pb.type AS TEXT) END) || ' invoice'
   END) AS type,
  -- reports.js:171 `invoiceNo(invoiceMap, p.invoice)`: the human number, or "" with no invoice.
  -- The JS value is a NUMBER, so it renders without a decimal point; an integer-valued REAL is cast
  -- back to an integer first, since CAST(x AS TEXT) alone would give "5652.0".
  CASE WHEN pb.invoiceNo IS NULL THEN ''
       WHEN CAST(pb.invoiceNo AS REAL) = CAST(CAST(pb.invoiceNo AS INTEGER) AS REAL)
       THEN CAST(CAST(pb.invoiceNo AS INTEGER) AS TEXT)
       ELSE CAST(pb.invoiceNo AS TEXT) END AS invoice,
  '' AS originalInvoice,
  COALESCE(an.name, '') AS area,
  COALESCE(sn.name, '') AS section,
  COALESCE(cn.name, '') AS company,
  COALESCE(pn.name, '') AS party,
  COALESCE(bn.name, '') AS booker,
  (CAST((((pb.amount) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) - (CASE WHEN (((pb.amount) + 2.220446049250313e-16) * 100) + 0.5 < 0 AND (((pb.amount) + 2.220446049250313e-16) * 100) + 0.5 <> CAST((((pb.amount) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) THEN 1 ELSE 0 END)) / 100.0 AS amount,
  -- reports.js:179: `num(p.amount).toFixed(2)` — the RAW amount, NOT the rounded `amount` field above.
  -- For a half-paisa allocation the two differ, and the totals sum the ROUNDED field.
  printf('%.2f', pb.amount) AS amountText,
  pb.paid,
  pb.description,
  pb.type AS type_code
FROM payments_by_company pb
-- The name tables are aliased AND their id columns are never referenced unqualified: `id` is also a
-- column of `payments_by_company`, so an unqualified reference is ambiguous (`ambiguous column
-- name: id`). The projection qualifies every pb column for the same reason.
LEFT JOIN (SELECT id AS ref_id, name FROM areas) an ON an.ref_id = pb.area
LEFT JOIN (SELECT id AS ref_id, name FROM sections) sn ON sn.ref_id = pb.section
LEFT JOIN (SELECT id AS ref_id, name FROM companies) cn ON cn.ref_id = pb.company
LEFT JOIN (SELECT id AS ref_id, name FROM parties) pn ON pn.ref_id = pb.party
LEFT JOIN (SELECT id AS ref_id, name FROM order_bookers) bn ON bn.ref_id = pb.booker
WHERE
  -- reports.js:157: only these three types reach the report. The JS compares against the LABEL
  -- ("sale"/"return"/"recieving"), which is typeMap[p.type], so the code is mapped first.
  (CASE pb.type WHEN 0 THEN 'purchase' WHEN 1 THEN 'sale' WHEN 2 THEN 'return' ELSE CAST(pb.type AS TEXT) END)
    IN ('sale', 'return', 'recieving')
  -- reports.js:158: the date range applies unless `applyDate === false`, which the report page never
  -- sends — so it is applied unconditionally here and the flag is not plumbed through.
  AND (:from = '' OR dated >= :from || ' 00:00:00')
  AND (:to = '' OR dated <= :to || ' 23:59:59.999Z')
  AND (:company = '' OR pb.company = :company)
  AND (:party = '' OR pb.party = :party)
  AND (:area = '' OR pb.area = :area)
  AND (:section = '' OR pb.section = :section)
  AND (:booker = '' OR pb.booker = :booker)
  -- `invoice` matches the id OR the human number (reports.js:167). TWO binds, and a CAST on the
  -- number: see the note in lib/spoolreports.js — one bind cannot be both a BLOB and a number, and
  -- `CAST(invoiceNo AS TEXT)` yields "3840.0" where the JS renders "3840".
  AND (:invoiceId = '' OR pb.invoice = :invoiceId OR CAST(pb.invoiceNo AS REAL) = CAST(:invoiceNo AS REAL))
-- reports.js:183 sorts by compareText(date), and the totals sum the rows in that order
-- (reports.js:185-188), so the order is part of the money.
ORDER BY lower(substr(created, 1, 10)), substr(created, 1, 10), id;