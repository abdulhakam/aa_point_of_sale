SELECT
  payments.id,
  payments.created,
  payments.updated,
  (CASE WHEN payments.payment_date = '' THEN payments.created ELSE payments.payment_date END) AS payment_date,
  payments.invoice,
  invoices_return_reference.original_invoices,
  invoice_view.invoiceNo,
  invoice_view.invoice_maker,
  invoice_view.booker,
  (SELECT oc.company FROM order_booker_companies oc WHERE oc.order_booker = order_bookers.id ORDER BY oc.id LIMIT 1) AS company,
  payments.paid_to,
  payments.party AS party,
  parties.type AS party_type,
  payments.type AS type,
COALESCE((CASE WHEN payments.amount <> 0 THEN payments.amount ELSE invoice_view.final_total END),0) AS amount,
  --invoice_view.stock_price,
  payments.paid,
  parties.area,
  areas.section,
  payments.description
FROM payments
LEFT JOIN invoice_view ON payments.invoice = invoice_view.id
LEFT JOIN parties ON payments.party = parties.id
LEFT JOIN areas ON parties.area = areas.id
LEFT JOIN sections ON areas.section = sections.id
LEFT JOIN order_bookers ON invoice_view.booker = order_bookers.id
LEFT JOIN invoices_return_reference ON invoices_return_reference.id = payments.id
