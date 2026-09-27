SELECT 
  items.id,
  items.name,
  items.created,
  items.updated,
  items.cost_price, 
  items.sale_price, 
  items.box_size_qty, 
  items.category, 
  sum(
  CASE WHEN transaction_view.type == 'return' 
  THEN (CASE WHEN transaction_view.party_type == 'customer' 
    THEN transaction_view.qty+transaction_view.scheme 
    ELSE -transaction_view.qty-transaction_view.scheme END) 
  WHEN transaction_view.type == 'difference'
  THEN transaction_view.qty+transaction_view.scheme
  ELSE (CASE WHEN transaction_view.type='sale' 
    THEN -transaction_view.qty-transaction_view.scheme 
    ELSE transaction_view.qty+transaction_view.scheme END) END) as qty
FROM items
LEFT JOIN transaction_view on transaction_view.item = items.id
LEFT JOIN invoices on transaction_view.invoice = invoices.id
GROUP BY items.id
