# AA Point of Sale — User Guide: Core Features

## Navigation

The application uses a **left navigation rail** with these sections:

| Section | Icon | Routes |
|---------|------|--------|
| **Dashboard** | 📊 | `/dashboard` — Quick stats, recent activity |
| **Invoices** | 🧾 | `/invoices` — List, entry, grid, console |
| **Reports** | 📈 | `/reports` — 14 report types |
| **Ledgers** | 📒 | `/reports/ledgers` — Party, booker, area, general |
| **Payments** | 💰 | `/payments` — Payment entry & list |
| **Cash Memo** | 💵 | `/cashmemo` — DA, vouchers, expenses |
| **Inventory** | 📦 | `/inventory` — Stock overview |
| **Management** | ⚙️ | `/management` — Parties, items, areas, etc. |
| **Settings** | 🔧 | `/settings` — Preferences, import |
| **Print** | 🖨️ | `/print` — Print queue |

## Dashboard (`/dashboard`)

**Purpose:** At-a-glance business overview

**Shows:**
- Total invoices (today/this month)
- Outstanding receivables
- Outstanding payables
- Cash balance
- Recent invoices (last 5)
- Recent payments (last 5)
- Low stock alerts

**Actions:**
- Click any stat to jump to relevant report
- "New Invoice" button → Invoice Console

---

## Invoices

### Invoice List (`/invoices`)

**Filters:**
- **Type:** Purchase / Sale / Return / Difference / All
- **Date Range:** From / To (business date)
- **Party:** Search by name
- **Status:** Unpaid only toggle

**Columns:** Invoice #, Date, Type, Party, Booker, Total, Paid, Balance, Actions

**Actions per row:**
- **Entry** → Keyboard-centric entry screen
- **Grid** → Spreadsheet editor
- **Document** → Printable A5 invoice
- **Print** → Add to print queue

**Pagination:** 300 rows per page (configurable via URL)

**Totals Bar:** Shows count, total, paid, balance for **filtered set** (not just page)

### Invoice Entry (`/invoices/{id}/entry`)

**Keyboard-centric design** — optimized for data entry operators.

**Header Fields:**
- Invoice # (auto-generated)
- Date (defaults to today, editable for back-dating)
- Due Date
- Party (searchable dropdown: Name - Area - Section)
- Booker (searchable dropdown)
- Description
- Discount 1%, Discount 2%, Discount Rs.

**Line Fields (per row):**
- Item (searchable — typing filters)
- Qty (negative for returns)
- Price (editable — operator's value wins)
- Cost Price (reference)
- Discount 1%, Discount 2%, Discount Rs.
- Scheme (free qty)
- Amount (auto-calculated, read-only)

**Keyboard Navigation:**
- `Enter` → Next field
- `↑/↓` → Previous/Next field
- `Tab` → Next input
- `Escape` → Cancel dialog

**Buttons:**
- **Add Line** — Appends new line row
- **Save Header** — Saves header, stays on page
- **Complete** — Marks invoice complete (no draft state)
- **Print** → Opens printable document

### Invoice Grid (`/invoices/{id}/grid`)

**Spreadsheet-style editor** for power users.

**Features:**
- All lines visible in table
- Inline editing (click cell, type, Enter)
- **Live recalculation** — amounts update instantly
- Header discounts (%, Rs) apply to all lines in real-time
- **Price baseline** — shows item's master price beside editable price
- **Lease system** — only one device can edit at a time

**Lease Indicator:**
- Green: You hold the lease (editable)
- Red: Another device holds it (read-only, shows holder)
- Lease acquired on first edit, released on save/navigate away

### Invoice Console (`/invoices/new?type=N`)

**Unified workflow** — combines picker + editor in one screen.

**States:**
1. **Picker (State 0)** — Shows `NEW` + 200 most recent invoices of selected type
2. **Loaded** — Invoice opened, editor active

**Keyboard State Machine:**
| Input | State | Action |
|-------|-------|--------|
| `0` | 0 | Open invoice picker |
| `999` | 0 | Create new invoice |
| `000` | 0 | Advanced item search |
| `↑/↓` | Any | Walk header → lines → header |
| `Enter` | Line | Save line, new line |
| `Enter` | Header | Save header |

**Quick-Create Panels** (right side):
- **Create Party** — Name, type, phone, address, area
- **Create Item** — Name, company, prices, carton size
- **Create Area/Section/Booker/Company**

All create via AJAX — new record appears in dropdowns instantly.

### Invoice Document (`/invoices/{id}/document`)

**Printable A5 layout** matching legacy print exactly.

**Sections:**
- Business header (name, address, phone)
- Invoice header (#, date, type, party, booker)
- Line table (item, carton/unit qty, price, discounts, amount)
- Totals (line sum, discount chain, final total)
- Payment summary (paid, balance)
- Signature lines

**Print:** Click **Print** button or `Ctrl+P` — opens browser print dialog with A5 preset.

---

## Reports (`/reports`)

### Report Hub

Four card types:
1. **Sales Reports** — Daily Sale, Sales Report, Product Sale, Item Sales
2. **Purchase Reports** — (via type filter on sales reports)
3. **Payment Reports** — Payments, Payments by Company, Outstanding
4. **Stock Reports** — Stock, Profit, Difference, Supply Summary

### Common Report Features

**Filter Bar (top):**
- Date Range (From/To) — business date
- Party / Booker / Area / Section / Item / Company
- Type filter (where applicable)
- **Unpaid Only** toggle (outstanding)

**Table:**
- Sortable columns (click header)
- Client-side search filter (per-table)
- Pagination (1000 rows/page default)

**Totals:**
- **Row count** (full filtered set)
- **Sum totals** (computed in SQL, exact paisa arithmetic)
- Displayed above table, update with filters

**Export:** Print button → A4 landscape printable version

### Report Details

| Report | Purpose | Key Columns |
|--------|---------|-------------|
| **Daily Sale** | Day-wise sales summary | Date, Invoices, Qty, Sales, Returns, Net |
| **Sales Report** | Detailed sale invoices | Date, Invoice#, Party, Item, Qty, Rate, Amount |
| **Product Sale** | Item-wise sales | Item, Qty, Sales, Returns, Net Qty, Avg Rate |
| **Item Sales** | Transaction-level sales | Date, Invoice#, Party, Item, Qty, Price, Amount |
| **Payments** | All payments received/made | Date, Invoice#, Party, Type, Amount, Paid |
| **Payments by Company** | Company-wise receipts | Company, Recieving, Sending, Returns, Net |
| **Outstanding** | Unpaid invoices | Invoice#, Date, Party, Total, Paid, Balance |
| **Stock** | Current stock per item | Item, Opening, In, Out, Closing, Rate, Value |
| **Profit** | Margin analysis | Item, Sales, Cost, Profit, % |
| **Difference** | Stock adjustments | Item, Qty Adjusted, Reason |
| **Supply Summary** | Supplier-wise purchase summary | Company, Invoices, Qty, Amount |

---

## Ledgers (`/reports/ledgers`)

### Party Ledger (`/reports/ledgers/party`)

**Shows:** All transactions for a party (invoices + payments)

**Columns:** Date, Type, Invoice#, Debit, Credit, Balance, Description

**Filters:** Party, Date Range, Opening Balance

**Opening Balance:** Enter manually for period start

### Booker Ledger (`/reports/ledgers/booker`)

**Shows:** Commission/collection tracking per order booker

**Columns:** Date, Invoice#, Party, Type, Amount, Commission, Balance

### Area Ledger (`/reports/ledgers/area`)

**Shows:** Area-wise summary of sales/collections

### General Ledger (`/reports/ledgers/general`)

**Full double-entry ledger** with account types:

| Account Type | Source |
|--------------|--------|
| Accounts Receivable | Sale invoices (credit) + Receipts (debit) |
| Accounts Payable | Purchase invoices (debit) + Payments (credit) |
| Cash | Receipts (debit) + Payments (credit) + Expenses (credit) |
| Stock | Sale (credit) + Purchase (debit) + Returns |

**Openings Required:** Receivable, Payable, Cash (enter at period start)

---

## Payments (`/payments`)

### Payment Entry (`/payments/new`)

**Fields:**
- **Date** (defaults to today)
- **Party** (customer/supplier)
- **Type:** Receiving (money in) / Sending (money out) / Return
- **Amount**
- **Paid** checkbox (unpaid = ledger placeholder)
- **Invoice** (optional — links to invoice)
- **Booker** (if applicable)
- **Description**

**Invoice Linking:**
- If invoice selected: Amount defaults to invoice balance
- Payment date can differ from invoice date (falls back to invoice date)
- Shows invoice balance after payment

### Payment List (`/payments`)

**Filters:** Date range, Party, Type, Paid status, Booker

**Columns:** Date, Invoice#, Party, Type, Amount, Paid, Description

**Actions:** Edit, Delete, Print voucher

---

## Cash Memo (`/cashmemo`)

### Daily Advice (DA) (`/cashmemo/da`)

**Purpose:** End-of-day cash position

**Shows:**
- Opening cash
- Receipts (by type)
- Payments (by type)
- Expenses
- Closing cash
- Difference (should be 0)

### Vouchers (`/cashmemo/vouchers`)

**Payment vouchers** (money out) and **Receive vouchers** (money in)

**Voucher Entry:**
- Date, Party, Amount, Description
- Auto-numbered
- Printable A5 voucher

### Expenses (`/cashmemo/expenses`)

**Expense entry:**
- Date, Name, Description, Amount
- Appears in General Ledger as Cash credit

---

## Inventory (`/inventory`)

**Stock Overview:**
- Item, Company, Current Qty, Carton Qty, Unit Qty
- Cost Price, Sale Price, Stock Value
- Low stock indicator (configurable threshold)

**Actions:**
- View item transactions (opens Item Sales report filtered)
- Adjust stock (creates Difference invoice)

---

## Management (`/management`)

### Entity Management Screens

Each entity has: **List → Create → Edit → Delete (soft)**

| Entity | Fields | Relations |
|--------|--------|-----------|
| **Sections** | Name | — |
| **Areas** | Name, Section | Section |
| **Companies** | Name | — |
| **Parties** | Name, Type (Cust/Sup), Phone, Address, Area, Companies (multi) | Area, Companies |
| **Order Bookers** | Name, Phone, Companies (multi) | Companies |
| **Items** | Name, Company, Barcode, Display ID, Cost Price, Sale Price, Carton Size | Company |

**List Features:**
- Search filter (client-side)
- Column sort
- Pagination
- **Create** button → inline form
- **Edit** → inline form (pre-filled)
- **Delete** → soft delete (hidden, not removed)

**Multi-select (Companies):**
- Parties & Bookers can belong to multiple companies
- Checkbox list in create/edit form

---

## Settings (`/settings`)

### User Preferences (per-browser, localStorage)

| Setting | Options | Default |
|---------|---------|---------|
| **Invoice Picker Scope** | All invoices / Open only | All |
| **Theme** | Light / Dark / System | System |
| **Items per Page** | 100 / 300 / 500 / 1000 | 300 |

**Invoice Picker Scope:**
- **"All"** — Shows all invoices in picker (slower, complete)
- **"Open only"** — Shows only unpaid invoices (faster, for payment entry)

### Data Management

- **Import from v1** — Legacy database import
- **Refresh Data** — Forces report fingerprint refresh
- **Clear Caches** — Clears IndexedDB (refdb, pagecache, invoicedb)

### Change Password

- Current password, new password, confirm

---

## Print System

### Print Queue (`/print`)

**Browser-local queue** (localStorage) — persists across sessions.

**Workflow:**
1. On any printable page (invoice document, report, voucher): Click **Add to Queue**
2. Go to **Print Queue** (`/print` or Print rail icon)
3. **Print All** — Opens each in new tab, triggers `window.print()`
4. **Clear Queue** — Empties queue

**Queue Items Show:**
- Document title
- Source URL
- Added timestamp

### Printable Documents

| Document | Paper | Route |
|----------|-------|-------|
| Invoice | A5 | `/invoices/{id}/document?print=1` |
| Voucher | A5 | `/cashmemo/vouchers/{id}?print=1` |
| Receive Voucher | A5 | `/cashmemo/vouchers/{id}?print=1&type=receive` |
| DA | A4 | `/cashmemo/da?print=1` |
| Report | A4 Landscape | `/reports/{slug}?print=1` |
| Ledger | A4 Landscape | `/reports/ledgers/{slug}?print=1` |

---

## Search & Autocomplete

**Long dropdowns** (Parties, Items, etc.) become **searchable comboboxes**:

1. Click dropdown → shows filtered list
2. Type to filter (searches name, area, section for parties)
3. `Enter` to select
4. `Escape` to close

**Server-side invoice search** (Console picker):
- Type invoice number → fetches matches from server
- Avoids loading 12,000+ invoices into browser

---

## Data Freshness & Sync

**Reference data** (parties, items, areas, etc.) cached in **IndexedDB**.

**Sync triggers:**
- Page load (checks version)
- After any write (create/edit/delete)
- Manual "Refresh Data" in Settings
- Background refresh job (minutely)

**Version indicator:** Gray/Blue/Red/Yellow dot in navbar:
- Gray = Idle
- Blue = Fetching
- Red = Processing
- Yellow = Rendering

Click to force refresh.