SELECT
  invoices.id,
  (CASE WHEN invoices.dated == '' THEN invoices.created ELSE invoices.dated END) AS dated,
  invoices.type,
  invoices.invoiceNo,
  invoices.party,
  invoices.booker,
  invoice_maker,
  invoices.discount_1,
  invoices.discount_2,
  --transactions_view.net_cptrans*qty AS stock_price,
  (CASE WHEN ((COALESCE(COALESCE(SUM((CASE WHEN ((COALESCE(transaction_view.total, 0)) + 2.220446049250313e-16) * 100 >= 0 THEN CAST(((COALESCE(transaction_view.total, 0)) + 2.220446049250313e-16) * 100 + 0.5 AS INTEGER) ELSE -CAST(-(((COALESCE(transaction_view.total, 0)) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) END) / 100.0), 0), 0)) + 2.220446049250313e-16) * 100 >= 0 THEN CAST(((COALESCE(COALESCE(SUM((CASE WHEN ((COALESCE(transaction_view.total, 0)) + 2.220446049250313e-16) * 100 >= 0 THEN CAST(((COALESCE(transaction_view.total, 0)) + 2.220446049250313e-16) * 100 + 0.5 AS INTEGER) ELSE -CAST(-(((COALESCE(transaction_view.total, 0)) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) END) / 100.0), 0), 0)) + 2.220446049250313e-16) * 100 + 0.5 AS INTEGER) ELSE -CAST(-(((COALESCE(COALESCE(SUM((CASE WHEN ((COALESCE(transaction_view.total, 0)) + 2.220446049250313e-16) * 100 >= 0 THEN CAST(((COALESCE(transaction_view.total, 0)) + 2.220446049250313e-16) * 100 + 0.5 AS INTEGER) ELSE -CAST(-(((COALESCE(transaction_view.total, 0)) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) END) / 100.0), 0), 0)) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) END) / 100.0 AS total,
(COALESCE(SUM((CASE WHEN ((COALESCE(transaction_view.total, 0)) + 2.220446049250313e-16) * 100 >= 0 THEN CAST(((COALESCE(transaction_view.total, 0)) + 2.220446049250313e-16) * 100 + 0.5 AS INTEGER) ELSE -CAST(-(((COALESCE(transaction_view.total, 0)) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) END) / 100.0), 0)
  - (COALESCE(SUM((CASE WHEN ((COALESCE(transaction_view.total, 0)) + 2.220446049250313e-16) * 100 >= 0 THEN CAST(((COALESCE(transaction_view.total, 0)) + 2.220446049250313e-16) * 100 + 0.5 AS INTEGER) ELSE -CAST(-(((COALESCE(transaction_view.total, 0)) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) END) / 100.0), 0) * invoices.discount_1 / 100))
  - ((COALESCE(SUM((CASE WHEN ((COALESCE(transaction_view.total, 0)) + 2.220446049250313e-16) * 100 >= 0 THEN CAST(((COALESCE(transaction_view.total, 0)) + 2.220446049250313e-16) * 100 + 0.5 AS INTEGER) ELSE -CAST(-(((COALESCE(transaction_view.total, 0)) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) END) / 100.0), 0) 
  - (COALESCE(SUM((CASE WHEN ((COALESCE(transaction_view.total, 0)) + 2.220446049250313e-16) * 100 >= 0 THEN CAST(((COALESCE(transaction_view.total, 0)) + 2.220446049250313e-16) * 100 + 0.5 AS INTEGER) ELSE -CAST(-(((COALESCE(transaction_view.total, 0)) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) END) / 100.0), 0) * invoices.discount_1 / 100))*invoices.discount_2 / 100) AS unrounded_total,
  invoices.discount_rs,
  (CASE WHEN ((COALESCE((COALESCE(SUM((CASE WHEN ((COALESCE(transaction_view.total, 0)) + 2.220446049250313e-16) * 100 >= 0 THEN CAST(((COALESCE(transaction_view.total, 0)) + 2.220446049250313e-16) * 100 + 0.5 AS INTEGER) ELSE -CAST(-(((COALESCE(transaction_view.total, 0)) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) END) / 100.0), 0)
  - (COALESCE(SUM((CASE WHEN ((COALESCE(transaction_view.total, 0)) + 2.220446049250313e-16) * 100 >= 0 THEN CAST(((COALESCE(transaction_view.total, 0)) + 2.220446049250313e-16) * 100 + 0.5 AS INTEGER) ELSE -CAST(-(((COALESCE(transaction_view.total, 0)) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) END) / 100.0), 0) * invoices.discount_1 / 100))
  - ((COALESCE(SUM((CASE WHEN ((COALESCE(transaction_view.total, 0)) + 2.220446049250313e-16) * 100 >= 0 THEN CAST(((COALESCE(transaction_view.total, 0)) + 2.220446049250313e-16) * 100 + 0.5 AS INTEGER) ELSE -CAST(-(((COALESCE(transaction_view.total, 0)) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) END) / 100.0), 0) 
  - (COALESCE(SUM((CASE WHEN ((COALESCE(transaction_view.total, 0)) + 2.220446049250313e-16) * 100 >= 0 THEN CAST(((COALESCE(transaction_view.total, 0)) + 2.220446049250313e-16) * 100 + 0.5 AS INTEGER) ELSE -CAST(-(((COALESCE(transaction_view.total, 0)) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) END) / 100.0), 0) * invoices.discount_1 / 100))*invoices.discount_2 / 100) - invoices.discount_rs, 0)) + 2.220446049250313e-16) * 100 >= 0 THEN CAST(((COALESCE((COALESCE(SUM((CASE WHEN ((COALESCE(transaction_view.total, 0)) + 2.220446049250313e-16) * 100 >= 0 THEN CAST(((COALESCE(transaction_view.total, 0)) + 2.220446049250313e-16) * 100 + 0.5 AS INTEGER) ELSE -CAST(-(((COALESCE(transaction_view.total, 0)) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) END) / 100.0), 0)
  - (COALESCE(SUM((CASE WHEN ((COALESCE(transaction_view.total, 0)) + 2.220446049250313e-16) * 100 >= 0 THEN CAST(((COALESCE(transaction_view.total, 0)) + 2.220446049250313e-16) * 100 + 0.5 AS INTEGER) ELSE -CAST(-(((COALESCE(transaction_view.total, 0)) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) END) / 100.0), 0) * invoices.discount_1 / 100))
  - ((COALESCE(SUM((CASE WHEN ((COALESCE(transaction_view.total, 0)) + 2.220446049250313e-16) * 100 >= 0 THEN CAST(((COALESCE(transaction_view.total, 0)) + 2.220446049250313e-16) * 100 + 0.5 AS INTEGER) ELSE -CAST(-(((COALESCE(transaction_view.total, 0)) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) END) / 100.0), 0) 
  - (COALESCE(SUM((CASE WHEN ((COALESCE(transaction_view.total, 0)) + 2.220446049250313e-16) * 100 >= 0 THEN CAST(((COALESCE(transaction_view.total, 0)) + 2.220446049250313e-16) * 100 + 0.5 AS INTEGER) ELSE -CAST(-(((COALESCE(transaction_view.total, 0)) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) END) / 100.0), 0) * invoices.discount_1 / 100))*invoices.discount_2 / 100) - invoices.discount_rs, 0)) + 2.220446049250313e-16) * 100 + 0.5 AS INTEGER) ELSE -CAST(-(((COALESCE((COALESCE(SUM((CASE WHEN ((COALESCE(transaction_view.total, 0)) + 2.220446049250313e-16) * 100 >= 0 THEN CAST(((COALESCE(transaction_view.total, 0)) + 2.220446049250313e-16) * 100 + 0.5 AS INTEGER) ELSE -CAST(-(((COALESCE(transaction_view.total, 0)) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) END) / 100.0), 0)
  - (COALESCE(SUM((CASE WHEN ((COALESCE(transaction_view.total, 0)) + 2.220446049250313e-16) * 100 >= 0 THEN CAST(((COALESCE(transaction_view.total, 0)) + 2.220446049250313e-16) * 100 + 0.5 AS INTEGER) ELSE -CAST(-(((COALESCE(transaction_view.total, 0)) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) END) / 100.0), 0) * invoices.discount_1 / 100))
  - ((COALESCE(SUM((CASE WHEN ((COALESCE(transaction_view.total, 0)) + 2.220446049250313e-16) * 100 >= 0 THEN CAST(((COALESCE(transaction_view.total, 0)) + 2.220446049250313e-16) * 100 + 0.5 AS INTEGER) ELSE -CAST(-(((COALESCE(transaction_view.total, 0)) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) END) / 100.0), 0) 
  - (COALESCE(SUM((CASE WHEN ((COALESCE(transaction_view.total, 0)) + 2.220446049250313e-16) * 100 >= 0 THEN CAST(((COALESCE(transaction_view.total, 0)) + 2.220446049250313e-16) * 100 + 0.5 AS INTEGER) ELSE -CAST(-(((COALESCE(transaction_view.total, 0)) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) END) / 100.0), 0) * invoices.discount_1 / 100))*invoices.discount_2 / 100) - invoices.discount_rs, 0)) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) END) / 100.0 AS final_total,
  duedate,
  description,
  invoices.created,
  invoices.updated,
  invoices.deleted,
  invoices.completed
FROM
  invoices
  LEFT JOIN transaction_view ON transaction_view.invoice = invoices.id
GROUP BY
  invoices.id
