SELECT
  (ROW_NUMBER() OVER()) as id,
  payments_view.created,
  payments_view.updated,
  payment_date AS dated,
  payments_view.invoice,
  payments_view.original_invoices AS original_invoice,
  invoiceNo,
  invoice_maker,
  booker,
  split_inv.company,
  party,
  area,
  section,
  party_type,
  (CASE 
    WHEN payments_view.type = 'sending' THEN 'purchase'
    WHEN payments_view.type = 'recieving' THEN 'sale'
    WHEN payments_view.type = 'return' THEN 'return' END) AS type,
  split_inv.ratio*payments_view.amount as amount,
  paid,
  payments_view.description
FROM payments_view
  LEFT JOIN 
  (
    SELECT 
    invoice,
    transactions_report.company,
    SUM(transactions_report.net_amount)/invoice_view.unrounded_total as ratio
    FROM transactions_report
    LEFT JOIN invoice_view ON invoice = invoice_view.id
    LEFT JOIN invoices_return_reference ON invoice = invoices_return_reference.id
    GROUP BY company, invoice
  ) AS split_inv ON payments_view.invoice = split_inv.invoice
  GROUP BY split_inv.company,payments_view.invoice,payments_view.created
