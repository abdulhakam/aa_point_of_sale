SELECT
  transactions.id,
  invoice,
  invoices.type,
  invoices.party,
  parties.type AS party_type,
  parties.area,
  areas.section,
  invoices.invoiceNo,
  item,
  transactions.cost_price,
  price,
  transactions.qty,
  scheme,
  transactions.discount_1,
  transactions.discount_2,
  transactions.discount_rs,
  ((price*transactions.qty)
  *(1 - (transactions.discount_1 / 100.0))
  *(1 - (transactions.discount_2 / 100.0)))-transactions.discount_rs
  AS total,
  invoices.discount_1 AS inv_d1,
  invoices.discount_2 AS inv_d2,
  invoices.discount_rs AS inv_drs,
  (CASE WHEN ((COALESCE(((price*transactions.qty)
  *(1 - (transactions.discount_1 / 100.0))
  *(1 - (transactions.discount_2 / 100.0))-transactions.discount_rs)
  *(1 - (invoices.discount_1 / 100.0))
  *(1 - (invoices.discount_2 / 100.0)), 0)) + 2.220446049250313e-16) * 100 >= 0 THEN CAST(((COALESCE(((price*transactions.qty)
  *(1 - (transactions.discount_1 / 100.0))
  *(1 - (transactions.discount_2 / 100.0))-transactions.discount_rs)
  *(1 - (invoices.discount_1 / 100.0))
  *(1 - (invoices.discount_2 / 100.0)), 0)) + 2.220446049250313e-16) * 100 + 0.5 AS INTEGER) ELSE -CAST(-(((COALESCE(((price*transactions.qty)
  *(1 - (transactions.discount_1 / 100.0))
  *(1 - (transactions.discount_2 / 100.0))-transactions.discount_rs)
  *(1 - (invoices.discount_1 / 100.0))
  *(1 - (invoices.discount_2 / 100.0)), 0)) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) END) / 100.0 AS net_amount,
  (CASE WHEN ((COALESCE((cost_price*transactions.qty), 0)) + 2.220446049250313e-16) * 100 >= 0 THEN CAST(((COALESCE((cost_price*transactions.qty), 0)) + 2.220446049250313e-16) * 100 + 0.5 AS INTEGER) ELSE -CAST(-(((COALESCE((cost_price*transactions.qty), 0)) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) END) / 100.0 AS profit,
  transactions.deleted,
  transactions.created,
  transactions.updated
FROM
  transactions
  LEFT JOIN invoices ON transactions.invoice = invoices.id
  LEFT JOIN parties ON invoices.party = parties.id
  LEFT JOIN areas ON parties.area = areas.id
GROUP BY transactions.id
