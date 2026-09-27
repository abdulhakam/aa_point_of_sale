SELECT 
   items.id,
   items.name,
   items.created,
   items.sale_price,
  items.cost_price,
   items.box_size_qty,
   items.category AS company,
   IFNULL(transactions.qty, 0) AS qty,
  ((transactions.price
  *transactions.qty
  *(1-(transactions.discount_1/100.0))
  *(1-(transactions.discount_2/100.0))
  *(1-(COALESCE(invoices.discount_1,0)/100.0))
  *(1-(COALESCE(invoices.discount_2,0)/100.0))
  )/(transactions.qty+transactions.scheme)) AS net_price
FROM 
   items
LEFT JOIN 
  transactions ON items.id = transactions.item
LEFT JOIN 
   invoices ON transactions.invoice = invoices.id
