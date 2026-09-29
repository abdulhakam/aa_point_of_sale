SELECT id, party, party_name, invoice_nos, booker, area, section, invoice_total, paid_total, return_total, balance FROM (
  SELECT
    pv.party AS id,
    pv.party,
    MAX(parties.name) AS party_name,
    MAX(inv_outstanding.invoice_nos) AS invoice_nos,
    MAX(pv.booker) AS booker,
    MAX(parties.area) AS area,
    MAX(areas.section) AS section,
    COALESCE(SUM(CASE WHEN pv.type = 1 AND pv.paid = 0 THEN pv.amount ELSE 0 END), 0) AS invoice_total,
    COALESCE(SUM(CASE WHEN pv.type = 1 AND pv.paid = 1 THEN pv.amount ELSE 0 END), 0) AS paid_total,
    COALESCE(SUM(CASE WHEN pv.type = 2 AND parties.type = 0 THEN pv.amount ELSE 0 END), 0) AS return_total,
    COALESCE(SUM(CASE WHEN pv.type = 1 AND pv.paid = 0 THEN pv.amount ELSE 0 END), 0)
      - COALESCE(SUM(CASE WHEN pv.type = 1 AND pv.paid = 1 THEN pv.amount ELSE 0 END), 0)
      - COALESCE(SUM(CASE WHEN pv.type = 2 AND parties.type = 0 THEN pv.amount ELSE 0 END), 0) AS balance
  FROM payments_view pv
  LEFT JOIN parties ON pv.party = parties.id
  LEFT JOIN areas ON parties.area = areas.id
  LEFT JOIN (
    -- Must return AT MOST ONE ROW PER PARTY. The legacy version selected
    -- (party, invoice, invoiceNo) grouped by (party, invoice) and then joined on
    -- party alone, so a party with 20 outstanding invoices had all 20 rows joined
    -- onto every one of its payment rows. That fan-out multiplied invoice_total,
    -- paid_total and balance: the report totalled 28,656,988.99 against a true
    -- 3,698,209.31, and one party showed 30.7M of the world's 29.7M of receivables.
    -- GROUP_CONCAT(DISTINCT ...) on invoice_nos hid it, because DISTINCT collapsed
    -- the duplicated invoice numbers while leaving the sums multiplied.
    -- buildOutstanding() has no such join: it keeps a Map<party, Set<invoiceNo>>.
    SELECT party, GROUP_CONCAT(DISTINCT CAST(CAST(invoiceNo AS INTEGER) AS TEXT)) AS invoice_nos
    FROM (
      SELECT pv2.party AS party, pv2.invoiceNo AS invoiceNo
      FROM payments_view pv2
      WHERE pv2.type = 1 AND pv2.invoice IS NOT NULL
      GROUP BY pv2.party, pv2.invoice
      HAVING
        COALESCE(SUM(CASE WHEN pv2.paid = 0 THEN pv2.amount ELSE 0 END), 0)
        - COALESCE(SUM(CASE WHEN pv2.paid = 1 THEN pv2.amount ELSE 0 END), 0) >= 1
    ) outstanding_invoices
    GROUP BY party
  ) inv_outstanding ON inv_outstanding.party = pv.party
  WHERE pv.type IN (1, 2) AND pv.party IS NOT NULL
  GROUP BY pv.party
) t WHERE ABS(t.balance) >= 1
