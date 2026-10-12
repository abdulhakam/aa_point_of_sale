# AA Point of Sale — Developer Documentation: API Reference & Runtime

## TrailBase Host API

The TrailBase host provides the underlying HTTP, database, and job infrastructure. The application guests extend this with custom routes.

### Host Endpoints (Built-in)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/collections/:name/records` | List records |
| GET | `/api/collections/:name/records/:id` | Get record |
| POST | `/api/collections/:name/records` | Create record |
| PATCH | `/api/collections/:name/records/:id` | Update record |
| DELETE | `/api/collections/:name/records/:id` | Delete record |
| POST | `/api/collections/:name/auth-with-password` | Login |
| POST | `/api/collections/:name/auth-refresh` | Refresh token |
| GET | `/api/health` | Health check |

### Application Guest Endpoints (`tb-ah-run-js`)

#### Root & Auth
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Redirects to `/dashboard` (authenticated) or `/login` (anonymous) |
| GET | `/login` | Login page |
| POST | `/api/collections/_user/auth-with-password` | Login (TrailBase built-in) |

#### Scripts & Discovery
| Method | Path | Description |
|--------|------|-------------|
| GET | `/getscripts` | List all `.js` files in `/traildepot/ahscripts` |

#### Table Counts
| Method | Path | Description |
|--------|------|-------------|
| GET | `/count/{table}` | Row count for a table (authenticated, bare identifier only) |

#### File-Based Routes (under `/ahscripts/routes/`)
All application routes are folders under `/ahscripts/routes/` with a `route.js` or `route.ts` file.

**Route Module Exports:**
```javascript
// GET handler
export async function GET(req) { return { html: "..." }; }

// POST handler
export async function POST(req) { return { redirect: "/path" }; }

// Other methods: PUT, PATCH, DELETE
```

**Request Object:**
```javascript
{
  method: "GET",
  path: "/invoices/abc123",
  url: "http://host/invoices/abc123?foo=bar",
  query: "foo=bar",
  body: "...",
  headers: { "content-type": "application/json", ... },
  user: { id: "uuid", email: "user@example.com", username: "user", csrf_token: "" } | null
}
```

**Response Shapes:**
```javascript
// HTML page
{ html: "<html>..." }

// Redirect
{ redirect: "/path", status: 303 }

// Plain text
{ text: "OK", status: 200 }

// Full control
{ body: "...", contentType: "application/json", status: 200, headers: {} }

// JSON (default)
{ any: "value" }
```

## JS Runtime API (Available in Route Modules)

### Global Objects

| Global | Description |
|--------|-------------|
| `sqlite` | Database access (`sqlite.all(sql, params)`, `sqlite.get(sql, params)`, `sqlite.execute(sql, params)`, `sqlite.spool(name, sql, cols, params)`) |
| `kv` | Key-value store (`kv.get(key)`, `kv.set(key, value)`, `kv.delete(key)`) |
| `render` | Template rendering (`render.html(name, context)`, `render.spooled(name, context, spools)`, `render.json(context, spools)`) |
| `fs` | File system (`fs.readFile(path)`, `fs.readdir(path)`, `fs.readDir(path)`) |
| `ids` | ID encoding bridge (`ids.hexToB64(hex)`, `ids.b64ToHex(b64)`) |
| `__AA_APP__` | App bundle with manifests |

### Database API (`sqlite`)

```javascript
// Query all rows
const rows = await sqlite.all('SELECT * FROM invoices WHERE type = ?', [1]);

// Query single row
const row = await sqlite.get('SELECT * FROM invoices WHERE id = unhex(?)', [hexId]);

// Execute (INSERT/UPDATE/DELETE)
await sqlite.execute('UPDATE invoices SET completed = 1 WHERE id = unhex(?)', [hexId]);

// Spool for reports (returns handle)
const handle = await sqlite.spool('report-name', sql, ['col1', 'col2'], params);
// handle = { key: "sql-spool:report-name:123", rows: 100, bytes: 50000, queryMs: 45, writeMs: 12, totalMs: 58 }
```

### KV Store API (`kv`)

```javascript
// Get value (returns Uint8Array or undefined)
const data = await kv.get('my-key');

// Set value (Uint8Array or string)
await kv.set('my-key', new TextEncoder().encode('{"data": 123}'));

// Delete
await kv.delete('my-key');
```

### Rendering API (`render`)

```javascript
// Render template with context (returns HTML string)
const html = await render.html('invoices/entry.html.jinja', { invoice: {...}, parties: [...] });

// Render with spooled rows (rows spliced by host)
const html = await render.spooled('reports/profit.html.jinja', { filters: {...}, totals: {...} }, [
  { field: 'rows', key: handle.key }
]);

// Render JSON with spooled data
const json = await render.json({ result: { totals: {...}, meta: {...} } }, [
  { field: 'result.rows', key: handle.key }
]);
```

### Route Kit (`routeKit` from `A.routeKit`)

Available in route modules via the `A` parameter:

```javascript
// Render a page with app shell
return routeKit.renderRoute(req, {
  active: "invoices",
  title: "Invoice #123",
  template: "invoices/entry.html.jinja"
}, { invoice: {...}, parties: [...] });

// Reference data (parties, items, areas, etc.)
const refs = await routeKit.refs();
// { parties: [...], bookers: [...], areas: [...], sections: [...], companies: [...], items: [...] }

// ID encoding
const b64 = routeKit.hexToB64(hexId);
const hex = routeKit.b64ToHex(b64Id);
const userHex = routeKit.userHex(req);  // Uppercase hex for DB
const userId = routeKit.userId(req);    // Dashed UUID for record API

// Auth
const user = routeKit.userOf(req);      // { name, email } | null
const redirect = routeKit.loginRedirect(req, "/invoices/new");

// Write with auto-invalidation
await routeKit.write(async () => {
  await sqlite.execute('INSERT INTO ...', params);
});

// Query parsing
const filters = routeKit.parsePairs(req.url().query);
const type = routeKit.pick(filters.type, "");
const flag = routeKit.flag(filters.unpaid);  // "on" or ""

// Invoice lease
const state = await A.lifecycle.readState(db, hexId);
const canWrite = state.lease === null || state.lease.user === userHex;
```

### `A` Object (Route Module Parameter)

```javascript
{
  routeKit: { ... },           // Route helpers
  db: sqlite,                  // Database (alias)
  lifecycle: {                 // Invoice lease management
    readState: async (db, hexId) => { lease: { user, device, at } | null },
    acquireLease: async (db, hexId, userHex, device) => void,
    releaseLease: async (db, hexId, userHex) => void
  },
  jobs: {
    reconcile: async (db, { origin, concurrency }) => number  // Returns reconciled count
  },
  service: {
    invalidate: async () => void,                    // Bump data fingerprint
    refresh: async (db) => fingerprintState,         // Probe all tables
    fingerprint: async () => string,                 // Current fingerprint
    dataVersion: async () => number,                 // FNV-1a of fingerprint
    dataVersionIfWarm: async () => number | ""       // Version if memo warm
  }
}
```

### Invoice Lifecycle (`A.lifecycle`)

```javascript
// Read invoice state (includes lease)
const state = await A.lifecycle.readState(db, hexId);
// { lease: { user: "HEX", device: "browser-id", at: 1234567890 } | null }

// Acquire write lease (called by entry/grid routes)
await A.lifecycle.acquireLease(db, hexId, userHex, "device-id");

// Release lease
await A.lifecycle.releaseLease(db, hexId, userHex);
```

### Job Reconciliation (`A.jobs.reconcile`)

```javascript
// Run due queue work
const reconciled = await A.jobs.reconcile(db, { 
  origin: "http://host",      // For fanout
  concurrency: 1              // Parallel workers
});
// Returns number of queue steps reconciled
```

### Service Layer (`A.service`)

```javascript
// Invalidate data fingerprint (called after writes)
await A.service.invalidate();

// Refresh fingerprint (probe all tables)
const state = await A.service.refresh(db);
// { fingerprints: {...}, refreshedAt: 123, lastRefresh: { changed: [...], rebuilt: [] }, build: 5 }

// Get current fingerprint
const fp = await A.service.fingerprint();
// "[[\"invoices\",\"8927:2026-10-11...\"],...]"

// Get data version (FNV-1a hash)
const version = await A.service.dataVersion();
// 1234567890

// Get version if memo is warm (no KV probe)
const version = await A.service.dataVersionIfWarm();
// 1234567890 or ""
```

## Report Engine API (`spoolreports.js`)

```javascript
import { spoolRows, renderPage, jsonPayload, totalsFor, names, parts } from "./spoolreports.js";

// Spooled report rows (returns handle)
const handle = await spoolRows('profit', filters, 100, 0);

// Render report page (rows by address)
const html = await renderPage('profit', 'reports/report.html.jinja', ctx, filters, 100);

// JSON payload for /p/<slug>/data
const json = await jsonPayload('profit', filters, payload, totals, meta);

// Totals (single row, formatted strings)
const totals = await totalsFor('profit', filters);
// { rowCount: 1234, totalSales: "123456.78", ... }

// List all report keys
const reportNames = await names();
// ['dailysale', 'difference', 'itemsales', 'outstanding', 'payments', 'paymentsbycompany', 'productsale', 'profit', 'salesreport', 'stock', 'supplysummary']

// Raw SQL parts for benchmarking
const { file, sql, cols, binds } = await parts('profit', filters);

// Totals statement parts
const { sql, cols, binds } = await totalsParts('profit', filters, false);
```

## Client-Side JavaScript API

### Global Namespaces

| Global | Module | Description |
|--------|--------|-------------|
| `__AA_ENHANCE__` | `app.js` | Re-enhance content after htmx swap |
| `__AA_REFDB__` | `refdb.js` | IndexedDB reference cache |
| `__AA_SETTINGS__` | `settings.js` | Per-browser preferences |
| `__AA_AUTOCOMPLETE__` | `autocomplete.js` | Searchable select enhancement |
| `__AA_INVOICEDB__` | `invoicedb.js` | Invoice number lookup cache |

### `refdb.js` (Reference Cache)

```javascript
// Initialize (called automatically)
await __AA_REFDB__.init();

// Reload from server (after data version change)
await __AA_REFDB__.reload();

// Get reference list
const parties = await __AA_REFDB__.get('parties');
// [{ id: "...", name: "...", type: 0, area: "...", label: "Name - Area - Section" }, ...]

// Hydrate a <select> with options
__AA_REFDB__.hydrateSelect(selectElement, 'parties');

// Apply per-browser preferences (trim invoice picker scope)
__AA_SETTINGS__.apply(containerElement);
```

### `settings.js` (Per-Browser Preferences)

```javascript
// Get settings
const settings = __AA_SETTINGS__.get();
// { invoicePickerScope: "all" | "open", theme: "light" | "dark" }

// Apply to form (trims invoice picker for performance)
__AA_SETTINGS__.apply(formElement);

// Hydrate form with saved values
__AA_SETTINGS__.hydrateForm(formElement);
```

### `invoice-remote.js` (Server-Side Invoice Search)

```javascript
// Automatically enhances pickers with data-invoice-remote
<select data-invoice-remote data-invoice-type="1">
  <!-- Options populated from server search as user types -->
</select>
```

### `print-queue.js` (Browser Print Queue)

```javascript
// Add to queue
__AA_PRINT_QUEUE__.add({ url: '/invoices/abc123/document?print=1', title: 'Invoice #123' });

// Open queue page
__AA_PRINT_QUEUE__.open();

// Print all queued
__AA_PRINT_QUEUE__.printAll();
```

## Web Components (Progressive Enhancement)

| Component | Tag | Description |
|-----------|-----|-------------|
| Date Input | `<aa-date-input>` | Legacy Mantine DateInput look, native `<input type="date">` value |
| Modal | `<aa-modal>` | Centered card dialog with overlay, Escape-to-close |
| Live Time | `<aa-live-time>` | Ticking header clock |
| Money | `<aa-money>` | Normalizes to 2dp; `mode="rate"` preserves stored precision |
| Entity Form | `<aa-entity-form>` | Inline validation, disabled-during-flight, 4xx/5xx surface |
| Flash | `<aa-flash>` | Auto-dismiss success, dismissible error |
| Invoice Entry | `<aa-invoice-entry>` | Item→price fill, line editor |
| Invoice View | `<aa-invoice-view>` | Keyboard console state machine (0/999/000/up) |
| Item Search | `<aa-item-search>` | Advanced item search dialog (000 state) |

All components are **progressive enhancement** — they upgrade existing working markup.

## Hotkeys (`hotkeys.js`)

Global keyboard shortcuts (available on all pages):

| Key | Action |
|-----|--------|
| `?` | Show help overlay |
| `Alt+N` | New invoice |
| `Alt+P` | Print queue |
| `Alt+R` | Refresh data |
| `Escape` | Close modal/dropdown |
| `Enter` | Submit form / Next field |
| `Arrow keys` | Navigate invoice console |

Invoice console specific (in `invoice-view.js`):
- `0` — Open invoice picker
- `999` — New invoice
- `000` — Advanced item search
- `Up/Down` — Navigate lines
- `Enter` — Save line / Next field

## Configuration API

### `app/config/business.json`
```json
{
  "name": "SAMPLE TRADERS",
  "address": "123 Sample Street, Sample City",
  "phone": "000-0000000"
}
```

### `app/config/renderer.json`
```json
{
  "renderer": "component"  // or "in-process"
}
```

### `traildepot/config.textproto`
TrailBase server configuration (ports, auth, etc.).

## Error Handling

### HTTP Error Responses

```javascript
// Route returns error
return { text: "Not found", status: 404 };

// Or throw (caught by wildcard_handler)
throw new Error("Database error");  // → 500
```

### Common Error Codes

| Code | Meaning |
|------|---------|
| 401 | Unauthenticated (login required) |
| 403 | Forbidden (e.g., invoice lease held by another) |
| 404 | No route folder / Record not found |
| 409 | Conflict (invoice locked by another device) |
| 500 | Internal error (SQL, render, etc.) |

### Invoice Lock Response (409)
```json
{
  "error": "locked",
  "holder": "another device"
}
```

## Development Workflow

### Adding a New Route

1. Create folder: `/traildepot/runtime/ahscripts/routes/my-route/`
2. Create `route.js` with exports:
```javascript
export async function GET(req) {
  const routeKit = req.A.routeKit;
  const refs = await routeKit.refs();
  return routeKit.renderRoute(req, { active: "reports", title: "My Report" }, { refs });
}
```
3. No restart needed — file watcher picks up changes.

### Adding a Report

1. Create SQL: `/traildepot/runtime/app/reports/sql/reports/myreport.sql`
2. Create page folder: `/traildepot/runtime/app/pages/reports/myreport/`
3. Create `meta.json` with spool block:
```json
{
  "compute": { "report": "myreport" },
  "spool": {
    "sql": "myreport.sql",
    "binds": {},
    "row": ["col1", "col2", "..."],
    "totals": { "cents": { "total": "SUM(amount)" } }
  }
}
```
4. Create `page.html.jinja` (or use shared `reports/report.html.jinja`)

### Running Locally

```bash
# From trailbase/ directory
cargo build --release --target wasm32-wasip2
# Copy WASM files to traildepot/wasm/
# Start TrailBase
./trailbase serve --config traildepot/config.textproto
```

### Testing Tools

| Tool | Purpose |
|------|---------|
| `tools/guest-smoke.mjs` | End-to-end smoke tests |
| `tools/report-parity.mjs` | Compare report output vs legacy |
| `tools/verify-spool-reports.mjs` | Verify spool totals (EXACT/SOUND/CORROBORATED) |
| `tools/route-coverage.mjs` | Check all routes respond |
| `tools/ui-parity-report.mjs` | Visual regression vs legacy |
| `tools/client-cost.mjs` | Measure client-side JS cost |