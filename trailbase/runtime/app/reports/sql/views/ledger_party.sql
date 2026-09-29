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
  (CASE WHEN p1.type = 1 THEN 
      (CASE WHEN p1.paid = TRUE THEN p1.amount
       ELSE 0 
       END) 
   ELSE (CASE WHEN p1.type = 0 THEN 
           (CASE WHEN p1.paid = FALSE THEN p1.amount
            ELSE 0 
            END) 
         ELSE 0 -- return case missing
         END)
   END) AS credit,
  (CASE WHEN p1.type = 0 THEN 
      (CASE WHEN p1.paid = TRUE THEN p1.amount
       ELSE 0 
       END) 
   ELSE (CASE WHEN p1.type = 1 THEN 
           (CASE WHEN p1.paid = FALSE THEN p1.amount
            ELSE 0 
            END) 
         ELSE 0 -- return case missing
         END)
   END) AS debit,
  (CASE WHEN ((COALESCE(SUM(
    CASE WHEN p1.paid = FALSE THEN p1.amount ELSE -p1.amount END)
    OVER (PARTITION BY p1.party ORDER BY p1.payment_date
          RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW), 0)) + 2.220446049250313e-16) * 100 >= 0 THEN CAST(((COALESCE(SUM(
    CASE WHEN p1.paid = FALSE THEN p1.amount ELSE -p1.amount END)
    OVER (PARTITION BY p1.party ORDER BY p1.payment_date
          RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW), 0)) + 2.220446049250313e-16) * 100 + 0.5 AS INTEGER) ELSE -CAST(-(((COALESCE(SUM(
    CASE WHEN p1.paid = FALSE THEN p1.amount ELSE -p1.amount END)
    OVER (PARTITION BY p1.party ORDER BY p1.payment_date
          RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW), 0)) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER) END) / 100.0 AS balance
FROM payments_view p1 ORDER BY p1.payment_date
