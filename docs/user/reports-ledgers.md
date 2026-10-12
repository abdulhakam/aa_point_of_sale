# AA Point of Sale — User Guide: Reports & Ledgers

## Report Hub (`/reports`)

The Reports hub organizes 14 reports into **four categories**:

```
┌─────────────────────────────────────────────────────────────────┐
│                        REPORTS HUB                               │
├──────────────────┬──────────────────┬──────────────────┬────────┤
│   SALES          │   PURCHASES      │   PAYMENTS       │ STOCK  │
│  ─────────────   │  ─────────────   │  ─────────────   │ ────── │
│ • Daily Sale     │ (Use Sales       │ • Payments       │ • Stock│
│ • Sales Report   │  reports with    │ • Payments by    │ • Profit│
│ • Product Sale   │  Type=Purchase)  │   Company        │ • Diff.│
│ • Item Sales     │                  │ • Outstanding    │ • Supply│
└──────────────────┴──────────────────┴──────────────────┴────────┘
```

Click any card to open the report with default filters.

---

## Common Report Controls

### Filter Bar (Top of Every Report)

| Control | Description |
|---------|-------------|
| **From / To** | Business date range (invoice `dated`, falls back to `created`) |
| **Party** | Searchable dropdown (Name - Area - Section) |
| **Booker** | Searchable dropdown |
| **Area / Section** | Hierarchical: Section → Area |
| **Item** | Searchable (name, barcode, display ID) |
| **Company** | For item/product reports |
| **Type** | Purchase / Sale / Return / Difference |
| **Unpaid Only** | `balance > 0` (Outstanding) |

### Table Features

| Feature | How to Use |
|---------|------------|
| **Sort** | Click column header (↑/↓ toggles) |
| **Filter** | Type in search box above table (client-side) |
| **Pagination** | 1000 rows/page (bottom) |
| **Totals** | Above table — computed on **full filtered set** |

### Totals Bar

Shows for **all filtered rows** (not just visible page):
- **Count** — Row count
- **Sum columns** — Exact paisa arithmetic (no float error)

### Print & Export

| Action | Result |
|--------|--------|
| **Print** button | Opens A4 landscape printable version |
| **Add to Queue** | Adds to browser print queue (`/print`) |
| **Browser Print** | `Ctrl+P` on printable page |

---

## Sales Reports

### Daily Sale (`/reports/dailysale`)

**Purpose:** Day-wise sales summary

**Filters:** Date range, Party, Booker, Area, Section

**Columns:**
| Column | Description |
|--------|-------------|
| Date | Business date |
| Invoices | Count of sale invoices |
| Qty | Total quantity sold |
| Sales | Gross sales (before discounts) |
| Returns | Return quantity (negative) |
| Net Qty | Sales - Returns |
| Net Sales | Net amount after discounts |

**Totals:** Sum across all days in range

**Use Case:** Daily closing, sales trend analysis

---

### Sales Report (`/reports/salesreport`)

**Purpose:** Detailed transaction-level sale invoices

**Filters:** Date range, Party, Booker, Area, Section, Item, Company, Unpaid only

**Columns:**
| Column | Description |
|--------|-------------|
| Date | Invoice business date |
| Invoice # | Sequential number |
| Party | Customer name |
| Item | Item name |
| Qty | Quantity (negative for returns) |
| Rate | Unit price |
| Amount | Line amount (after line discounts) |

**Special:** `salesOnly` bind = unpaid receiving/return only

**Use Case:** Invoice verification, commission calculation

---

### Product Sale (`/reports/productsale`)

**Purpose:** Item-wise sales performance

**Filters:** Date range, Party, Area, Section, Company, Item

**Columns:**
| Column | Description |
|--------|-------------|
| Item | Item name |
| Qty Sold | Total sale quantity |
| Sales | Gross sales amount |
| Returns | Return quantity |
| Net Qty | Sold - Returns |
| Avg Rate | Net Sales / Net Qty |
| Net Sales | After all discounts |

**Use Case:** Best/worst sellers, pricing analysis

---

### Item Sales (`/reports/itemsales`)

**Purpose:** Transaction-level item movements (sales + purchases)

**Filters:** Date range, Party, Booker, Area, Section, Item, Company, Type

**Columns:**
| Column | Description |
|--------|-------------|
| Date | Transaction date |
| Invoice # | Source invoice |
| Party | Party name |
| Item | Item name |
| Type | Purchase/Sale/Return/Diff |
| Qty | Signed quantity |
| Price | Unit price |
| Amount | Line total |

**Use Case:** Audit trail, item movement history

---

## Payment Reports

### Payments (`/reports/payments`)

**Purpose:** All payment transactions

**Filters:** Date range, Party, Booker, Type, Paid status, Invoice #

**Columns:**
| Column | Description |
|--------|-------------|
| Date | Payment date (falls back to invoice date) |
| Invoice # | Linked invoice (or blank) |
| Party | Party name |
| Type | Receiving / Sending / Return |
| Amount | Payment amount |
| Paid | ✓ if cleared, ✗ if placeholder |
| Description | Memo |

**Totals:**
- **Receiving** — Money in (type=1, paid=1)
- **Sending** — Money out (type=0, paid=1)
- **Returns** — Refunds (type=2)
- **Net** — Receiving - Sending - Returns

**Use Case:** Cash flow, bank reconciliation

---

### Payments by Company (`/reports/paymentsbycompany`)

**Purpose:** Company-wise receipt summary

**Filters:** Date range, Party, Area, Section

**Columns:**
| Column | Description |
|--------|-------------|
| Company | Company name |
| Receiving | Money received (paid=1, type=1) |
| Sending | Money paid (paid=1, type=0) |
| Returns | Refunds (paid=1, type=2) |
| Net | Receiving - Sending - Returns |

**Special:** Only `salesOnly` invoices (unpaid receiving/return)

**Use Case:** Brand/distributor performance

---

### Outstanding (`/reports/outstanding`)

**Purpose:** Unpaid invoices (receivables + payables)

**Filters:** Date range, Party, Booker, Area, Section, Type

**Columns:**
| Column | Description |
|--------|-------------|
| Invoice # | Invoice number |
| Date | Invoice business date |
| Type | Purchase/Sale/Return/Diff |
| Party | Party name |
| Total | Invoice total |
| Paid | Payments received |
| Balance | Total - Paid (positive = due) |

**Special:** Only invoices with `balance > 0.005`

**Totals:**
- **Receivable** — Sale invoices (party=customer)
- **Payable** — Purchase invoices (party=supplier)
- **Net** — Receivable - Payable

**Use Case:** Collection follow-up, aging analysis

---

## Stock Reports

### Stock (`/reports/stock`)

**Purpose:** Current stock position per item

**Filters:** Company, Item, Area, Section

**Columns:**
| Column | Description |
|--------|-------------|
| Item | Item name |
| Company | Brand/Company |
| Opening | Stock at period start |
| In | Purchases + Returns in |
| Out | Sales + Returns out |
| Closing | Opening + In - Out |
| Rate | Cost price (avg) |
| Value | Closing × Rate |

**Stock Movement Logic:**
- Purchase (type=0): **+qty**
- Sale (type=1): **-qty**
- Return (type=2): **+qty** (customer) / **-qty** (supplier)
- Difference (type=3): **+qty**

**Use Case:** Inventory valuation, reorder planning

---

### Profit (`/reports/profit`)

**Purpose:** Margin analysis per item

**Filters:** Date range, Party, Booker, Area, Section, Item, Company

**Columns:**
| Column | Description |
|--------|-------------|
| Item | Item name |
| Sales | Net sales (after all discounts) |
| Cost | Cost of goods sold |
| Profit | Sales - Cost |
| % | Profit / Sales × 100 |

**Calculation:** Uses full discount allocation (invoice + line discounts)

**Use Case:** Profitability by SKU, pricing decisions

---

### Difference (`/reports/difference`)

**Purpose:** Stock adjustments (type=3 + "Difference" party)

**Filters:** Date range, Item, Company

**Columns:**
| Column | Description |
|--------|-------------|
| Item | Item name |
| Qty Adjusted | Signed adjustment |
| Reason | From invoice description |

**Use Case:** Shrinkage tracking, write-offs

---

### Supply Summary (`/reports/supplysummary`)

**Purpose:** Supplier-wise purchase analysis for selected invoices

**Workflow:**
1. Open report → **Select Invoices** panel (checkboxes)
2. Choose sale invoices to analyze
3. Click **Generate**

**Columns:**
| Column | Description |
|--------|-------------|
| Company | Supplier company |
| Invoices | Count |
| Qty | Total purchase qty |
| Amount | Total purchase amount |
| Avg Rate | Amount / Qty |

**Use Case:** Supplier payment planning, purchase analysis

---

## Ledgers (`/reports/ledgers`)

### Party Ledger (`/reports/ledgers/party`)

**Purpose:** Complete transaction history for a party

**Filters:** Party (required), Date range, Opening balance

**Columns:**
| Column | Description |
|--------|-------------|
| Date | Transaction date |
| Type | Invoice/Payment/Expense |
| Invoice # | Reference |
| Debit | Amount owed by party |
| Credit | Amount owed to party |
| Balance | Running balance |
| Description | Memo |

**Opening Balance:** Enter manually for period start

**Balance Direction:**
- **Positive** = Party owes you (Receivable)
- **Negative** = You owe party (Payable)

**Transaction Sources:**
- Sale invoices → Debit (customer owes)
- Purchase invoices → Credit (you owe supplier)
- Payments (paid=1) → Opposite of invoice
- Expenses → Credit (cash out)

---

### Booker Ledger (`/reports/ledgers/booker`)

**Purpose:** Order booker commission/collection tracking

**Filters:** Booker (required), Date range

**Columns:**
| Column | Description |
|--------|-------------|
| Date | Invoice date |
| Invoice # | Reference |
| Party | Customer name |
| Type | Sale/Purchase |
| Amount | Invoice total |
| Commission | Calculated (configurable %) |
| Balance | Running |

**Use Case:** Sales team performance, commission payouts

---

### Area Ledger (`/reports/ledgers/area`)

**Purpose:** Geographic sales/collection summary

**Filters:** Area (required), Date range

**Columns:**
| Column | Description |
|--------|-------------|
| Area | Area name |
| Section | Parent section |
| Sales | Total sales |
| Collections | Payments received |
| Outstanding | Sales - Collections |

---

### General Ledger (`/reports/ledgers/general`)

**Purpose:** Full double-entry trial balance

**Filters:** Date range, **Openings required**

**Required Openings (enter at period start):**
| Account | Description |
|---------|-------------|
| **Receivables** | Opening debtors |
| **Payables** | Opening creditors |
| **Cash** | Opening cash/bank |

**Account Types:**

| Account | Source | Debit | Credit |
|---------|--------|-------|--------|
| **Accounts Receivable** | Sale invoices | Invoice total | Payment received |
| **Accounts Payable** | Purchase invoices | Payment made | Invoice total |
| **Cash** | Receipts, Payments, Expenses | Receipts | Payments + Expenses |
| **Stock** | Inventory movement | Purchase | Sale |

**Columns:**
| Column | Description |
|--------|-------------|
| Date | Transaction date |
| Ref | Invoice/Payment/Expense # |
| Description | Memo |
| Account | Receivable/Payable/Cash/Stock |
| Debit | Debit amount |
| Credit | Credit amount |
| Balance | Running per account |

**Totals:** Each account shows opening, period movement, closing

**Use Case:** Financial statements, audit trial balance

---

## Report Printing

### Printable Format (A4 Landscape)

All reports print with:
- Business header (name, address, phone)
- Report title + date range
- Filter summary (active filters)
- Column headers
- Data rows
- Totals at bottom
- Page numbers

### Print Queue

1. On report page: **Add to Print Queue**
2. Go to **Print** (`/print`) or press `Alt+P`
3. **Print All** — Opens each report in new tab, triggers print

### Scheduled Printing

For regular reports (daily/weekly):
1. Set filters, bookmark URL
2. Add to queue daily
3. Print queue at end of day

---

## Data Freshness

**Reports run on LIVE data** — no precomputation/caching.

**Version indicator** (navbar dot):
- **Gray** = Idle (data current)
- **Blue** = Fetching
- **Red** = Processing
- **Yellow** = Rendering

**Force refresh:** Click indicator or **Settings → Refresh Data**

**Background job:** Runs minutely, probes all tables, updates fingerprint

---

## Common Report Patterns

### Monthly Sales Summary
1. **Sales Report** → From: 1st, To: Month-end
2. Group by Party (sort by Party column)
3. Print → A4 landscape

### Customer Outstanding
1. **Outstanding** → Party filter
2. Sort by Balance (desc)
3. Print for collection calls

### Stock Reorder
1. **Stock** → Sort by Closing (asc)
2. Filter low stock items
3. Create Difference invoices for adjustments

### Monthly Profit
1. **Profit** → Date range = month
2. Sort by Profit % (desc)
3. Identify loss leaders

### Supplier Payments Due
1. **Payments by Company** → Date range
2. Check Net column (negative = pay supplier)
3. Create Sending payments

---

## Troubleshooting Reports

| Issue | Cause | Fix |
|-------|-------|-----|
| **Report shows 0 rows** | Date range wrong | Check From/To; invoice `dated` may be empty |
| **Totals don't match** | Float vs paisa | Reports use exact paisa; legacy used float |
| **Party missing** | Not in filter dropdown | Settings → Refresh Data (refdb sync) |
| **Slow load** | Large date range | Narrow date range; use Unpaid Only |
| **Print cuts columns** | Too many columns | Browser print → Landscape, scale 80% |
| **Opening balance wrong** | Not entered | General Ledger requires manual openings |

---

## Report SQL (For Developers)

Each report is a **single SQL statement** in `app/reports/sql/reports/*.sql` composed with shared `prelude.sql` CTEs.

**Key CTEs available:**
- `transactions_report` — Full transaction rows with all money
- `invoice_totals` — Header totals with discount chain
- `payments_view` — Payments with credit/debit
- `stock_deltas` — Signed stock per item
- `ledger_journal` — Unified journal (payments + expenses)

**Money rule:** All totals accumulated in **integer paisa**, divided by 100 once at output.