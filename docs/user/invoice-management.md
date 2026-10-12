# AA Point of Sale — User Guide: Invoice Management

## Invoice Types

| Code | Type | Description | Stock Effect | Party Type |
|------|------|-------------|--------------|------------|
| 0 | **Purchase** | Goods bought from supplier | **Increases** stock | Supplier |
| 1 | **Sale** | Goods sold to customer | **Decreases** stock | Customer |
| 2 | **Return** | Goods returned | **Reverses** original | Customer/Supplier |
| 3 | **Difference** | Stock adjustment/write-off | **Adjusts** stock | Difference party |

## Invoice Lifecycle

```
NEW → ENTRY/GRID → SAVE → COMPLETE → DOCUMENT/PRINT
```

**Key Points:**
- **No draft state** — every saved invoice is "published" immediately
- **Editable after save** — lines can be added/removed, header updated
- **Lease system** — only one device edits at a time
- **Soft delete** — `deleted` flag hides from lists, preserves history

## Creating an Invoice

### Method 1: Invoice Console (Recommended)

1. Navigate to **Invoices → New Invoice** or press `Alt+N`
2. Select **Type**: Purchase / Sale / Return / Difference
3. Console opens in **Picker State** — shows `NEW` + recent invoices
4. Press `999` or click **NEW** to start fresh
5. Fill header, add lines, save

### Method 2: Invoice List

1. Go to **Invoices → List** (`/invoices`)
2. Click **New** button (top right)
3. Select type → opens Console

### Method 3: Quick Create from Payment

1. In **Payment Entry**, if invoice not found
2. Click **Create Invoice** link
3. Opens Console pre-filled with party

## Invoice Header Fields

| Field | Required | Description |
|-------|----------|-------------|
| **Invoice No** | Auto | Sequential per type (auto-generated) |
| **Date** | Yes | Business date (defaults today, editable for back-dating) |
| **Due Date** | No | Payment due date |
| **Party** | Yes | Customer (Sale/Return) or Supplier (Purchase) |
| **Booker** | No | Order booker (commission tracking) |
| **Description** | No | Free text |
| **Discount 1%** | No | First percentage discount on line sum |
| **Discount 2%** | No | Second percentage discount (compounded) |
| **Discount Rs** | No | Flat rupee discount (applied after percentages) |

### Discount Chain (Header)

```
Line Sum (s) = Σ round2(line_total)
After D1 = s - s × d1/100
Unrounded = After D1 - After D1 × d2/100
Final Total = round2(Unrounded - Discount_Rs)
```

**Example:**
- Line sum: 1000.00
- Discount 1%: 10% → After D1 = 900.00
- Discount 2%: 5% → Unrounded = 855.00
- Discount Rs: 50.00 → **Final = 805.00**

## Invoice Lines

### Line Fields

| Field | Description |
|-------|-------------|
| **Item** | Searchable dropdown (name, barcode, display ID) |
| **Qty** | Positive = sale/purchase, Negative = return |
| **Price** | Editable — operator's value wins over master price |
| **Cost Price** | Reference (from item master) |
| **Discount 1%** | Line-level percentage discount |
| **Discount 2%** | Line-level second percentage |
| **Discount Rs** | Line-level flat discount |
| **Scheme** | Free quantity (buy X get Y) |
| **Amount** | Auto: `round2(price × qty × (1-d1/100) × (1-d2/100) - drs)` |

### Line Discount Chain

```
Line Total = round2(price × qty × (1-d1/100) × (1-d2/100) - drs)
```

**Scheme (Free Qty):**
- Enter free qty in **Scheme** field
- Total qty = `qty + scheme` for stock movement
- Only `qty` used for amount calculation

### Negative Quantity (Returns)

- Enter negative qty (e.g., `-5`)
- Amount calculates as negative
- Stock movement: **returns increase stock** for sale returns
- Party type determines sign:
  - Customer return → `+qty` to stock
  - Supplier return → `-qty` from stock

## Editing Invoices

### Invoice Entry Screen (`/invoices/{id}/entry`)

**Keyboard-centric workflow:**

1. **Header fields** — Tab/Enter to navigate
2. **Lines table** — Each row is a form
3. **Add Line** button → appends empty row
4. **Save Header** → persists header, stays on page
5. **Line save** → Enter in last field saves line, adds new row

**Lease System:**
- First edit acquires **write lease**
- Lease shown as "Editing on [device]"
- Another user sees read-only with holder name
- Lease released on: Save Header, Complete, Navigate away

### Invoice Grid (`/invoices/{id}/grid`)

**Spreadsheet editor:**

- Click any cell to edit
- **Live totals** — header discounts update all lines instantly
- **Price baseline** — shows master price beside editable price
- **Qty display** — shows "3 ctns 12 units" for carton items
- **Row cache** — only changed row recalculates (fast)

**Header Discounts in Grid:**
- Discount 1% / 2% → affect **every line** → `Recalc All`
- Discount Rs → affects **total only** → `Recalc Totals`

## Completing an Invoice

**Complete button** (Entry/Grid):
- Marks `completed = 1` in database
- **No functional change** — invoice remains editable
- Legacy flag preserved for compatibility
- Report filters don't use `completed` (all invoices are "published")

## Deleting an Invoice

**Delete button** → Soft delete:
- Sets `deleted = 1`
- Hidden from lists (filter `deleted = 0`)
- **Preserves** all lines, payments, ledger entries
- **Cannot hard delete** if payments/transactions exist (FK constraint)

## Printing Invoices

### Printable Document (`/invoices/{id}/document`)

**A5 layout** matching legacy exactly:

```
┌─────────────────────────────────────┐
│        SAMPLE TRADERS                │
│  123 Sample Street...         │
│  000-0000000                       │
├─────────────────────────────────────┤
│  INVOICE #1234          Date: 12/10/2026 │
│  Type: SALE           Due: 12/11/2026  │
│  Party: ABC Traders - North - Main    │
│  Booker: John Doe                     │
├─────────────────────────────────────┤
│ Item          │ Qty    │ Rate  │ Amt │
│ ──────────────────────────────────── │
│ Widget A      │ 2 ctns │ 100.00│200.00│
│ Widget B      │ 5 units│ 50.00 │250.00│
├─────────────────────────────────────┤
│ Line Total:                    450.00│
│ Discount 10%:                 -45.00│
│ Discount 5%:                  -20.25│
│ Discount Rs:                  -10.00│
│ ──────────────────────────────────── │
│ GRAND TOTAL:                  374.75│
├─────────────────────────────────────┤
│ Paid:                          200.00│
│ Balance:                       174.75│
├─────────────────────────────────────┤
│  Signature: ___________________     │
└─────────────────────────────────────┘
```

### Print Actions

| Action | Shortcut | Result |
|--------|----------|--------|
| **Print** button | `Ctrl+P` | Opens browser print dialog |
| **Add to Queue** | — | Adds to `/print` queue |
| **Print Queue** | `Alt+P` | Opens queue page |

### Print Queue Workflow

1. On document page: Click **Add to Print Queue**
2. Go to **Print** (nav rail) or press `Alt+P`
3. Review queue → **Print All**
4. Each opens in new tab → auto-triggers print dialog

---

## Invoice Console Deep Dive

### States

```
┌─────────────────────────────────────────────────────┐
│  STATE 0: PICKER                                    │
│  ┌─────────────────────────────────────────────┐   │
│  │ NEW  ← Press 999 or click                   │   │
│  │ #1234 · ABC Traders · 12/10 · 1,234.56      │   │
│  │ #1233 · XYZ Corp · 12/09 · 5,678.90         │   │
│  │ ... (200 most recent)                       │   │
│  └─────────────────────────────────────────────┘   │
│  Header: [Disabled]  Lines: [Disabled]             │
└─────────────────────────────────────────────────────┘
                          │
                    Press 999 / Click NEW
                          ▼
┌─────────────────────────────────────────────────────┐
│  STATE LOADED: EDITOR                               │
│  ┌─────────────────────────────────────────────┐   │
│  │ Invoice #1234  [SALE]  12/10/2026           │   │
│  │ Party: [ABC Traders ▼]  Booker: [John ▼]   │   │
│  │ Disc1: [10]  Disc2: [5]  DiscRs: [10]      │   │
│  ├─────────────────────────────────────────────┤   │
│  │ Item ▼    │ Qty │ Price  │ Disc1 │ Amt    │   │
│  │ [Widget A]│ 2   │ 100.00 │ 0     │ 200.00 │   │
│  │ [Widget B]│ 5   │ 50.00  │ 0     │ 250.00 │   │
│  │ [NEW ROW] │     │        │       │        │   │
│  └─────────────────────────────────────────────┘   │
│  [Save Header] [Complete] [Print] [Actions ▼]      │
└─────────────────────────────────────────────────────┘
```

### Keyboard Shortcuts (Console)

| Keys | Action |
|------|--------|
| `0` | Open picker (State 0) |
| `999` | New invoice |
| `000` | Advanced item search |
| `↑` / `↓` | Navigate: Header fields → Line fields → Header |
| `Enter` | In header: Save header / Next field |
| `Enter` | In line: Save line, add new row |
| `Escape` | Close dialogs / Cancel |

### Advanced Item Search (`000`)

Opens modal with:
- Full item list (searchable)
- Columns: Name, Company, Sale Price, Cost Price, Carton Size
- Click to select → fills current line's item & price

### Quick-Create Panels (Right Sidebar)

**Create Party:**
- Name, Type (Customer/Supplier), Phone, Address, Area
- Saves via AJAX → appears in Party dropdown instantly

**Create Item:**
- Name, Company, Barcode, Display ID, Cost Price, Sale Price, Carton Size
- Saves via AJAX → appears in Item dropdown instantly

**Create Area/Section/Booker/Company:** Similar inline forms

---

## Invoice List (`/invoices`)

### Filters

| Filter | Type | Behavior |
|--------|------|----------|
| **Type** | Dropdown | Purchase/Sale/Return/Difference/All |
| **From Date** | Date | `dated >=` (business date) |
| **To Date** | Date | `dated <=` |
| **Party** | Searchable | Exact match on party ID |
| **Unpaid Only** | Checkbox | `total - paid > 0.005` |

### Columns

| Column | Source | Sortable |
|--------|--------|----------|
| **#** | `invoiceNo` | Yes |
| **Date** | `dated` (falls back to `created`) | Yes |
| **Type** | `type` label | Yes |
| **Party** | `partyName` | Yes |
| **Booker** | `bookerName` | Yes |
| **Total** | Computed (line sum + discounts) | Yes |
| **Paid** | Sum of paid payments | Yes |
| **Balance** | `total - paid` | Yes |

### Totals Bar

Shows **filtered set totals** (not just page):
- **Count** — Number of invoices
- **Total** — Sum of invoice totals
- **Paid** — Sum of paid amounts
- **Balance** — Total - Paid

### Row Actions

| Action | Route | Purpose |
|--------|-------|---------|
| **Entry** | `/invoices/{id}/entry` | Keyboard entry |
| **Grid** | `/invoices/{id}/grid` | Spreadsheet edit |
| **Document** | `/invoices/{id}/document` | Printable view |
| **Print** | — | Add to print queue |

---

## Payment Allocation

### How Payments Link to Invoices

1. **Payment Entry** — Select invoice (optional)
2. **Amount** defaults to invoice balance
3. **Payment Date** — Can differ from invoice date
4. **Paid checkbox** — Unpaid = ledger placeholder (0.00)

### Invoice Balance Display

```
Balance = Invoice Total - Σ(paid payments)
```

- **Positive** = Amount due
- **Negative** = Credit (overpaid/return)

### Outstanding Report

Shows all invoices with `balance > 0.005` (paisa threshold).

---

## Importing Legacy Invoices

If migrating from v1:

1. **Settings → Import from v1**
2. Select legacy database file
3. **Import runs:**
   - ~60,000 records
   - ~8,900 invoices
   - Maps legacy categories → companies
   - Attributes invoices to logged-in user
4. **Verify:**
   - Check Outstanding report
   - Spot-check invoice totals
   - Compare Stock report

**Note:** All imported invoices have `completed = 0` (legacy flag carries no meaning).

---

## Common Workflows

### Daily Sales Entry

1. `Alt+N` → Console opens
2. Type `999` → New Sale invoice
3. Select customer (type `0` for picker)
4. Add lines: Item → Qty → Price (Enter)
5. Header discounts if needed
6. `Complete` → Done

### Purchase Entry

1. `Alt+N` → Console
2. Type `999` → Select **Purchase** type
3. Select supplier
4. Add lines
5. `Complete`

### Return Processing

1. `Alt+N` → Console
2. Type `999` → Select **Return** type
3. Select party (customer/supplier)
4. Add lines with **negative qty**
5. `Complete`

### Stock Adjustment

1. `Alt+N` → Console
2. Type `999` → Select **Difference** type
3. Party auto-set to "Difference" party
4. Add lines (positive = write-on, negative = write-off)
5. `Complete`

### Back-dating Invoices

1. In header **Date** field
2. Enter past date (e.g., `2026-09-15`)
3. Invoice uses this date for:
   - Reports (Daily Sale, Outstanding)
   - Stock movement date
   - Payment fallback date

---

## Troubleshooting Invoices

| Issue | Cause | Fix |
|-------|-------|-----|
| **Invoice not in picker** | Type filter wrong | Check console type selector |
| **Can't edit** | Lease held by other | Wait or ask other user to save |
| **Total mismatch** | Discount not applied | Check header Disc1/Disc2/DiscRs |
| **Stock not updated** | Invoice not completed | Click Complete (though not required) |
| **Party not in dropdown** | Not created | Quick-create panel (right sidebar) |
| **Item price wrong** | Master price changed | Edit price inline (operator wins) |
| **Print cuts off** | Wrong paper size | Ensure `data-paper="a5"` on document |

---

## Invoice Numbering

- **Sequential per type** — Purchase: 1,2,3... Sale: 1,2,3...
- **Auto-generated** on create (`999` in console)
- **Not editable** — system assigned
- **Legacy numbering** preserved on import