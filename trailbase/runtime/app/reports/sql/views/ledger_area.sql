WITH balances AS (
  SELECT
  id,
  created,
  updated,
  party,
  type,
  paid,
  SUM(CASE WHEN paid = TRUE THEN amount ELSE 0 END) -- return case missing
      AS credit,
  SUM(CASE WHEN paid = FALSE THEN amount ELSE 0 END)-- return case missing
      AS debit
FROM payments_view GROUP BY party
)


SELECT 
  p1.id,
  p1.description,
  p1.created,
  p1.updated,
  p1.payment_date AS dated,
  p1.invoice,
  p1.party,
  p1.type,
  p1.paid,
  SUM(CASE WHEN p1.type = 'recieving' THEN 
      (CASE WHEN p1.paid = TRUE THEN p1.amount
       ELSE 0 
       END) 
   ELSE (CASE WHEN p1.type = 'sending' THEN 
           (CASE WHEN p1.paid = FALSE THEN p1.amount
            ELSE 0 
            END) 
         ELSE 0 -- return case missing
         END)
   END) AS credit,
  SUM(CASE WHEN p1.type = 'sending' THEN 
      (CASE WHEN p1.paid = TRUE THEN p1.amount
       ELSE 0 
       END) 
   ELSE (CASE WHEN p1.type = 'recieving' THEN 
           (CASE WHEN p1.paid = FALSE THEN p1.amount
            ELSE 0 
            END) 
         ELSE 0 -- return case missing
         END)
   END) AS debit,
  (CASE WHEN ((COALESCE((b.debit-b.credit), 0)) + 2.220446049250313e-16) * 100 >= 0 THEN CAST(((COALESCE((b.debit-b.credit), 0)) + 2.220446049250313e-16) * 100 + 0.5 AS INTEGER) ELSE -CAST(-(((COALESCE((b.debit-b.credit), 0)) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) END) / 100.0 AS balance
FROM payments_view p1
  LEFT JOIN balances b ON p1.party = b.party
  GROUP BY p1.party
