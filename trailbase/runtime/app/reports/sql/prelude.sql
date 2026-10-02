-- Shared prelude for spooled report SQL. Composed in front of each report's statement by
-- `lib/spoolreports.js`, so the expensive views are written and parsed ONCE rather than copied into
-- 14 files (where they would drift).
--
-- It provides, for every report:
--
--   committed            every invoice (there is no draft; an invoice is published on save)
--   invoice_view         invoice columns, num()-coerced
--   transaction_view     per-line total with the line discount chain
--   line_totals          round2 PER LINE (this is the money rule — see the note)
--   invoice_s            s = SUM of already-rounded line totals
--   invoice_chain        after_d1 / unrounded (unrounded is a DENOMINATOR, never rounded)
--   invoice_totals       final_total = round2(unrounded - discount_rs)
--   payments_base        payment rows with the zero-amount fallback applied
--   payments_view        payments + the credit/debit CASE pair
--   net_line/net_rounded/allocated/alloc_rounded/profit_rounded/transactions_report
--                         transaction rows with the discount allocation and margin
--   stock_deltas         signed stock movement per item
--   difference_deltas    stock movement for the "difference" party and legacy type-3 rows
--   ledger_journal       payments UNION ALL expenses, with the four account columns
--
-- Reference: every shape here is a port of `compute/views.js`, verified against it by
-- `tools/verify-prelude.mjs`. The parity reference is the JS, not the preserved `sql/views/`
-- files — those are known to differ (vault: legacy-sql-views-differ-from-js-views).

WITH
  -- An invoice is in the books the moment it is saved and is editable afterwards, so there is no
  -- status to exclude: the set is every invoice (vault/decisions/no-draft-invoices-published-on-save.md).
  committed AS (
    SELECT id FROM invoices
  ),
  invoice_view AS (
    -- `d1`/`d2`/`drs` are `num()`-coerced (COALESCE, since a NULL discount becomes 0 in
    -- compute/format.js:3).
    --
    -- `dated` is the invoice's OWN date column, which `invoiceView.dated` falls back from to
    -- `created` (views.js:98: `inv.dated || inv.created`). Carried so `dailysale` — which filters on
    -- `i.dated` (reports.js:469), not on `created` — does not re-join the table for it.
    --
    -- `type` is `relId(inv.type)` (views.js:99) and is NOT num()-coerced: `reportDailySale` compares
    -- it against INVOICE_TYPE.sale (reports.js:468), so a COALESCE to 0 here would turn a NULL type
    -- into "purchase" and silently drop the invoice.
    SELECT
      i.id,
      i.created,
      i.dated,
      COALESCE(i.invoiceNo, 0) AS invoiceNo,
      i.party,
      i.booker,
      i.type,
      COALESCE(i.discount_1, 0) AS d1,
      COALESCE(i.discount_2, 0) AS d2,
      COALESCE(i.discount_rs, 0) AS drs
    FROM invoices i
  ),
  transaction_view AS (
    -- views.js:36 buildTransactionView. The line total with its own discount chain.
    SELECT
      t.id,
      t.invoice,
      t.item,
      COALESCE(t.cost_price, 0) AS cost_price,
      COALESCE(t.price, 0) AS price,
      COALESCE(t.qty, 0) AS qty,
      COALESCE(t.scheme, 0) AS scheme,
      COALESCE(t.discount_1, 0) AS d1,
      COALESCE(t.discount_2, 0) AS d2,
      COALESCE(t.discount_rs, 0) AS drs,
      i.type AS inv_type,
      i.party AS inv_party,
      i.booker AS inv_booker,
      -- The invoice party's type, for the return sign rule in buildItemsReport (views.js:251): a
      -- return is +q for a CUSTOMER (type 0) and -q for a supplier.
      pa.type AS party_type,
      -- The invoice party's area/section, for the reports that filter on them off the invoice's
      -- party rather than off a payment's (reportProductSale, reports.js:528-530).
      pa.area AS party_area,
      ar.section AS party_section,
      COALESCE(i.invoiceNo, 0) AS invoiceNo,
      ((t.price * t.qty) * (1 - (t.discount_1 / 100.0)) * (1 - (t.discount_2 / 100.0))) - t.discount_rs AS total,
      t.created,
      t.updated,
      t.deleted
    FROM transactions t
    JOIN invoices i ON i.id = t.invoice
    LEFT JOIN parties pa ON pa.id = i.party
    LEFT JOIN areas ar ON ar.id = pa.area
  ),

  -- ==========================================================================
  -- round2 — THE MONEY RULE. Read this before editing any amount below.
  --
  -- Exactly `compute/format.js:9`: `Math.round((num(v) + EPSILON) * 100) / 100`,
  -- i.e. floor(((v + EPSILON) * 100) + 0.5) / 100.
  --
  -- **`floor()` DOES NOT EXIST IN THE GUEST'S SQLITE.** TrailBase's bundled build does not compile
  -- SQLITE_ENABLE_MATH_FUNCTIONS, so `floor`, `ceil`, `trunc`, `iif` and `mod` are all absent, while
  -- `abs`, `sign`, `printf` and `round` are present. Verified against the RUNNING GUEST with
  -- /bench/sqlfn, not assumed — node:sqlite DOES have floor(), so a port verified only in Node passes
  -- against the wrong engine and fails on contact with the real one (`no such function: floor`).
  --
  -- floor() is therefore rebuilt from CAST, which is SQL SYNTAX (always present) and truncates
  -- TOWARD ZERO:
  --     trunc(z) == CAST(z AS INTEGER)
  --     floor(z) == trunc(z) - (CASE WHEN z < 0 AND z <> trunc(z) THEN 1 ELSE 0 END)
  --
  -- so, writing t = (((v) + EPSILON) * 100) + 0.5, every round2 in this file is
  --     (CAST(t AS INTEGER) - (CASE WHEN t < 0 AND t <> CAST(t AS INTEGER) THEN 1 ELSE 0 END)) / 100.0
  --
  -- `t` is written out three times because SQLite has no LET; tools/rewrite-round2.mjs generates all
  -- of them from one template so the three cannot disagree.
  --
  -- Verified over 5,684 values against JS Math.round — every exact half (v.xx5) included, both
  -- signs, and 5,000 random values: 0 mismatches. Confirmed again inside the running guest.
  --
  -- The shortcuts this replaces were each MEASURED and are wrong for Math.round:
  --     ROUND(v, 2)                   SQLite rounds half AWAY from zero (JS goes toward +inf)
  --     CAST(v*100 + 0.5 AS INTEGER)  truncates toward zero, so every negative half is wrong
  --     mirrored +/- CAST branches    the -50.625 case lands on -50.63 instead of -50.62
  --
  -- CRITICAL: applied PER LINE before summing (views.js:89). Rounding the sum instead moves money by
  -- up to half a paisa per line; on this depot that changed 770 of 26,099 rows. Not a float
  -- artefact — real money.
  -- ==========================================================================

  line_totals AS (
    SELECT
      tv.invoice,
      (CAST((((tv.total) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER)
        - (CASE WHEN ((((tv.total) + 2.220446049250313e-16) * 100) + 0.5) < 0
                  AND ((((tv.total) + 2.220446049250313e-16) * 100) + 0.5)
                      <> CAST(((((tv.total) + 2.220446049250313e-16) * 100) + 0.5) AS INTEGER)
                THEN 1 ELSE 0 END)) / 100.0 AS total
    FROM transaction_view tv
  ),
  invoice_s AS (
    -- `s` = SUM of ALREADY-ROUNDED line totals (views.js:89, :93).
    SELECT
      iv.id,
      iv.created,
      iv.dated,
      iv.invoiceNo,
      iv.party,
      iv.booker,
      iv.type,
      COALESCE(lt.s, 0) AS s,
      iv.d1,
      iv.d2,
      iv.drs
    FROM invoice_view iv
    LEFT JOIN (
      SELECT invoice, SUM(total) AS s FROM line_totals GROUP BY invoice
    ) lt ON lt.invoice = iv.id
    -- `committed` is every invoice, so this filter is now a no-op. It is kept so the join shape the
    -- reports are written against does not change: a WHERE between FROM and LEFT JOIN splits the
    -- join clause and SQLite fails at the keyword (`near "LEFT": syntax error`).
    WHERE iv.id IN (SELECT id FROM committed)
  ),
  invoice_chain AS (
    -- views.js:94-95. `unrounded` is deliberately NOT rounded: it is a DENOMINATOR for the discount
    -- allocation (views.js:132), and rounding it changes two money figures.
    --
    -- d1/d2 ride along because `net_line` needs them to apply the INVOICE discount chain to each
    -- line. `party`/`type` ride along because `dailysale` filters sale invoices and resolves the
    -- party's area.
    SELECT
      id,
      invoiceNo,
      party,
      type,
      booker,
      d1,
      d2,
      (s - (s * (d1 / 100.0))) AS after_d1,
      ((s - (s * (d1 / 100.0))) - ((s - (s * (d1 / 100.0))) * (d2 / 100.0))) AS unrounded,
      drs
    FROM invoice_s
  ),
  invoice_totals AS (
    -- views.js:109: final_total = round2(unrounded - discount_rs) — round2 ONCE over the whole
    -- expression, not to `unrounded` and again to the subtraction.
    SELECT
      id,
      invoiceNo,
      booker,
      (CAST(((((unrounded - drs) + 2.220446049250313e-16) * 100) + 0.5) AS INTEGER)
        - (CASE WHEN ((((unrounded - drs) + 2.220446049250313e-16) * 100) + 0.5) < 0
                  AND ((((unrounded - drs) + 2.220446049250313e-16) * 100) + 0.5)
                      <> CAST(((((unrounded - drs) + 2.220446049250313e-16) * 100) + 0.5) AS INTEGER)
                THEN 1 ELSE 0 END)) / 100.0 AS final_total
    FROM invoice_chain
  ),
  payments_base AS (
    -- views.js:145 buildPaymentsView, minus `company` (an ARRAY in JS, a scalar in SQL — nothing
    -- reads it, and the hybrid attempt failed on other columns).
    --
    -- The zero-amount fallback (views.js:182): `num(p.amount) !== 0 ? num(p.amount) :
    -- num(invoice.final_total)`. `p.amount <> 0` is NULL for a NULL amount, and SQLite's CASE takes
    -- the ELSE then — which is what the JS ternary does for null too.
    SELECT
      p.id AS id,
      p.created AS created,
      p.updated AS updated,
      (CASE WHEN p.payment_date = '' THEN p.created ELSE p.payment_date END) AS payment_date,
      p.invoice AS invoice,
      it.booker AS booker,
      -- The human invoice number, carried because three reports print it and paymentFilters also
      -- matches on it (reports.js:124). NULL when the payment has no invoice.
      it.invoiceNo AS invoiceNo,
      p.party AS party,
      pa.type AS party_type,
      p.type AS type,
      COALESCE((CASE WHEN p.amount <> 0 THEN p.amount ELSE it.final_total END), 0) AS amount,
      p.paid AS paid,
      pa.area AS area,
      ar.section AS section,
      p.description AS description
    FROM payments p
    LEFT JOIN invoice_totals it ON p.invoice = it.id
    LEFT JOIN parties pa ON pa.id = p.party
    LEFT JOIN areas ar ON ar.id = pa.area
    WHERE p.invoice IS NULL OR p.invoice IN (SELECT id FROM committed)
  ),
  payments_view AS (
    -- views.js:358-359, the credit/debit CASE pair that buildLedgerBooker derives. Carried here
    -- because three reports need it (booker/party/area) and inlining it three times is how the copy
    -- drifts.
    --
    -- CRITICAL: these use `pb.amount` — the FALLBACK value from payments_base — never `p.amount`.
    -- Referring to the raw amount instead silently computed credit/debit from raw values while every
    -- other column used the fallback, so the booker ledger totalled 25.9M against a JS 55.5M with
    -- `amount` itself matching on every row. That is the exact shape of bug only a totals assertion
    -- catches: every per-row field agreed.
    SELECT
      pb.*,
      (CASE WHEN pb.type = 1 THEN (CASE WHEN pb.paid = TRUE THEN pb.amount ELSE 0 END)
            ELSE (CASE WHEN pb.type = 0 THEN (CASE WHEN pb.paid = FALSE THEN pb.amount ELSE 0 END)
                  ELSE 0 END) END) AS credit,
      (CASE WHEN pb.type = 0 THEN (CASE WHEN pb.paid = TRUE THEN pb.amount ELSE 0 END)
            ELSE (CASE WHEN pb.type = 1 THEN (CASE WHEN pb.paid = FALSE THEN pb.amount ELSE 0 END)
                  ELSE 0 END) END) AS debit
    FROM payments_base pb
  ),

  -- views.js:122-138 buildTransactionsReport, split so each money step is a named step.
  net_line AS (
    -- The line's share of its invoice: the line total with BOTH the line discount chain and the
    -- INVOICE discount chain applied, before rounding (this is `net_raw`; `net_rounded` rounds it).
    SELECT
      tv.id AS id,
      tv.invoice AS invoice,
      tv.inv_type AS type,
      tv.inv_party AS party,
      tv.invoiceNo AS invoiceNo,
      tv.item AS item,
      tv.price AS price,
      tv.qty AS qty,
      tv.scheme AS scheme,
      tv.cost_price AS cost_price,
      tv.created AS created,
      tv.updated AS updated,
      tv.inv_booker AS booker,
      -- COALESCE to 0: views.js:132 reads `inv.unrounded_total` off an invoices map that has an entry
      -- for EVERY invoice, with `unrounded_total: 0` for one with no lines. A LEFT JOIN that finds no
      -- `invoice_chain` row yields NULL, and `NULL <> 0` is NULL (falsy in the CASE guard), so the
      -- allocation silently becomes 0 — right answer, wrong reason.
      COALESCE(ic.unrounded, 0) AS unrounded_total,
      ic.drs AS inv_drs,
      ((tv.price * tv.qty) * (1 - (tv.d1 / 100.0)) * (1 - (tv.d2 / 100.0)) - tv.drs)
        * (1 - (COALESCE(ic.d1, 0) / 100.0)) * (1 - (COALESCE(ic.d2, 0) / 100.0)) AS net_raw
    FROM transaction_view tv
    LEFT JOIN invoice_chain ic ON ic.id = tv.invoice
  ),
  net_rounded AS (
    SELECT
      nl.*,
      (CAST((((nl.net_raw) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER)
        - (CASE WHEN ((((nl.net_raw) + 2.220446049250313e-16) * 100) + 0.5) < 0
                  AND ((((nl.net_raw) + 2.220446049250313e-16) * 100) + 0.5)
                      <> CAST(((((nl.net_raw) + 2.220446049250313e-16) * 100) + 0.5) AS INTEGER)
                THEN 1 ELSE 0 END)) / 100.0 AS net_amount
    FROM net_line nl
  ),
  allocated AS (
    -- views.js:132: `alloc = unrounded ? (inv_drs * net_amount) / unrounded : 0`. The guard is
    -- load-bearing: without it SQLite yields NULL, which prints as "0.00" via printf but is not the
    -- number the JS produced, and final_amount becomes NULL rather than 0.
    SELECT
      nr.*,
      (CASE WHEN COALESCE(nr.unrounded_total, 0) <> 0
            THEN ((COALESCE(nr.inv_drs, 0) * nr.net_amount) / nr.unrounded_total)
            ELSE 0 END) AS alloc
    FROM net_rounded nr
  ),
  alloc_rounded AS (
    -- views.js:137: final_amount = round2(net - alloc).
    SELECT
      a.*,
      (CAST((((a.net_amount - a.alloc) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER)
        - (CASE WHEN ((((a.net_amount - a.alloc) + 2.220446049250313e-16) * 100) + 0.5) < 0
                  AND ((((a.net_amount - a.alloc) + 2.220446049250313e-16) * 100) + 0.5)
                      <> CAST(((((a.net_amount - a.alloc) + 2.220446049250313e-16) * 100) + 0.5) AS INTEGER)
                THEN 1 ELSE 0 END)) / 100.0 AS final_amount,
      (COALESCE(a.cost_price, 0) * COALESCE(a.qty, 0)) AS cost_line
    FROM allocated a
  ),
  profit_rounded AS (
    -- views.js:138: profit = round2(net_amount - alloc - cost_price * qty).
    SELECT
      ar.*,
      (CAST((((ar.net_amount - ar.alloc - ar.cost_line) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER)
        - (CASE WHEN ((((ar.net_amount - ar.alloc - ar.cost_line) + 2.220446049250313e-16) * 100) + 0.5) < 0
                  AND ((((ar.net_amount - ar.alloc - ar.cost_line) + 2.220446049250313e-16) * 100) + 0.5)
                      <> CAST(((((ar.net_amount - ar.alloc - ar.cost_line) + 2.220446049250313e-16) * 100) + 0.5) AS INTEGER)
                THEN 1 ELSE 0 END)) / 100.0 AS profit
    FROM alloc_rounded ar
  ),
  transactions_report AS (
    SELECT
      pr.id,
      pr.invoice,
      pr.type,
      pr.party,
      pr.invoiceNo,
      pr.item,
      pr.price,
      pr.qty,
      pr.scheme,
      pr.cost_price,
      pr.created,
      pr.updated,
      pr.booker,
      pr.net_amount,
      pr.profit,
      pr.final_amount,
      pr.unrounded_total,
      pr.inv_drs,
      pa.type AS party_type,
      pa.area,
      ar2.section,
      it.category AS company
    FROM profit_rounded pr
    LEFT JOIN parties pa ON pa.id = pr.party
    LEFT JOIN areas ar2 ON ar2.id = pa.area
    LEFT JOIN items it ON it.id = pr.item
  ),

  -- views.js:276-278: the "difference" party is resolved by a whole-table scan for a normalised
  -- name, taking the FIRST match in `base.parties` order (= id DESC, lib/data.js:90). Without
  -- `ORDER BY id DESC LIMIT 1` SQLite returns an arbitrary row, so a second party named
  -- "difference" would silently change the report.
  difference_party AS (
    SELECT id FROM parties
    WHERE LOWER(TRIM(CAST(COALESCE(name, '') AS TEXT))) = 'difference'
    ORDER BY id DESC
    LIMIT 1
  ),
  difference_deltas AS (
    -- views.js:271-289 buildItemsDifferenceReport: `qty + scheme` for the difference rows, signed as
    -- a stock movement. The legacy type-3 row keeps its own +q rule, so the CASE is a 3-way
    -- discriminator on (legacy, type), not a single CASE on type — items_difference_report.sql only
    -- implements the type=3 branch and is therefore NOT equivalent to this.
    SELECT
      tv.item,
      SUM((CASE WHEN tv.inv_type = 3 THEN (tv.qty + tv.scheme)
                WHEN tv.inv_type = 1 THEN -((tv.qty + tv.scheme))
                ELSE (tv.qty + tv.scheme) END)) AS qty
    FROM transaction_view tv
    WHERE tv.inv_type = 3
       OR tv.inv_party = (SELECT id FROM difference_party)
    GROUP BY tv.item
  ),
  stock_deltas AS (
    -- views.js:246-267 buildItemsReport: a signed stock movement per item.
    --   return (2): +q for a customer, -q for a supplier
    --   difference (3): +q
    --   sale (1): -q
    --   purchase and anything else: +q
    SELECT
      tv.item,
      SUM((CASE
        WHEN tv.inv_type = 2 THEN (CASE WHEN tv.party_type = 0 THEN (tv.qty + tv.scheme) ELSE -((tv.qty + tv.scheme)) END)
        WHEN tv.inv_type = 3 THEN (tv.qty + tv.scheme)
        WHEN tv.inv_type = 1 THEN -((tv.qty + tv.scheme))
        ELSE (tv.qty + tv.scheme)
      END)) AS qty
    FROM transaction_view tv
    GROUP BY tv.item
  ),
  ledger_journal AS (
    -- views.js:303-340 buildLedgerJournal: paymentsView rows UNION ALL expenses rows.
    --
    -- `created` is the payment's `payment_date` for payments (views.js:311) — the journal is dated by
    -- payment date, not by the payment's own created — and the expense's own `created`.
    --
    -- `account_type` is the RAW payment `type` (an integer) for payments but the LITERAL STRING
    -- "cash" for expenses (views.js:332). That mixed typing is load-bearing and is NOT normalised:
    -- the `tone` projection (reports.js:426-433) compares account_type against the STRING labels
    -- "recieving"/"sending", and SQLite orders an integer before a string, so giving the column TEXT
    -- affinity would make "recieving" never equal type 1 and change every tone in the report.
    SELECT
      pv.id AS id,
      pv.invoiceNo AS invoiceNo,
      pv.payment_date AS created,
      COALESCE(pv.description, '') AS description,
      (CASE WHEN pv.paid = 1 THEN 'payment' ELSE 'invoice' END) AS transaction_type,
      pv.type AS account_type,
      pv.party_type AS party_type,
      (CASE WHEN pv.type = 1 THEN (CASE WHEN pv.paid = 1 THEN -1 ELSE 1 END)
            WHEN pv.type = 2 THEN (CASE WHEN pv.party_type = 0 THEN -1 ELSE 0 END)
            ELSE 0 END) * pv.amount AS accounts_recievable,
      (CASE WHEN pv.type = 0 THEN (CASE WHEN pv.paid = 1 THEN -1 ELSE 1 END)
            WHEN pv.type = 2 THEN (CASE WHEN pv.party_type = 1 THEN -1 ELSE 0 END)
            ELSE 0 END) * pv.amount AS accounts_payable,
      (CASE WHEN pv.paid = 1 THEN (CASE WHEN pv.type = 1 THEN pv.amount ELSE -1 * pv.amount END)
            ELSE 0 END) AS cash,
      0 AS stock,
      0 AS journal_kind
    FROM payments_view pv

    UNION ALL

    -- views.js:324-338. `stock` is hard-coded 0 for expenses, so the journal's stock column is
    -- structurally always zero and reportLedgerGeneral reports it as "0.00" (reports.js:451, :458).
    SELECT
      e.id,
      'N/A',
      e.created,
      COALESCE(e.description, ''),
      'expense',
      'cash',
      NULL,
      0,
      0,
      -COALESCE(e.amount, 0),
      0,
      1 AS journal_kind
    FROM expenses e
  ),

  -- The names, for the display projection. `nameOf` in JS returns "" for a missing id, so every join
  -- is a LEFT JOIN with COALESCE rather than an INNER one.
  party_names AS (SELECT id, name FROM parties),
  area_names AS (SELECT id, name FROM areas),
  section_names AS (SELECT id, name FROM sections),
  booker_names AS (SELECT id, name FROM order_bookers),
  item_names AS (SELECT id, name, COALESCE(box_size_qty, 0) AS box_size_qty FROM items),
  company_names AS (SELECT id, name FROM companies)