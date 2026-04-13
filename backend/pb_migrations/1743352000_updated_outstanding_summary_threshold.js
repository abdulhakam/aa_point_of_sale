/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("outstanding_summary");

  collection.options = {
    "query": `SELECT id, party, party_name, invoice_nos, booker, area, section, invoice_total, paid_total, return_total, balance FROM (
  SELECT
    pv.party AS id,
    pv.party,
    MAX(parties.name) AS party_name,
    GROUP_CONCAT(DISTINCT CAST(CAST(inv_outstanding.invoiceNo AS INTEGER) AS TEXT)) AS invoice_nos,
    MAX(pv.booker) AS booker,
    MAX(parties.area) AS area,
    MAX(areas.section) AS section,
    COALESCE(SUM(CASE WHEN pv.type = 'recieving' AND pv.paid = 0 THEN pv.amount ELSE 0 END), 0) AS invoice_total,
    COALESCE(SUM(CASE WHEN pv.type = 'recieving' AND pv.paid = 1 THEN pv.amount ELSE 0 END), 0) AS paid_total,
    COALESCE(SUM(CASE WHEN pv.type = 'return' AND parties.type = 'customer' THEN pv.amount ELSE 0 END), 0) AS return_total,
    COALESCE(SUM(CASE WHEN pv.type = 'recieving' AND pv.paid = 0 THEN pv.amount ELSE 0 END), 0)
      - COALESCE(SUM(CASE WHEN pv.type = 'recieving' AND pv.paid = 1 THEN pv.amount ELSE 0 END), 0)
      - COALESCE(SUM(CASE WHEN pv.type = 'return' AND parties.type = 'customer' THEN pv.amount ELSE 0 END), 0) AS balance
  FROM payments_view pv
  LEFT JOIN parties ON pv.party = parties.id
  LEFT JOIN areas ON parties.area = areas.id
  LEFT JOIN (
    SELECT pv2.party, pv2.invoice, pv2.invoiceNo
    FROM payments_view pv2
    WHERE pv2.type = 'recieving' AND pv2.invoice != ''
    GROUP BY pv2.party, pv2.invoice
    HAVING
      COALESCE(SUM(CASE WHEN pv2.paid = 0 THEN pv2.amount ELSE 0 END), 0)
      - COALESCE(SUM(CASE WHEN pv2.paid = 1 THEN pv2.amount ELSE 0 END), 0) >= 1
  ) inv_outstanding ON inv_outstanding.party = pv.party
  WHERE pv.type IN ('recieving', 'return') AND pv.party != ''
  GROUP BY pv.party
) t WHERE ABS(t.balance) >= 1`
  };

  return dao.saveCollection(collection);
}, (db) => {
  // Rollback: restore the old 0.1 threshold
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("outstanding_summary");

  collection.options = {
    "query": `SELECT id, party, party_name, invoice_nos, booker, area, section, invoice_total, paid_total, return_total, balance FROM (
  SELECT
    pv.party AS id,
    pv.party,
    MAX(parties.name) AS party_name,
    GROUP_CONCAT(DISTINCT CAST(CAST(inv_outstanding.invoiceNo AS INTEGER) AS TEXT)) AS invoice_nos,
    MAX(pv.booker) AS booker,
    MAX(parties.area) AS area,
    MAX(areas.section) AS section,
    COALESCE(SUM(CASE WHEN pv.type = 'recieving' AND pv.paid = 0 THEN pv.amount ELSE 0 END), 0) AS invoice_total,
    COALESCE(SUM(CASE WHEN pv.type = 'recieving' AND pv.paid = 1 THEN pv.amount ELSE 0 END), 0) AS paid_total,
    COALESCE(SUM(CASE WHEN pv.type = 'return' AND parties.type = 'customer' THEN pv.amount ELSE 0 END), 0) AS return_total,
    COALESCE(SUM(CASE WHEN pv.type = 'recieving' AND pv.paid = 0 THEN pv.amount ELSE 0 END), 0)
      - COALESCE(SUM(CASE WHEN pv.type = 'recieving' AND pv.paid = 1 THEN pv.amount ELSE 0 END), 0)
      - COALESCE(SUM(CASE WHEN pv.type = 'return' AND parties.type = 'customer' THEN pv.amount ELSE 0 END), 0) AS balance
  FROM payments_view pv
  LEFT JOIN parties ON pv.party = parties.id
  LEFT JOIN areas ON parties.area = areas.id
  LEFT JOIN (
    SELECT pv2.party, pv2.invoice, pv2.invoiceNo
    FROM payments_view pv2
    WHERE pv2.type = 'recieving' AND pv2.invoice != ''
    GROUP BY pv2.party, pv2.invoice
    HAVING
      COALESCE(SUM(CASE WHEN pv2.paid = 0 THEN pv2.amount ELSE 0 END), 0)
      - COALESCE(SUM(CASE WHEN pv2.paid = 1 THEN pv2.amount ELSE 0 END), 0) > 0.1
  ) inv_outstanding ON inv_outstanding.party = pv.party
  WHERE pv.type IN ('recieving', 'return') AND pv.party != ''
  GROUP BY pv.party
) t WHERE ABS(t.balance) > 0.1`
  };

  return dao.saveCollection(collection);
});
