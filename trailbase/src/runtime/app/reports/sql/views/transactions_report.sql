SELECT
  transaction_view.id,
  invoice,
  transaction_view.type,
  transaction_view.invoiceNo,
  transaction_view.party,
  area,
  section,
  party_type,
  invoice_view.booker,
  items.category AS company,
  item,
  transaction_view.cost_price,
  price,
  qty,
  scheme,
  transaction_view.discount_1,
  transaction_view.discount_2,
  transaction_view.discount_rs,
  inv_d1,
  inv_d2,
  inv_drs,
  transaction_view.total,
  net_amount,
  (CASE WHEN ((COALESCE(transaction_view.net_amount-(CASE WHEN invoice_view.unrounded_total <> 0 THEN (inv_drs*net_amount)/invoice_view.unrounded_total ELSE 0 END), 0)) + 2.220446049250313e-16) * 100 >= 0 THEN CAST(((COALESCE(transaction_view.net_amount-(CASE WHEN invoice_view.unrounded_total <> 0 THEN (inv_drs*net_amount)/invoice_view.unrounded_total ELSE 0 END), 0)) + 2.220446049250313e-16) * 100 + 0.5 AS INTEGER) ELSE -CAST(-(((COALESCE(transaction_view.net_amount-(CASE WHEN invoice_view.unrounded_total <> 0 THEN (inv_drs*net_amount)/invoice_view.unrounded_total ELSE 0 END), 0)) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) END) / 100.0 AS final_amount,
  (CASE WHEN ((COALESCE(transaction_view.net_amount-(CASE WHEN invoice_view.unrounded_total <> 0 THEN (inv_drs*net_amount)/invoice_view.unrounded_total ELSE 0 END)-(transaction_view.cost_price*qty), 0)) + 2.220446049250313e-16) * 100 >= 0 THEN CAST(((COALESCE(transaction_view.net_amount-(CASE WHEN invoice_view.unrounded_total <> 0 THEN (inv_drs*net_amount)/invoice_view.unrounded_total ELSE 0 END)-(transaction_view.cost_price*qty), 0)) + 2.220446049250313e-16) * 100 + 0.5 AS INTEGER) ELSE -CAST(-(((COALESCE(transaction_view.net_amount-(CASE WHEN invoice_view.unrounded_total <> 0 THEN (inv_drs*net_amount)/invoice_view.unrounded_total ELSE 0 END)-(transaction_view.cost_price*qty), 0)) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) END) / 100.0 AS profit,
  transaction_view.deleted,
  transaction_view.created,
  transaction_view.updated
FROM
  transaction_view
LEFT JOIN items ON item = items.id
LEFT JOIN invoice_view ON invoice = invoice_view.id
