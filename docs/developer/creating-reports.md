# AA Point of Sale — Developer Guide: Creating New Reports

## Report Architecture Overview

Reports use a **spool-based architecture**:
1. **SQL executes** in SQLite → rows serialized to JSONL
2. **JSONL written** to TrailBase KV store (shared across components)
3. **Renderer** reads KV by key → splices rows into Jinja2 template
4. **Rows never enter QuickJS** — avoids ~1.4s/60k rows component boundary cost

## Step-by-Step: Creating a New Report

### 1. Create the SQL Statement

**Location:** `traildepot/runtime/app/reports/sql/reports/your-report.sql`

```sql
-- your-report.sql
-- Uses prelude CTEs (composed automatically)
-- Available CTEs: transactions_report, invoice_totals, payments_view, 
--   stock_deltas, difference_deltas, ledger_journal, *_names

SELECT
  tr.id,
  tr.dated AS date,
  tr.invoiceNo AS invoice_no,
  pn.name AS party,
  in.name AS item,
  tr.qty,
  tr.price,
  tr.net_amount,
  tr.profit
FROM transactions_report tr
LEFT JOIN party_names pn ON pn.id = tr.party
LEFT JOIN item_names in ON in.id = tr.item
WHERE tr.dated IS NOT NULL
  AND (:party = '' OR tr.party = :party)
  AND (:from = '' OR tr.dated >= date(:from))
  AND (:to = '' OR tr.dated <= date(:to))
ORDER BY tr.dated DESC, tr.id DESC;
```

**Key Points:**
- Parameters use `:param_name` syntax (bound by `spoolreports.js`)
- Filter parameters: `party`, `booker`, `area`, `section`, `item`, `company`, `from`, `to`, `type`
- Special: `invoiceId` (blob) + `invoiceNo` (text) for invoice filter
- Special: `invoices` (pipe-delimited hex) for supply summary
- Report constants: `salesOnly`, `agg` (from manifest `binds`)

### 2. Create Page Manifest

**Location:** `traildepot/runtime/app/pages/reports/your-report/meta.json`

```json
{
  "title": "Your Report",
  "compute": { "report": "your-report" },
  "spool": {
    "sql": "your-report.sql",
    "binds": {},
    "row": [
      "id", "date", "invoice_no", "party", "item",
      "qty", "price", "net_amount", "profit"
    ],
    "totals": {
      "cents": {
        "total_qty": "SUM(qty)",
        "total_sales": "SUM(final_amount)",
        "total_cost": "SUM(cost_line)",
        "total_profit": "SUM(profit)"
      },
      "derived": {},
      "consts": {}
    }
  }
}
```

### 3. Manifest Fields Explained

| Field | Required | Purpose |
|-------|----------|---------|
| `title` | Yes | Page title |
| `compute.report` | Yes | Registry key (matches folder name) |
| `spool.sql` | Yes | SQL file name |
| `spool.binds` | No | Report constants (not user filters) |
| `spool.row` | **Yes** | SELECT column order — **contract with host** |
| `spool.totals.cents` | No | Paisa-accumulated buckets |
| `spool.totals.derived` | No | Derived from cents buckets |
| `spool.totals.consts` | No | Literal paisa amounts |
| `spool.totals.pick` | No | Single-row pick (ORDER BY LIMIT 1) |
| `spool.totals.openings` | No | Opening balances (ledgers) |

### 4. Totals Specification

#### Cents Buckets (Integer Paisa Accumulation)

```json
"cents": {
  "total_qty": "SUM(qty)",
  "total_sales": "SUM(final_amount)",
  "total_cost": "SUM(cost_line)",
  "total_profit": "SUM(profit)",
  "recieving": "SUM(CASE WHEN type=1 AND paid=1 THEN amount ELSE 0 END)",
  "sending": "SUM(CASE WHEN type=0 AND paid=1 THEN amount ELSE 0 END)"
}
```

**Rule:** Every expression wrapped in `toCents()` → integer paisa → exact sum → `printf('%.2f', .../100.0)` on output.

#### Derived Totals (From Cents Buckets)

```json
"derived": {
  "net_receiving": { "op": "-", "terms": ["recieving", "recieved", "recievingReturns"] },
  "recievable": { "op": "+", "terms": ["openingRecievables", "net_receiving"] },
  "payable": { "op": "+", "terms": ["openingPayables", "sending", "sendingReturns"] }
}
```

- `op`: `"+"` | `"-"`
- `terms`: Array of cents bucket keys (from `cents` or `openings`)
- Evaluated in manifest order — dependencies must come first

#### Consts (Literal Paisa)

```json
"consts": {
  "fixed_fee": "500"  // 5.00 in paisa
}
```

#### Pick Shape (Single Row)

```json
"pick": {
  "latest_date": "dated"
},
"order": "dated DESC"
```

Returns one row ordered by `order` with `COUNT(*)` over full set.

#### Openings (Ledger Reports)

```json
"openings": {
  "openingRecievables": ":openingRecievables",
  "openingPayables": ":openingPayables",
  "openingCash": ":openingCash"
}
```

Bound from user input via `totalsParams()`.

### 5. Create Template (Optional)

**Default:** Uses shared `reports/report.html` — no template needed.

**Custom:** Create `traildepot/runtime/app/pages/reports/your-report/page.html`

```html
{% extends "reports/report.html" %}

{% block report_title %}Your Report{% endblock %}

{% block extra_filters %}
<!-- Additional filter controls -->
<div class="form-field">
  <label>Custom Filter</label>
  <select name="custom_filter">
    <option value="">All</option>
    <option value="a">Option A</option>
  </select>
</div>
{% endblock %}
```

### 6. Add Filter Parameter (If Needed)

If you added a new filter (e.g., `custom_filter`):

1. **Update SQL** — add `AND (:custom_filter = '' OR tr.custom = :custom_filter)`
2. **Update `params()` in `spoolreports.js`** — add to `values` object:

```javascript
const values = {
  // ... existing ...
  custom_filter: text(f.custom_filter),
};
```

3. **Update `unboundParams()`** — automatically detected from SQL via regex `:([a-z_][a-z0-9_]*)`

### 7. Test the Report

```bash
# From trailbase/ directory
node tools/verify-spool-reports.mjs your-report
```

**Verification Levels:**
- **EXACT** — Total = integer paisa sum of reported rows
- **SOUND** — Derived = {op, terms} over own totals
- **CORROBORATED** — Alternate `toCentsAlt` construction agrees

### 8. Register in Report Hub (Optional)

Edit `traildepot/runtime/app/views/reports/index.html` to add card.

---

## Filter System Deep Dive

### Standard Filter Parameters

| Param | Type | SQL Binding | Use Case |
|-------|------|-------------|----------|
| `party` | blob | `blob:base64` | Party ID |
| `booker` | blob | `blob:base64` | Booker ID |
| `area` | blob | `blob:base64` | Area ID |
| `section` | blob | `blob:base64` | Section ID |
| `item` | blob | `blob:base64` | Item ID |
| `company` | blob | `blob:base64` | Company ID |
| `from` | text | `date(:from)` | Business date from |
| `to` | text | `date(:to)` | Business date to |
| `type` | text | `CAST(:type AS INTEGER)` | Invoice/payment type |
| `invoiceId` | blob | `blob:base64` | Invoice ID match |
| `invoiceNo` | text | `invoiceNo = :invoiceNo` | Invoice number match |
| `invoices` | text | `instr(:invoices, '|' || hex || '|')` | Supply summary set |
| `salesOnly` | text | `CAST(:salesOnly AS INTEGER)` | Report constant |
| `agg` | text | `CAST(:agg AS INTEGER)` | Report constant |

### Binding Functions

```javascript
const text = (v) => v === undefined || v === null ? "" : String(v);
const id = (v) => v === undefined || v === null || v === "" ? "" : `blob:${v}`;
```

- **text** — For TEXT columns, date strings, numbers as text
- **id** — For BLOB columns (UUIDv7), prefixes `blob:` for `spool::bind_param`

### Invoice Filter (Dual Binding)

```javascript
invoiceId: id(f.invoice),   // blob: for unhex(?)
invoiceNo: text(f.invoice), // text for invoiceNo = ?
```

Single bind cannot do both — `unhex(?)` needs blob, number compare needs text.

---

## Money Calculations

### The Money Rule (CRITICAL)

**Round PER LINE before summing** — implemented in `prelude.sql` `line_totals` CTE:

```sql
-- round2: floor(((v + EPSILON) * 100) + 0.5) / 100
-- EPSILON = 2.220446049250313e-16
(CAST((((tv.total) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER)
  - (CASE WHEN ... < 0 AND ... <> CAST(... AS INTEGER) THEN 1 ELSE 0 END)) / 100.0
```

**Why:** Float `SUM` of 2dp values accumulates error. On this depot: 770/26,099 rows changed by half-paisa.

### Discount Chain (Header)

```sql
-- In invoice_chain CTE:
after_d1 = s - s * d1 / 100.0
unrounded = after_d1 - after_d1 * d2 / 100.0  -- DENOMINATOR, never rounded
final_total = round2(unrounded - drs)
```

### Line Discount Chain

```sql
-- In transaction_view:
total = (price * qty) * (1 - d1/100) * (1 - d2/100) - drs
-- Then round2 in line_totals
```

### Net Amount (Line with Invoice Discounts)

```sql
-- In net_line CTE:
net_raw = line_total * (1 - inv_d1/100) * (1 - inv_d2/100)
-- Then round2 in net_rounded
```

### Allocation (Invoice Discount Rs Distributed)

```sql
-- In allocated CTE:
alloc = CASE WHEN unrounded <> 0 THEN (inv_drs * net_amount) / unrounded ELSE 0 END
```

### Final Amount & Profit

```sql
-- In alloc_rounded:
final_amount = round2(net_amount - alloc)

-- In profit_rounded:
profit = round2(net_amount - alloc - cost_price * qty)
```

---

## JSON Data Output (`/p/<slug>/data`)

### Endpoint

```
GET /p/your-report/data?from=2026-01-01&to=2026-12-31&party=...
```

### Response Format

```json
{
  "result": {
    "rows": [
      { "id": "...", "date": "2026-10-12", "invoice_no": 1234, ... },
      ...
    ],
    "totals": {
      "rowCount": 1234,
      "total_qty": "12345.67",
      "total_sales": "987654.32",
      ...
    },
    "meta": {
      "filters": { "from": "2026-01-01", "to": "2026-12-31", ... },
      "generatedAt": "2026-10-12T10:30:00.000Z"
    }
  }
}
```

### Implementation

```javascript
// In route module (route.js)
import { jsonPayload } from "app/lib/spoolreports.js";

export async function GET(req) {
  const filters = routeKit.parsePairs(req.url().query);
  const payload = { filters, title: "Your Report" };
  return { html: await jsonPayload("your-report", filters, payload, null, null) };
}
```

---

## Adding a Report Route

### Route Folder Structure

```
traildepot/runtime/ahscripts/routes/
└── reports/
    └── your-report/
        ├── route.js
        └── meta.json  (optional, for route-specific config)
```

### Route Module (`route.js`)

```javascript
import { routeKit } from "app/lib/route-kit.js";
import { jsonPayload } from "app/lib/spoolreports.js";

export async function GET(req) {
  const A = req.A;
  const routeKit = A.routeKit;
  
  // Parse filters
  const filters = routeKit.parsePairs(req.url().query);
  
  // Check if JSON payload requested
  const accept = req.header("accept") || "";
  if (accept.includes("application/json")) {
    const payload = { filters, title: "Your Report" };
    return { html: await jsonPayload("your-report", filters, payload, null, null) };
  }
  
  // HTML page
  const refs = await routeKit.refs();
  const ctx = { filters, refs, active: "reports", title: "Your Report" };
  return routeKit.renderRoute(req, { 
    active: "reports", 
    title: "Your Report", 
    template: "reports/report.html" 
  }, ctx);
}
```

---

## Common Patterns

### Filter by Business Date

```sql
WHERE tr.dated >= date(:from) AND tr.dated <= date(:to)
-- :from/:to bound as TEXT via params()
```

### Party/Area/Section Hierarchy

```sql
LEFT JOIN parties pa ON pa.id = tr.party
LEFT JOIN areas ar ON ar.id = pa.area
LEFT JOIN sections se ON se.id = ar.section
WHERE (:party = '' OR pa.id = :party)
  AND (:area = '' OR ar.id = :area)
  AND (:section = '' OR se.id = :section)
```

### Invoice Type Filter

```sql
WHERE tr.type = CAST(:type AS INTEGER)
-- 0=purchase, 1=sale, 2=return, 3=difference
```

### Payment Type Filter

```sql
WHERE pv.type = CAST(:type AS INTEGER)
-- 0=sending, 1=recieving, 2=return
```

### Unpaid Only

```sql
-- In invoice_totals context:
WHERE it.final_total - COALESCE(paid_sum, 0) > 0.005
```

---

## Debugging Reports

### View Composed SQL

```javascript
// In route or console
const { sql } = await sqlFor('your-report');
console.log(sql);  // Full composed statement with prelude
```

### Inspect Spool

```javascript
const handle = await spoolRows('your-report', {}, 10);
const rows = await kvTakeJSONL(handle.key);
console.log(rows);  // Parsed JSONL rows
```

### Bench Commands

```bash
# Row spool baseline
/tools/bench/spool?arm=rows&report=your-report

# Totals statement
/tools/bench/spool?arm=totals&report=your-report

# Full page render
/tools/bench/spool?arm=page&report=your-report
```

### Verify Totals

```bash
node tools/verify-spool-reports.mjs your-report
```

---

## Performance Tips

| Tip | Impact |
|-----|--------|
| Narrow date ranges | Reduces scanned rows |
| Use indexes | `idx_transactions_invoice`, `idx_transactions_item`, `idx_invoices_dated`, `idx_invoices_party` |
| Avoid `SELECT *` | Explicit columns in `row` manifest |
| Limit report constants | `salesOnly`, `agg` only when needed |
| Use `LIMIT` in SQL | Handled by `spoolRows(limit, offset)` |

---

## Migration from Legacy JS Reports

**Old:** `compute/reports.js` with `buildXReport` functions
**New:** Single SQL statement + manifest

| Legacy | New |
|--------|-----|
| `buildPaymentsReport()` | `payments.sql` + `payments.json` manifest |
| `views.js` derived views | `prelude.sql` CTEs |
| JS `round2` | SQL `toCents()` in `tiers` layer |
| JS totals object | `totals.cents` + `totals.derived` manifest |

**Verification:** `tools/verify-prelude.mjs` compares prelude CTEs against legacy JS views.