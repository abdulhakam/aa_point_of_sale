# AA Point of Sale — Developer Documentation: Reports & SQL Engine

## Report Engine Overview

The report system uses a **spool-based architecture** where:
1. SQL executes in SQLite → rows serialized to JSONL
2. JSONL written to **TrailBase KV store** (shared across components)
3. Renderer (`tb-ah-render-jinja`) reads KV by key → splices rows into template
4. **Rows never enter QuickJS** — avoids ~1.4s/60k rows component boundary cost

**Files:**
- `app/lib/spoolreports.js` — Main report engine
- `app/reports/sql/prelude.sql` — Shared CTE chain (composed once)
- `app/reports/sql/reports/*.sql` — Per-report statements
- `app/pages/reports/*/meta.json` — Report manifests with spool blocks

## Report Manifest (`meta.json`)

Each report page has a `meta.json` with a `spool` block:

```json
{
  "compute": { "report": "profit" },
  "spool": {
    "sql": "profit.sql",
    "binds": {},
    "row": ["id", "date", "invoice_no", "party", "item", "qty", "price", "net_amount", "profit"],
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

| Field | Purpose |
|-------|---------|
| `sql` | Report statement file under `reports/sql/reports/` |
| `binds` | Report constants (not user filters) — e.g., `salesOnly: "1"` |
| `row` | **Required** — SELECT column order (contract with host) |
| `totals.cents` | Paisa-accumulated buckets |
| `totals.derived` | Derived totals (e.g., `recievable = opening + recieving - recieved`) |
| `totals.consts` | Literal paisa amounts |
| `totals.pick` | Single-row pick with ORDER BY LIMIT 1 |
| `totals.openings` | Opening balances for ledger reports |

## The Prelude (`prelude.sql`)

**Shared CTE chain composed in front of every report** — written once, parsed once.

### CTEs Provided

| CTE | Description | Source |
|-----|-------------|--------|
| `committed` | All invoices (no draft state) | `invoices` |
| `invoice_view` | Invoice header with num()-coerced discounts | `invoices` |
| `transaction_view` | Lines with line total, party type, area, dated | `transactions` + joins |
| `line_totals` | **round2 PER LINE** (money rule) | `transaction_view` |
| `invoice_s` | `s = SUM(line_totals)` | `invoice_view` + `line_totals` |
| `invoice_chain` | `after_d1`, `unrounded` (denominator), `drs` | `invoice_s` |
| `invoice_totals` | `final_total = round2(unrounded - drs)` | `invoice_chain` |
| `payments_base` | Payments with zero-amount fallback | `payments` + `invoice_totals` |
| `payments_view` | Credit/debit CASE pairs | `payments_base` |
| `net_line` | Line net with invoice discounts | `transaction_view` + `invoice_chain` |
| `net_rounded` | `round2(net_raw)` | `net_line` |
| `allocated` | Invoice discount allocation per line | `net_rounded` |
| `alloc_rounded` | `final_amount = round2(net - alloc)` | `allocated` |
| `profit_rounded` | `profit = round2(net - alloc - cost)` | `alloc_rounded` |
| `transactions_report` | Full transaction row with all money | `profit_rounded` + joins |
| `difference_party` | Resolves "difference" party by name | `parties` |
| `difference_deltas` | Stock movement for diff party + type 3 | `transaction_view` |
| `stock_deltas` | Signed stock movement per item | `transaction_view` |
| `ledger_journal` | Payments UNION ALL expenses | `payments_view` + `expenses` |
| `*_names` | Display name lookups | `parties`, `areas`, `sections`, `bookers`, `items`, `companies` |

### Money Rule (CRITICAL)

**Round PER LINE before summing** — implemented in `line_totals` CTE:

```sql
-- round2: floor(((v + EPSILON) * 100) + 0.5) / 100
-- EPSILON = 2.220446049250313e-16
-- Implemented via CAST (no floor() in guest SQLite)

(CAST((((tv.total) + 2.220446049250313e-16) * 100) + 0.5 AS INTEGER)
  - (CASE WHEN ((((tv.total) + 2.220446049250313e-16) * 100) + 0.5) < 0
            AND ((((tv.total) + 2.220446049250313e-16) * 100) + 0.5)
                <> CAST(((((tv.total) + 2.220446049250313e-16) * 100) + 0.5) AS INTEGER)
        THEN 1 ELSE 0 END)) / 100.0 AS total
```

**Why:** Float `SUM` of 2dp values accumulates representation error. On this depot: 770/26,099 rows changed by half-paisa.

**Tie rule:** Half-up (accounting convention). `floor(v + 0.5)` for all signs.

### Date Handling

**Business date resolution** — critical for imported data where `dated = ''`:

```sql
-- In transaction_view and invoice_chain:
COALESCE(NULLIF(i.dated, ''), i.created) AS dated
```

- `i.dated` = operator-entered invoice date
- Falls back to `i.created` (insert timestamp)
- 21 invoices in imported ledger have empty `dated` — without fallback they leaked into EVERY date window

## Per-Report Statements

### Location: `app/reports/sql/reports/`

| Report | SQL File | Key Features |
|--------|----------|--------------|
| Daily Sale | `dailysale.sql` | Filters on `i.dated`, sale type only |
| Difference | `difference.sql` | `agg: "difference"` bind |
| Item Sales | `itemsales.sql` | Per-item sales with margins |
| Outstanding | `outstanding.sql` | Unpaid invoices (total - paid > 0) |
| Payments | `payments.sql` | Payment list with credit/debit |
| Payments by Company | `payments_by_company.sql` | `salesOnly: "1"` bind |
| Product Sale | `productsale.sql` | Item-wise sale details |
| Profit | `profit.sql` | Full margin analysis |
| Sales Report | `salesreport.sql` | `salesOnly: "1"` bind |
| Stock | `stock.sql` | `agg: "stock"` bind |
| Supply Summary | `supplysummary.sql` | Submitted invoice set (`invoices` bind) |

### Report Constants (binds)

```javascript
// In spoolreports.js registryEntry:
salesOnly: spool.binds?.salesOnly,  // "1" = unpaid recieving/return only
agg: spool.binds?.agg,              // "difference" | "stock"
```

These are **report constants**, not user filters. They describe the report's nature.

### Parameter Binding (`params()` function)

All filters converted to binds in declaration order:

```javascript
const values = {
  booker: id(f.booker),           // blob:base64
  party: id(f.party),
  area: id(f.area),
  section: id(f.section),
  item: id(f.item),
  company: id(f.company),
  invoiceId: id(f.invoice),       // blob: for ID match
  invoiceNo: text(f.invoice),     // text for number match
  from: text(f.from),
  to: text(f.to),
  type: text(f.type),             // payment type code
  invoices: text(f.invoices),     // |HEX|HEX| for supply summary
  salesOnly: text(spec.salesOnly), // report constant
  agg: text(spec.agg),            // report constant
  openingRecievables: text(f.openingRecievables),
  openingPayables: text(f.openingPayables),
  openingCash: text(f.openingCash),
};
```

**Critical:** `invoice` filter needs TWO binds — one for ID (blob), one for number (text). Single bind cannot do both.

## Totals Engine

Two shapes based on manifest:

### 1. Aggregate Shape (most reports)

```sql
WITH totals_src AS (SELECT * FROM ( <report statement> )),
tiers AS (
  SELECT 
    COUNT(*) AS rowCount,
    SUM(toCents(expr1)) AS bucket1_c,
    SUM(toCents(expr2)) AS bucket2_c,
    ...
    toCents(opening1) AS opening1_c,
    ...
  FROM totals_src
)
SELECT 
  s.rowCount,
  printf('%.2f', s.bucket1_c / 100.0) AS bucket1,
  ...
  s.derived1_c / 100.0 AS derived1,
  ...
FROM (
  SELECT 
    rowCount,
    bucket1_c - bucket2_c AS derived1_c,  -- derived from paisa sums
    ...
  FROM tiers
) AS s
```

**Key design:**
- `tiers` layer: Every amount → **integer paisa** via `toCents()`
- Second layer: Derived totals read paisa aliases (`tiers.bucket1_c`)
- Division by 100 **once** on output via `printf('%.2f', ...)`
- Trailing zeros preserved

### 2. Pick Shape (single-row reports)

```sql
WITH totals_src AS (SELECT * FROM ( <report statement> ))
SELECT
  COUNT(*) AS rowCount,
  printf('%.2f', COALESCE((SELECT col FROM totals_src ORDER BY ordering LIMIT 1), 0)) AS picked
FROM totals_src
```

### `toCents()` Implementation

```javascript
const toCents = (e) => {
  const z = `(((${e}) * 100) + 0.5)`;
  return `(CAST(${z} AS INTEGER) - (CASE WHEN ${z} < 0 AND ${z} <> CAST(${z} AS INTEGER) THEN 1 ELSE 0 END))`;
};
```

**Alternate for parity gate:** `toCentsAlt = CAST(ROUND(x * 100) AS INTEGER)` — different construction, same result.

## Report Registry

Built from page manifests on first use (`loadRegistry()`):

```javascript
async function loadRegistry() {
  const walk = async (dir) => {
    for (const name of await fs.readdir(dir)) {
      await walk(dir + "/" + name);
      const raw = await fs.readFile(dir + "/" + name + "/meta.json");
      const meta = JSON.parse(raw);
      const key = meta?.compute?.report;
      if (key) {
        const entry = registryEntry(key, meta);
        if (entry) out[key] = entry;
      }
    }
  };
  await walk("/app/pages");
  return out;
}
```

**Cached in memory** — manifest changes need server restart (same as all `app/` edits).

## Composing Statements (`composeStatement`)

```javascript
export async function composeStatement(body) {
  const prelude = await prelude();  // Cached
  const opensWithCte = /^\s*,?\s*[\w$]+\s+AS\s*\(/.test(body);
  return prelude + (opensWithCte ? ",\n" : "\n") + body;
}
```

- Report body may open with CTEs (needs trailing comma on prelude)
- Or just a SELECT (needs newline, no comma)

## Report Page Rendering

```javascript
export async function renderPage(name, template, ctx, filters, limit, onTiming) {
  const handle = await spoolRows(name, filters, limit);
  if (onTiming) onTiming(handle);
  return render.spooled(template, ctx || {}, [{ field: "rows", key: handle.key }]);
}
```

- `spoolRows` adds `LIMIT n OFFSET m` to SQL (statement-level paging)
- `render.spooled` passes `spools: [{ field: "rows", key: handle.key }]`
- Host splices rows into context before rendering

## JSON Payload (`/p/<slug>/data`)

```javascript
export async function jsonPayload(name, filters, payload, totals, meta, onTiming) {
  const next = { ...payload, result: { totals: totals || {}, meta: meta || {} } };
  if (!name) return JSON.stringify(next);
  const handle = await spoolRows(name, filters, -1);  // -1 = all rows
  if (onTiming) onTiming(handle);
  return render.json(next, [{ field: "result.rows", key: handle.key }]);
}
```

- `result.rows` = full report (spooled)
- `result.totals` = scalar totals (computed by `totalsFor`)
- `result.meta` = report metadata

## Totals Computation (`totalsFor`)

```javascript
export async function totalsFor(name, filters) {
  const handle = await sqlite.spool(`${name}:totals`, await totalsSql(name), cols, await totalsParams(name, filters));
  const parsed = JSON.parse(render.json({}, [{ field: "totals", key: handle.key }]));
  return parsed.totals[0] ?? { rowCount: 0 };
}
```

- Runs totals statement (single row)
- Spooled and read back via `render.json`
- Returns formatted strings (e.g., `"123456.78"`)

## Parity Verification (`tools/verify-spool-reports.mjs`)

Three verification levels:

| Level | Description |
|-------|-------------|
| **EXACT** | Total = integer paisa sum of reported rows |
| **SOUND** | Derived total = {op, terms} over this file's own totals (paisa resolution) |
| **CORROBORATED** | Second independent paisa construction agrees |

**Gate requires:** Both `toCents` and `toCentsAlt` constructions agree before accepting a total.

## Adding a New Report

1. **Create SQL:** `app/reports/sql/reports/myreport.sql`
```sql
-- Uses prelude CTEs: transactions_report, invoice_totals, payments_view, etc.
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
ORDER BY tr.dated DESC, tr.id DESC;
```

2. **Create page folder:** `app/pages/reports/myreport/`
3. **Create `meta.json`:**
```json
{
  "title": "My Report",
  "compute": { "report": "myreport" },
  "spool": {
    "sql": "myreport.sql",
    "binds": {},
    "row": ["id", "date", "invoice_no", "party", "item", "qty", "price", "net_amount", "profit"],
    "totals": {
      "cents": {
        "total_qty": "SUM(qty)",
        "total_sales": "SUM(final_amount)",
        "total_profit": "SUM(profit)"
      }
    }
  }
}
```

4. **Template:** Use shared `reports/report.html.jinja` or create custom

## Invoice Document SQL (`invoice-doc.js`)

Separate from report engine — renders printable invoice:

```javascript
// Invoice sheet query (single invoice)
SELECT 
  i.*, pa.name AS party_name, bo.name AS booker_name,
  -- Line totals with full discount chain
  -- Header totals matching legacy print
FROM invoices i
LEFT JOIN parties pa ON pa.id = i.party
LEFT JOIN order_bookers bo ON bo.id = i.booker
WHERE i.id = unhex(?)
```

**Column widths** must match legacy print (constraint: `invoice.print.column_widths_match_legacy`).

## Data Fingerprint & Refresh

### Fingerprint (`reports.js`)

```javascript
// Per-table: "count:newest_updated"
async function probeFingerprints() {
  for (const table of TABLES) {
    const rows = await sqlite.all(`SELECT COUNT(*) AS n, COALESCE(MAX("updated"), '') AS newest FROM "${table}"`);
    out[table] = `${rows[0][0]}:${rows[0][1]}`;
  }
  return out;
}
```

- 17 tables probed
- Memoized 1.5s per thread
- **KV stamp** (`aa:data-stamp`) for cross-thread invalidation

### Refresh Job (`reports.js` + `route-kit.js`)

```javascript
// Minutely poller → POST /jobs/reconcile
// Route: jobsReconcile(A, db, req, query, form)
// Runs queue work + service.refresh(db)
```

- `refresh()` probes all tables, diffs fingerprints
- Updates shared KV stamp
- Invalidates page cache via data version change

## Performance

| Metric | Value |
|--------|-------|
| Report rows (max) | ~60,000 (transactions_report) |
| Spool write | ~12ms / 60k rows |
| Render splice | ~3ms / 60k rows |
| Totals pass | ~5,400ms for all 14 reports |
| Prelude parse | Once per process |

**Two-pass totals cost:** Within noise of bare `COUNT(*)` (5,401ms vs 5,320ms) — same CTEs, no row materialization.

## Legacy Parity

- **Reference:** `compute/views.js` (retired, moved to `tools/_src/legacy-views.js`)
- **Verification:** `tools/verify-prelude.mjs` — compares prelude CTEs against JS views
- **Known gaps:** Legacy SQL views differ from JS views (`legacy-sql-views-differ-from-js-views`)
- **Parity gate:** Functional, not visual (`parity-is-functional-not-visual`)

## Debugging Reports

### Bench Commands
```bash
# Row spool baseline
/tools/bench/spool?arm=rows&report=profit

# Totals statement
/tools/bench/spool?arm=totals&report=profit

# Full page render
/tools/bench/spool?arm=page&report=profit
```

### Inspect Spool
```javascript
// In route or console
const handle = await spoolRows('profit', {}, 10);
const rows = await kvTakeJSONL(handle.key);  // Returns parsed JSONL rows
```

### View Composed SQL
```javascript
const { sql, spec } = await sqlFor('profit');
console.log(sql);  // Full composed statement with prelude
```

## Common Patterns

### Filtering by Business Date
```sql
-- In report WHERE clause:
WHERE tr.dated >= date(:from) AND tr.dated <= date(:to)
-- :from/:to bound as TEXT via params()
```

### Party/Area/Section Filters
```sql
-- Via joins in transactions_report:
LEFT JOIN parties pa ON pa.id = tr.party
LEFT JOIN areas ar ON ar.id = pa.area
LEFT JOIN sections se ON se.id = ar.section
WHERE pa.id = :party OR ar.id = :area OR se.id = :section
```

### Invoice Type Filter
```sql
WHERE tr.type = :type  -- 0=purchase, 1=sale, 2=return, 3=difference
```

### Payment Type Filter
```sql
WHERE pv.type = :type  -- 0=sending, 1=recieving, 2=return
```

### Opening Balances (Ledgers)
```json
"totals": {
  "openings": {
    "openingRecievables": ":openingRecievables",
    "openingPayables": ":openingPayables",
    "openingCash": ":openingCash"
  },
  "cents": { ... },
  "derived": {
    "recievable": { "op": "+", "terms": ["openingRecievables", "recieving", "recieved", "recievingReturns"] }
  }
}
```