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
    WHEN payments_view.type = 0 THEN 'purchase'
    WHEN payments_view.type = 1 THEN 'sale'
    WHEN payments_view.type = 2 THEN 'return' END) AS type,
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
-- NO outer GROUP BY. The join already yields the right multiplicity: one row per
-- (payment, company part), which is what buildPaymentsInvoicesReport() emits and
-- what the legacy view produces (33,556 rows on production data).
--
-- The legacy file had `GROUP BY split_inv.company, payments_view.invoice,
-- payments_view.created` here. It collapses DISTINCT payment records that happen to
-- share an invoice and a created timestamp -- 3,293 such pairs covering 7,365
-- payments -- and silently dropped 5,980 of 33,556 rows (27,576 instead of 33,556).
-- Every money figure that splits a payment across companies was understated.
-- The ratio needs its own grouping, and it keeps it in the subquery above.
