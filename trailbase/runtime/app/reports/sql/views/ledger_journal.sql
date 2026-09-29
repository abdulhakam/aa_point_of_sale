SELECT
  id,
  invoiceNo,
  created,
  description,
  transaction_type,
  account_type,
  party_type,
  (
    CASE
      WHEN account_type == 1
      THEN (CASE WHEN paid == TRUE THEN -amount ELSE amount END)
      WHEN account_type == 2
      THEN (CASE WHEN party_type == 0 THEN -amount ELSE 0 END)
      ELSE 0 END
  ) AS accounts_recievable,
  (
    CASE
      WHEN account_type == 0
      THEN (CASE WHEN paid == TRUE THEN -amount ELSE amount END)
      WHEN account_type == 2
      THEN (CASE WHEN party_type == 1 THEN -amount ELSE 0 END)
      ELSE 0 END
  ) AS accounts_payable,
  (
    CASE
      WHEN paid IS TRUE THEN (
        CASE
          WHEN account_type == 1 THEN amount
          ELSE -amount
        END
      )
      ELSE 0 END
  ) AS cash,
  0 AS stock
FROM
  (
    SELECT
      id,
      invoiceNo,
      created,
      description,
      transaction_type,
      account_type,
      party_type,
      stock_amount,
      amount,
      paid
    FROM
      (
        SELECT
          id,
          invoiceNo,
          payment_date as created,
          description,
          (
            CASE
              WHEN paid == TRUE THEN 'payment'
              ELSE 'invoice'
            END
          ) AS transaction_type,
          party_type,
          type AS account_type,
          --stock_price 
          0 AS stock_amount,
          amount AS amount,
          paid
        FROM
          payments_view
        UNION ALL
        SELECT
          id,
          'N/A' AS invoiceNo,
          created,
          description AS description,
          'expense' AS transaction_type,
          -1 AS account_type,
          NULL AS party_type,
          0 AS stock_amount,
          amount AS amount,
          true AS paid
        FROM
          expenses
      )
  )
