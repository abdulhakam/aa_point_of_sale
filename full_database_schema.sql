BEGIN TRANSACTION;
DROP TABLE IF EXISTS "areas";
CREATE TABLE "areas" (
	"created"	TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
	"id"	TEXT NOT NULL DEFAULT ('r' || lower(hex(randomblob(7)))),
	"name"	TEXT NOT NULL DEFAULT '',
	"section"	TEXT NOT NULL DEFAULT '',
	"updated"	TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
	"deleted"	BOOLEAN NOT NULL DEFAULT FALSE,
	PRIMARY KEY("id")
);
DROP TABLE IF EXISTS "categories";
CREATE TABLE "categories" (
	"created"	TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
	"id"	TEXT NOT NULL DEFAULT ('r' || lower(hex(randomblob(7)))),
	"name"	TEXT NOT NULL DEFAULT '',
	"updated"	TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
	"deleted"	BOOLEAN NOT NULL DEFAULT FALSE,
	PRIMARY KEY("id")
);
DROP TABLE IF EXISTS "expenses";
CREATE TABLE "expenses" (
	"amount"	NUMERIC NOT NULL DEFAULT 0,
	"created"	TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
	"description"	TEXT NOT NULL DEFAULT '',
	"id"	TEXT NOT NULL DEFAULT ('r' || lower(hex(randomblob(7)))),
	"name"	TEXT NOT NULL DEFAULT '',
	"updated"	TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
	"date"	TEXT NOT NULL DEFAULT '',
	PRIMARY KEY("id")
);
DROP TABLE IF EXISTS "invoices";
CREATE TABLE "invoices" (
	"booker"	TEXT NOT NULL DEFAULT '',
	"completed"	BOOLEAN NOT NULL DEFAULT FALSE,
	"created"	TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
	"description"	TEXT NOT NULL DEFAULT '',
	"discount_1"	NUMERIC NOT NULL DEFAULT 0,
	"discount_2"	NUMERIC NOT NULL DEFAULT 0,
	"duedate"	TEXT NOT NULL DEFAULT '',
	"id"	TEXT NOT NULL DEFAULT ('r' || lower(hex(randomblob(7)))),
	"invoiceNo"	NUMERIC NOT NULL DEFAULT 0,
	"invoice_maker"	TEXT NOT NULL DEFAULT '',
	"party"	TEXT NOT NULL DEFAULT '',
	"type"	TEXT NOT NULL DEFAULT '',
	"updated"	TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
	"deleted"	BOOLEAN NOT NULL DEFAULT FALSE,
	"dated"	TEXT NOT NULL DEFAULT '',
	"discount_rs"	NUMERIC NOT NULL DEFAULT 0,
	PRIMARY KEY("id")
);
DROP TABLE IF EXISTS "invoices_return_reference";
CREATE TABLE "invoices_return_reference" (
	"created"	TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
	"id"	TEXT NOT NULL DEFAULT ('r' || lower(hex(randomblob(7)))),
	"updated"	TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
	"original_invoices"	TEXT NOT NULL DEFAULT '',
	PRIMARY KEY("id")
);
DROP TABLE IF EXISTS "items";
CREATE TABLE "items" (
	"category"	TEXT NOT NULL DEFAULT '',
	"cost_price"	NUMERIC NOT NULL DEFAULT 0,
	"created"	TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
	"id"	TEXT NOT NULL DEFAULT ('r' || lower(hex(randomblob(7)))),
	"name"	TEXT NOT NULL DEFAULT '',
	"sale_price"	NUMERIC NOT NULL DEFAULT 0,
	"updated"	TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
	"box_size_qty"	NUMERIC NOT NULL DEFAULT 0,
	PRIMARY KEY("id")
);
DROP TABLE IF EXISTS "order_bookers";
CREATE TABLE "order_bookers" (
	"company"	JSON NOT NULL DEFAULT '[]',
	"created"	TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
	"id"	TEXT NOT NULL DEFAULT ('r' || lower(hex(randomblob(7)))),
	"name"	TEXT NOT NULL DEFAULT '',
	"phone"	TEXT NOT NULL DEFAULT '',
	"updated"	TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
	"deleted"	BOOLEAN NOT NULL DEFAULT FALSE,
	PRIMARY KEY("id")
);
DROP TABLE IF EXISTS "parties";
CREATE TABLE "parties" (
	"address"	TEXT NOT NULL DEFAULT '',
	"area"	TEXT NOT NULL DEFAULT '',
	"created"	TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
	"id"	TEXT NOT NULL DEFAULT ('r' || lower(hex(randomblob(7)))),
	"name"	TEXT NOT NULL DEFAULT '',
	"phone"	TEXT NOT NULL DEFAULT '',
	"type"	TEXT NOT NULL DEFAULT '',
	"updated"	TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
	"deleted"	BOOLEAN NOT NULL DEFAULT FALSE,
	"company"	JSON NOT NULL DEFAULT '[]',
	PRIMARY KEY("id")
);
DROP TABLE IF EXISTS "payments";
CREATE TABLE "payments" (
	"amount"	NUMERIC NOT NULL DEFAULT 0,
	"created"	TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
	"description"	TEXT NOT NULL DEFAULT '',
	"id"	TEXT NOT NULL DEFAULT ('r' || lower(hex(randomblob(7)))),
	"invoice"	TEXT NOT NULL DEFAULT '',
	"paid"	BOOLEAN NOT NULL DEFAULT FALSE,
	"party"	TEXT NOT NULL DEFAULT '',
	"type"	TEXT NOT NULL DEFAULT '',
	"updated"	TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
	"payment_date"	TEXT NOT NULL DEFAULT '',
	"paid_to"	TEXT NOT NULL DEFAULT '',
	PRIMARY KEY("id")
);
DROP TABLE IF EXISTS "sections";
CREATE TABLE "sections" (
	"created"	TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
	"id"	TEXT NOT NULL DEFAULT ('r' || lower(hex(randomblob(7)))),
	"name"	TEXT NOT NULL DEFAULT '',
	"updated"	TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
	PRIMARY KEY("id")
);
DROP TABLE IF EXISTS "transactions";
CREATE TABLE "transactions" (
	"discount_1"	NUMERIC NOT NULL DEFAULT 0,
	"discount_2"	NUMERIC NOT NULL DEFAULT 0,
	"id"	TEXT NOT NULL DEFAULT ('r' || lower(hex(randomblob(7)))),
	"invoice"	TEXT NOT NULL DEFAULT '',
	"item"	TEXT NOT NULL DEFAULT '',
	"price"	NUMERIC NOT NULL DEFAULT 0,
	"qty"	NUMERIC NOT NULL DEFAULT 0,
	"scheme"	NUMERIC NOT NULL DEFAULT 0,
	"updated"	TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
	"deleted"	BOOLEAN NOT NULL DEFAULT FALSE,
	"created"	text NOT NULL DEFAULT 'strftime(''%Y-%m-%d %H:%M:%fZ'')',
	"cost_price"	NUMERIC NOT NULL DEFAULT 0,
	"discount_rs"	NUMERIC NOT NULL DEFAULT 0,
	PRIMARY KEY("id")
);
DROP TABLE IF EXISTS "users";
CREATE TABLE "users" (
	"avatar"	TEXT NOT NULL DEFAULT '',
	"created"	TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
	"email"	TEXT NOT NULL DEFAULT '',
	"emailVisibility"	BOOLEAN NOT NULL DEFAULT FALSE,
	"id"	TEXT NOT NULL DEFAULT ('r' || lower(hex(randomblob(7)))),
	"lastResetSentAt"	TEXT NOT NULL DEFAULT '',
	"lastVerificationSentAt"	TEXT NOT NULL DEFAULT '',
	"name"	TEXT NOT NULL DEFAULT '',
	"passwordHash"	TEXT NOT NULL,
	"tokenKey"	TEXT NOT NULL,
	"updated"	TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
	"username"	TEXT NOT NULL,
	"verified"	BOOLEAN NOT NULL DEFAULT FALSE,
	PRIMARY KEY("id")
);


DROP VIEW IF EXISTS "counts_for_row_numbers";
CREATE VIEW `counts_for_row_numbers` AS SELECT * FROM (SELECT cast(`id` as text) `id`,`areas`,`sections`,`categories`,`purchase_invoices`,`sale_invoices`,`return_invoices`,`items`,`order_bookers`,`parties`,`recieving_payments`,`sending_payments` FROM (SELECT (ROW_NUMBER() OVER()) as id,
(SELECT COUNT (id) FROM areas) as areas,
(SELECT COUNT (id) FROM sections) as sections,
(SELECT COUNT (id) FROM categories) as categories,
(SELECT COUNT (id) FROM invoices WHERE type='purchase') as purchase_invoices,
(SELECT COUNT (id) FROM invoices WHERE type='sale') as sale_invoices,
(SELECT COUNT (id) FROM invoices WHERE type='return') as return_invoices,
(SELECT COUNT (id) FROM items) as items,
(SELECT COUNT (id) FROM order_bookers) as order_bookers,
(SELECT COUNT (id) FROM parties) as parties,
(SELECT COUNT (id) FROM payments WHERE type = 'recieving') as recieving_payments,
(SELECT COUNT (id) FROM payments WHERE type = 'sending') as sending_payments));
DROP VIEW IF EXISTS "invoice_view";
CREATE VIEW `invoice_view` AS SELECT * FROM (SELECT
  invoices.id,
  (CASE WHEN invoices.dated == "" THEN invoices.created ELSE invoices.dated END) AS dated,
  invoices.type,
  invoices.invoiceNo,
  invoices.party,
  invoices.booker,
  invoice_maker,
  invoices.discount_1,
  invoices.discount_2,
  --transactions_view.net_cptrans*qty AS stock_price,
  printf("%.2f",COALESCE(SUM(printf("%.2f",transaction_view.total)), 0)) AS total,
printf("%.2f",(COALESCE(SUM(printf("%.2f",transaction_view.total)), 0)
  - (COALESCE(SUM(printf("%.2f",transaction_view.total)), 0) * invoices.discount_1 / 100))
  - ((COALESCE(SUM(printf("%.2f",transaction_view.total)), 0) 
  - (COALESCE(SUM(printf("%.2f",transaction_view.total)), 0) * invoices.discount_1 / 100))*invoices.discount_2 / 100)) AS unrounded_total,
  invoices.discount_rs,
  printf("%.2f",(COALESCE(SUM(printf("%.2f",transaction_view.total)), 0)
  - (COALESCE(SUM(printf("%.2f",transaction_view.total)), 0) * invoices.discount_1 / 100))
  - ((COALESCE(SUM(printf("%.2f",transaction_view.total)), 0) 
  - (COALESCE(SUM(printf("%.2f",transaction_view.total)), 0) * invoices.discount_1 / 100))*invoices.discount_2 / 100) - invoices.discount_rs) AS final_total,
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
  invoices.id);
DROP VIEW IF EXISTS "items_difference_report";
CREATE VIEW `items_difference_report` AS SELECT * FROM (SELECT 
  items.id,
  items.name,
  items.created,
  items.updated,
  items.cost_price, 
  items.sale_price, 
  items.box_size_qty, 
  items.category, 
  sum(
  CASE WHEN transaction_view.type == 'difference'
  THEN transaction_view.qty+transaction_view.scheme
  ELSE 0 END) as qty
FROM items
LEFT JOIN transaction_view on transaction_view.item = items.id
LEFT JOIN invoices on transaction_view.invoice = invoices.id
GROUP BY items.id);
DROP VIEW IF EXISTS "items_report";
CREATE VIEW `items_report` AS SELECT * FROM (SELECT 
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
GROUP BY items.id);
DROP VIEW IF EXISTS "ledger_area";
CREATE VIEW `ledger_area` AS SELECT * FROM (WITH balances AS (
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
  printf('%.2f',(b.debit-b.credit)) AS balance
FROM payments_view p1
  LEFT JOIN balances b ON p1.party = b.party
  GROUP BY p1.party);
DROP VIEW IF EXISTS "ledger_booker";
CREATE VIEW `ledger_booker` AS SELECT * FROM (SELECT 
  p1.id,
  p1.description,
  p1.created,
  p1.updated,
  p1.payment_date AS dated,
  p1.invoice,
  p1.party,
  p1.type,
  p1.paid,
  (CASE WHEN p1.type = 'recieving' THEN 
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
  (CASE WHEN p1.type = 'sending' THEN 
      (CASE WHEN p1.paid = TRUE THEN p1.amount
       ELSE 0 
       END) 
   ELSE (CASE WHEN p1.type = 'recieving' THEN 
           (CASE WHEN p1.paid = FALSE THEN p1.amount
            ELSE 0 
            END) 
         ELSE 0 -- return case missing
         END)
   END) AS debit
FROM payments_view p1
  ORDER BY p1.payment_date);
DROP VIEW IF EXISTS "ledger_journal";
CREATE VIEW `ledger_journal` AS SELECT * FROM (SELECT cast(`id` as text) `id`,`invoiceNo`,`created`,`description`,`transaction_type`,`account_type`,`party_type`,`accounts_recievable`,`accounts_payable`,`cash`,`stock` FROM (SELECT
  id,
  invoiceNo,
  created,
  description,
  transaction_type,
  account_type,
  party_type,
  (
    CASE
      WHEN account_type == 'recieving'
      THEN (CASE WHEN paid == TRUE THEN -amount ELSE amount END)
      WHEN account_type == 'return'
      THEN (CASE WHEN party_type == 'customer' THEN -amount ELSE 0 END)
      ELSE 0 END
  ) AS accounts_recievable,
  (
    CASE
      WHEN account_type == 'sending'
      THEN (CASE WHEN paid == TRUE THEN -amount ELSE amount END)
      WHEN account_type == 'return'
      THEN (CASE WHEN party_type == 'supplier' THEN -amount ELSE 0 END)
      ELSE 0 END
  ) AS accounts_payable,
  (
    CASE
      WHEN paid IS TRUE THEN (
        CASE
          WHEN account_type == 'recieving' THEN amount
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
          'cash' AS account_type,
          NULL AS party_type,
          0 AS stock_amount,
          amount AS amount,
          true AS paid
        FROM
          expenses
      )
  )));
DROP VIEW IF EXISTS "ledger_party";
CREATE VIEW `ledger_party` AS SELECT * FROM (SELECT 
  p1.id,
  p1.description,
  p1.created,
  p1.updated,
  p1.payment_date AS dated,
  p1.invoice,
  p1.party,
  p1.type,
  p1.paid,
  (CASE WHEN p1.type = 'recieving' THEN 
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
  (CASE WHEN p1.type = 'sending' THEN 
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
  printf('%.2f',(SELECT SUM(
    CASE WHEN p2.paid = FALSE THEN p2.amount ELSE -p2.amount END)
  FROM payments_view p2
  WHERE p2.party = p1.party AND p2.payment_date <= p1.payment_date)) AS balance
FROM payments_view p1 ORDER BY p1.payment_date);
DROP VIEW IF EXISTS "net_price";
CREATE VIEW `net_price` AS SELECT * FROM (SELECT 
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
   invoices ON transactions.invoice = invoices.id);
DROP VIEW IF EXISTS "payments_invoices_report";
CREATE VIEW `payments_invoices_report` AS SELECT * FROM (SELECT cast(`id` as text) `id`,`created`,`updated`,`dated`,`invoice`,`original_invoice`,`invoiceNo`,`invoice_maker`,`booker`,`company`,`party`,`area`,`section`,`party_type`,`type`,`amount`,`paid`,`description` FROM (SELECT
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
  GROUP BY split_inv.company,payments_view.invoice,payments_view.created));
DROP VIEW IF EXISTS "payments_view";
CREATE VIEW `payments_view` AS SELECT * FROM (SELECT
  payments.id,
  payments.created,
  payments.updated,
  (CASE WHEN payments.payment_date = "" THEN payments.created ELSE payments.payment_date END) AS payment_date,
  payments.invoice,
  invoices_return_reference.original_invoices,
  invoice_view.invoiceNo,
  invoice_view.invoice_maker,
  invoice_view.booker,
  order_bookers.company,
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
LEFT JOIN invoices_return_reference ON invoices_return_reference.id = payments.id);
DROP VIEW IF EXISTS "transaction_view";
CREATE VIEW `transaction_view` AS SELECT * FROM (SELECT
  transactions.id,
  invoice,
  invoices.type,
  invoices.party,
  parties.type AS party_type,
  parties.area,
  areas.section,
  invoices.invoiceNo,
  item,
  transactions.cost_price,
  price,
  transactions.qty,
  scheme,
  transactions.discount_1,
  transactions.discount_2,
  transactions.discount_rs,
  ((price*transactions.qty)
  *(1 - (transactions.discount_1 / 100.0))
  *(1 - (transactions.discount_2 / 100.0)))-transactions.discount_rs
  AS total,
  invoices.discount_1 AS inv_d1,
  invoices.discount_2 AS inv_d2,
  invoices.discount_rs AS inv_drs,
  printf("%.2f",((price*transactions.qty)
  *(1 - (transactions.discount_1 / 100.0))
  *(1 - (transactions.discount_2 / 100.0))-transactions.discount_rs)
  *(1 - (invoices.discount_1 / 100.0))
  *(1 - (invoices.discount_2 / 100.0))) AS net_amount,
  printf("%.2f",(cost_price*transactions.qty)) AS profit,
  transactions.deleted,
  transactions.created,
  transactions.updated
FROM
  transactions
  LEFT JOIN invoices ON transactions.invoice = invoices.id
  LEFT JOIN parties ON invoices.party = parties.id
  LEFT JOIN areas ON parties.area = areas.id
GROUP BY transactions.id);
DROP VIEW IF EXISTS "transactions_report";
CREATE VIEW `transactions_report` AS SELECT * FROM (SELECT
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
  printf("%.2f",transaction_view.net_amount-(inv_drs*net_amount/invoice_view.unrounded_total)) AS final_amount,
  printf("%.2f",transaction_view.net_amount-(inv_drs*net_amount/invoice_view.unrounded_total)-(transaction_view.cost_price*qty)) AS profit,
  transaction_view.deleted,
  transaction_view.created,
  transaction_view.updated
FROM
  transaction_view
LEFT JOIN items ON item = items.id
LEFT JOIN invoice_view ON invoice = invoice_view.id);
DROP INDEX IF EXISTS "__pb_users_auth__email_idx";
CREATE UNIQUE INDEX "__pb_users_auth__email_idx" ON "users" (
	"email"
) WHERE "email" != '';
DROP INDEX IF EXISTS "__pb_users_auth__tokenKey_idx";
CREATE UNIQUE INDEX "__pb_users_auth__tokenKey_idx" ON "users" (
	"tokenKey"
);
DROP INDEX IF EXISTS "__pb_users_auth__username_idx";
CREATE UNIQUE INDEX "__pb_users_auth__username_idx" ON "users" (
	"username"
);
COMMIT;
