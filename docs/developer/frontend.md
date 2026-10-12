# AA Point of Sale — Developer Documentation: Frontend Components & Views

## Template System

**Engine:** Jinja2 via minijinja (Rust) — exposed via `tb-ah-render-jinja` WASM component
**Layout:** Single `layout.html.jinja` with `{% block body %}` for page content
**Rendering:** Server-side with htmx fragment support

### Layout Structure (`views/layout.html.jinja`)

```html
{# Full document shell #}
{% if not fragment %}<!doctype html>
<html>...<head>...</head>
<body data-paper="{{ paper }}" hx-headers='{"X-Requested-With":"XMLHttpRequest"}'>
  <div id="aa-loading" class="aa-loading">...</div>
  <div class="appshell">
    {% if user %}{% include 'partials/topbar.html.jinja' %}{% endif %}
    <div class="appbody">
      {% if user %}{% include 'partials/nav.html.jinja' %}{% endif %}
      <main id="app-main" class="main{% if not user %} main-anon{% endif %}">
{% endif %}{# fragment starts here #}

{% if fragment %}<div hidden data-aa-title="{{ title }} · {{ appName }}"></div>{% endif %}
{% if fragment %}<meta name="aa-refdb-version" content="{{ refdbVersion }}" hx-swap-oob="outerHTML:#aa-refdb-version">{% endif %}
{% include 'partials/flash.html.jinja' %}
{% block body %}{% endblock %}

{% if not fragment %}</main>{% if user %}</div>{% endif %}</div>
<script src="/static/js/htmx.min.js" defer></script>
<script src="/static/js/app.js" defer></script>
<script src="/static/js/pagecache.js" defer></script>
<script src="/static/js/print-queue.js" defer></script>
<script src="/static/js/components/date-input.js" defer></script>
<script src="/static/js/components/modal.js" defer></script>
<script src="/static/js/components/live-time.js" defer></script>
<script src="/static/js/components/money.js" defer></script>
<script src="/static/js/components/entity-form.js" defer></script>
<script src="/static/js/components/flash.js" defer></script>
<script src="/static/js/components/invoice-entry.js" defer></script>
<script src="/static/js/components/invoice-view.js" defer></script>
<script src="/static/js/components/item-search.js" defer></script>
<script src="/static/js/hotkeys.js" defer></script>
<script src="/static/js/settings.js" defer></script>
<script src="/static/js/refdb.js" defer></script>
<script src="/static/js/autocomplete.js" defer></script>
<script src="/static/js/refdb-create.js" defer></script>
<script src="/static/js/invoicedb.js" defer></script>
<script src="/static/js/invoice-remote.js" defer></script>
<script src="/static/js/supply-summary.js" defer></script>
</body></html>{% endif %}
```

### Key Layout Features

| Feature | Implementation |
|---------|----------------|
| **htmx boost** | `hx-headers` on `<body>` sends `X-Requested-With` on all htmx requests |
| **Fragment rendering** | `fragment` context var → emits only `{% block body %}` + OOB meta |
| **Page title sync** | Hidden `data-aa-title` in fragment → `app.js` updates `document.title` |
| **RefDB version sync** | OOB meta tag updates `#aa-refdb-version` → triggers `refdb.reload()` |
| **Loading indicator** | `#aa-loading` outside `#app-main` persists across swaps |
| **Print media** | `data-paper="a5"|"a4"` on `<body>` selects print stylesheet |

## Page Templates

### Invoice Templates (`views/invoices/`)

| Template | Route | Purpose |
|----------|-------|---------|
| `index.html` | `/invoices` | Invoice list with filters, pagination, totals |
| `entry.html.jinja` | `/invoices/{id}/entry` | Keyboard-centric invoice entry (header + lines) |
| `grid.html.jinja` | `/invoices/{id}/grid` | Spreadsheet-style line editor |
| `console.html.jinja` | `/invoices/new?type=N` | Unified invoice console (picker + editor) |
| `document.html.jinja` | `/invoices/{id}/document` | Printable invoice document (A5) |
| `all.html.jinja` | `/invoices/all` | All invoices (admin) |

### Report Templates (`views/reports/`)

| Template | Route | Purpose |
|----------|-------|---------|
| `index.html` | `/reports` | Report hub with 4 card types |
| `report.html.jinja` | `/reports/{slug}` | Generic spooled report (table + totals) |
| `supplysummary.html.jinja` | `/reports/supplysummary` | Supply summary with invoice picker |

### Ledger Templates (`views/reports/ledgers/`)

| Template | Route | Purpose |
|----------|-------|---------|
| `general.html.jinja` | `/reports/ledgers/general` | General ledger with openings |
| `index.html` | `/reports/ledgers` | Ledger hub |

### Management Templates (`views/management/`)

| Template | Route | Purpose |
|----------|-------|---------|
| `index.html` | `/management` | Management hub (entity cards) |
| `list.html.jinja` | `/management/{entity}` | Entity list with search, sort, create/edit |

### Other Templates

| Template | Route | Purpose |
|----------|-------|---------|
| `views/auth/login.html.jinja` | `/login` | Login form |
| `views/dashboard/index.html.jinja` | `/dashboard` | Dashboard with quick stats |
| `views/inventory/index.html.jinja` | `/inventory` | Stock overview |
| `views/cashmoe/*.html` | `/cashmemo/*` | Cash memo (DA, vouchers, expenses) |
| `views/payments/*.html` | `/payments/*` | Payment entry/list |
| `views/settings/index.html.jinja` | `/settings` | User preferences |
| `views/print/*.html` | `/print/*` | Print queue, print preview |

## Partial Templates (`views/partials/`)

| Partial | Purpose |
|---------|---------|
| `topbar.html.jinja` | Header with business name, user, clock, print queue link |
| `nav.html.jinja` | Left navigation rail (Invoices, Reports, Ledgers, Management, etc.) |
| `flash.html.jinja` | Toast notifications (success/error) |
| `nav.html.jinja` | Navigation rail |
| `table.html.jinja` | Reusable table with sortable columns |
| `entity_fields.html.jinja` | Dynamic form fields from entity manifest |
| `filters.html.jinja` | Filter form for reports/invoice list |
| `invoice-sheet.html.jinja` | Printable invoice sheet (used in document & print) |
| `quick-create.html.jinja` | "Create..." panel for parties, items, etc. |
| `report_meta.html` | Report filter bar with date range, party, etc. |
| `totals.html.jinja` | Totals display component |

## Web Components (Progressive Enhancement)

All components in `public/js/components/` are **progressive enhancement** — they upgrade existing working markup.

### Component Loading Order (from `layout.html.jinja`)

```html
<!-- 1. Core utilities -->
<script src="/static/js/htmx.min.js" defer></script>
<script src="/static/js/app.js" defer></script>

<!-- 2. Caches & queues -->
<script src="/static/js/pagecache.js" defer></script>
<script src="/static/js/print-queue.js" defer></script>

<!-- 3. Leaf components (no dependencies) -->
<script src="/static/js/components/date-input.js" defer></script>
<script src="/static/js/components/modal.js" defer></script>
<script src="/static/js/components/live-time.js" defer></script>
<script src="/static/js/components/money.js" defer></script>

<!-- 4. Form components -->
<script src="/static/js/components/entity-form.js" defer></script>
<script src="/static/js/components/flash.js" defer></script>

<!-- 5. Invoice-specific -->
<script src="/static/js/components/invoice-entry.js" defer></script>
<script src="/static/js/components/invoice-view.js" defer></script>
<script src="/static/js/components/item-search.js" defer></script>

<!-- 6. Cross-cutting -->
<script src="/static/js/hotkeys.js" defer></script>

<!-- 7. Settings & reference data (must load before autocomplete) -->
<script src="/static/js/settings.js" defer></script>
<script src("/static/js/refdb.js" defer></script>

<!-- 8. Autocomplete (depends on refdb) -->
<script src="/static/js/autocomplete.js" defer></script>

<!-- 9. Quick-create (depends on autocomplete) -->
<script src="/static/js/refdb-create.js" defer></script>

<!-- 10. Invoice lookup (depends on autocomplete) -->
<script src="/static/js/invoicedb.js" defer></script>

<!-- 11. Server-side invoice search (depends on autocomplete) -->
<script src="/static/js/invoice-remote.js" defer></script>

<!-- 12. Supply summary -->
<script src="/static/js/supply-summary.js" defer></script>
```

### Component Details

#### `aa-date-input` (`date-input.js`)
```html
<aa-date-input>
  <input type="date" name="dated" value="2026-10-12">
</aa-date-input>
```
- Wraps native `<input type="date">`
- Removes browser calendar glyph (legacy Mantine look)
- Submits native date value

#### `aa-modal` (`modal.js`)
```html
<aa-modal>
  <div class="modal-header"><h3>Title</h3><button class="modal-close">×</button></div>
  <div class="modal-body">Content</div>
  <div class="modal-footer">Actions</div>
</aa-modal>
```
- Centered card with overlay
- Escape-to-close
- Focus trap
- Degrades to inline content if not upgraded

#### `aa-live-time` (`live-time.js`)
```html
<aa-live-time class="header-clock"></aa-live-time>
```
- Updates every second
- Slot in topbar renders nothing until upgrade

#### `aa-money` (`money.js`)
```html
<!-- Amount (2dp always) -->
<aa-money mode="amount">1234.5</aa-money>  →  "1,234.50"

<!-- Rate (preserves stored precision) -->
<aa-money mode="rate">114.583333</aa-money>  →  "114.583333"
<input type="number" step="any" value="114.583333">
```
- `mode="amount"`: Normalizes to 2dp for display
- `mode="rate"`: Keeps full precision, sets `step="any"` on inputs
- Prevents ledger-rewriting defect (rounding stored price on edit)

#### `aa-entity-form` (`entity-form.js`)
```html
<form is="aa-entity-form" action="/management/parties" method="POST">
  <!-- Server-rendered fields -->
  <input name="name" required>
  <select name="area">...</select>
</form>
```
- Inline required-field messages
- Disables during flight
- Surfaces 4xx/5xx errors inline (htmx swap would discard them)

#### `aa-flash` (`flash.js`)
```html
<div class="flash flash--success" is="aa-flash">Saved!</div>
<div class="flash flash--error" is="aa-flash">Failed: {{ error }}</div>
```
- Auto-dismiss success (3s)
- Dismiss button on error
- No markup change from server

#### `aa-invoice-entry` (`invoice-entry.js`)
```html
<aa-invoice-entry data-invoice-id="...">
  <!-- Item select fills price/cost from item master -->
  <select name="item" data-price="123.45" data-cost="100.00">...</select>
  <input name="price" type="number" step="any">
  <input name="cost_price" type="number" step="any">
</aa-invoice-entry>
```
- Consumes server descriptor
- Item→price/cost fill (operator's number wins)
- Integrates with grid recalculation

#### `aa-invoice-view` + `aa-item-search` (`invoice-view.js`, `item-search.js`)
**Keyboard Invoice Console State Machine:**

| State | Trigger | Behavior |
|-------|---------|----------|
| **0** (Picker) | `0` key | Open invoice number picker |
| **999** (New) | `999` keys | Create new invoice |
| **000** (Search) | `000` keys | Open advanced item search dialog |
| **Up/Down** | Arrow keys | Navigate header/line fields |
| **Enter** | Enter key | Save field / Next field / Submit line |

- Progressive enhancement over working form
- Focus management across header + line fields
- Server-rendered fallback works without JS

#### `aa-autocomplete` (`autocomplete.js`)
```html
<select name="party" data-searchable data-source="parties">
  <option value="...">Party Name</option>
</select>
```
- Replaces long `<select>` with searchable combobox
- Keeps native `<select>` in form (works without JS)
- `data-source` references `refdb` cache key
- Fires `refdb:select` when options change

## Client-Side Modules

### `app.js` — Core Enhancements
- **Print buttons:** `[data-print]` opens print dialog + `?print=1` page
- **Confirm dialogs:** `form[data-confirm]` shows confirm on submit
- **Table filter:** `[data-table-filter]` client-side row filtering
- **Table sort:** `table[data-sortable]` click headers to sort
- **Invoice grid:** Spreadsheet recalculation (see below)
- **Job indicator:** Polls `/reports/status` (gray/blue/red/yellow dot)
- **htmx afterSwap:** Re-enhances swapped content, syncs refdb version

### Invoice Grid Recalculation (`app.js` → `enhanceGrid`)

**Per-row cache** built once — avoids 259 DOM queries per keystroke:
```javascript
var rows = [...].map(row => ({
  cells: { item, qty, price, cost_price, discount_1, discount_2, discount_rs, scheme },
  amountCell: row.querySelector("[data-amount]"),
  qtyCell: row.querySelector("[data-qty-display]"),
  priceBaseline: row.querySelector("[data-price-baseline]"),
  net: 0
}));
```

**Three recalculation entry points:**
1. **Line cell change** → `recalcLine(entry)` → one row + total
2. **Header discount % (d1/d2)** → `recalcAll()` → all rows + total
3. **Header discount Rs** → `recalcTotals()` → total only

**Money arithmetic (mirrored from `invoice-lifecycle.js`):**
```javascript
var EPSILON = Number.EPSILON;
var PAISA = 100;

function round2(v) { return Math.round((Number(v) + EPSILON) * PAISA) / PAISA; }

function lineAmount(line) {
  return line.price * line.qty * (1 - line.discount_1/100) * (1 - line.discount_2/100) - line.discount_rs;
}

function lineTotal(line) { return round2(lineAmount(line)); }

function lineNet(line, invD1, invD2) {
  return round2(lineAmount(line) * (1 - invD1/100) * (1 - invD2/100));
}

function invoiceTotals(lines, header) {
  var sum = lines.reduce((s, l) => s + lineTotal(l), 0);
  sum = round2(sum);
  var afterD1 = sum - sum * header.discount_1 / 100;
  var unrounded = afterD1 - afterD1 * header.discount_2 / 100;
  return { lineSum: sum, total: round2(unrounded - header.discount_rs) };
}
```

### `pagecache.js` — Client Page Cache
- **IndexedDB** cache of rendered fragments
- Key: `(codeRevision, dataVersion, url)`
- On boosted nav: check cache → serve instantly + fire `htmx:afterSwap` → background fetch
- Additive & fail-safe: miss = normal htmx request

### `refdb.js` — Reference Data Cache
- **IndexedDB** cache of reference lists (parties, items, areas, etc.)
- Keyed by `dataVersion` from page meta
- On version change: `reload()` fetches fresh lists
- `hydrateSelect(select, 'parties')` populates options
- Fires `refdb:select` event for autocomplete to react

### `settings.js` — Per-Browser Preferences
- `localStorage` key: `aa:settings`
- Settings: `invoicePickerScope` ("all" | "open"), `theme`
- `apply(container)` — trims invoice picker options per scope
- `hydrateForm(form)` — restores saved values

### `invoicedb.js` — Invoice Number Lookup
- IndexedDB cache of invoice numbers for picker
- Lazy-loaded (only on pages with invoice picker)
- Populates combobox via `refdb:select` event

### `invoice-remote.js` — Server-Side Invoice Search
```html
<select data-invoice-remote data-invoice-type="1">
  <!-- As user types, fetches /invoices/remote?type=1&q=... -->
  <!-- Replaces options, fires refdb:select -->
</select>
```
- Server-side search for 12,000+ invoices
- Avoids shipping all invoices to client

### `autocomplete.js` — Searchable Selects
- Enhances `<select data-searchable data-source="...">`
- Preserves native `<select>` for form submission
- Listens for `refdb:select` to rebuild combobox
- Escape-to-close gesture

### `hotkeys.js` — Keyboard Shortcuts
Global `keydown` listener with `?` help overlay.
Context-aware: invoice console has its own state machine.

### `print-queue.js` — Browser Print Queue
- `localStorage` key: `print-queue`
- "Add to Print Queue" on invoice sheet
- Queue rail at `/print`
- Opens each in new tab → `window.print()`

## CSS Architecture

### `public/css/theme.css` — Design Tokens
```css
:root {
  --color-primary: #1a73e8;
  --color-success: #1e8e3e;
  --color-error: #d93025;
  --color-warning: #f9ab00;
  --color-bg: #ffffff;
  --color-surface: #f8f9fa;
  --color-text: #202124;
  --color-border: #dadce0;
  --font-family: system-ui, -apple-system, sans-serif;
  --spacing: 8px;
  --radius: 4px;
  --shadow: 0 1px 3px rgba(0,0,0,0.1);
}
[data-theme="dark"] { ... }
```

### `public/css/app.css` — Components & Layout
- **App shell:** `.appshell`, `.appbody`, `.main`, `.nav-rail`
- **Tables:** `.data-table`, sortable headers, filter row
- **Forms:** `.form-field`, `.form-actions`, inline errors
- **Invoice grid:** `.grid-toolbar`, `.grid-table`, `[data-amount]`, `[data-qty-display]`
- **Invoice console:** `.console-picker`, `.console-header`, `.console-lines`
- **Print styles:** `@media print` with `data-paper="a5"|"a4"`
- **Web component styles:** `aa-modal`, `aa-date-input`, `aa-money`, etc.
- **htmx states:** `.htmx-request`, `.htmx-swapping`

## htmx Integration

### Fragment Request Detection (`app/lib/http.js`)
```javascript
export function isFragment(req) {
  const headers = req.headers || {};
  const hx = headers["hx-request"] === "true";
  const xrw = headers["x-requested-with"]?.length > 0;
  return hx || xrw;
}
```
- htmx sends `HX-Request: true` (NOT in host allowlist)
- `X-Requested-With: XMLHttpRequest` IS in allowlist (via `hx-headers` on `<body>`)
- Both accepted for compatibility

### Boosted Navigation
```html
<a href="/invoices/abc123/grid" hx-boost="true">Grid</a>
```
- htmx fetches as fragment → swaps `#app-main`
- Shell (topbar, nav, scripts) NOT re-rendered
- `app.js` re-enhances via `htmx:afterSwap`

### Form Submission
```html
<form hx-post="/invoices/abc123/lines" hx-target="#app-main" hx-swap="innerHTML">
```
- Submits via htmx
- Server returns fragment (same template)
- Swaps into `#app-main`

### Out-of-Band Swaps
```html
<meta name="aa-refdb-version" content="123" hx-swap-oob="outerHTML:#aa-refdb-version">
<div hidden data-aa-title="Invoice #123 · SAMPLE TRADERS"></div>
```
- Updates head meta without full reload
- Updates document title

## Adding a New Page

1. **Create route folder:** `traildepot/runtime/ahscripts/routes/my-page/route.js`
2. **Create template:** `traildepot/runtime/app/views/my-page.html.jinja`
3. **Add to nav:** Edit `views/partials/nav.html.jinja`
4. **Register entity (if management):** Add to `app/manifests/entities.json`

### Route Module Template
```javascript
import { routeKit } from "app/lib/route-kit.js";

export async function GET(req) {
  const A = req.A;  // Provided by guest
  const refs = await A.routeKit.refs();
  
  return A.routeKit.renderRoute(req, {
    active: "reports",        // Nav section
    title: "My Report",
    template: "my-page.html.jinja"  // Template name
  }, { refs, customData: "..." });
}

export async function POST(req) {
  const A = req.A;
  return A.routeKit.write(async () => {
    const form = A.routeKit.parsePairs(req.body);
    await A.db.execute("INSERT INTO ...", params);
  });
}
```

## Print Stylesheets

### Paper Sizes (via `data-paper` on `<body>`)

| Value | Template | Use Case |
|-------|----------|----------|
| `a5` | Invoice document, vouchers | 148mm × 210mm |
| `a4` | Reports, ledgers | 210mm × 297mm |
| (none) | Dashboard, forms | No print constraints |

### Print CSS (`app.css` → `@media print`)
```css
@media print {
  @page { size: a5 portrait; margin: 10mm; }
  body[data-paper="a4"] { @page { size: a4 portrait; } }
  
  .no-print, .appshell, #aa-loading, script { display: none !important; }
  #app-main { display: block !important; }
  .invoice-sheet { page-break-inside: avoid; }
}
```

## Accessibility

- **Semantic HTML:** `<main>`, `<nav>`, `<header>`, `<form>`, `<table>`
- **ARIA:** `role="status" aria-live="polite"` on loading indicator
- **Focus management:** `aa-modal` traps focus, `invoice-view` walks fields
- **Keyboard:** All interactive elements reachable via Tab/Enter/Arrows
- **Color contrast:** Theme tokens ensure WCAG AA

## Performance Notes

| Optimization | Implementation |
|--------------|----------------|
| **Fragment rendering** | Shell rendered once; only `#app-main` swaps |
| **Page cache** | IndexedDB caches fragments; instant back/forward |
| **RefDB cache** | Reference lists cached; sync on data version change |
| **Per-row grid cache** | 259 DOM queries → 1 per keystroke |
| **Spool reports** | 60k rows never enter QuickJS |
| **Lazy components** | `invoicedb.js`, `supply-summary.js` load only when needed |
| **Deferred scripts** | All `<script defer>` — non-blocking |