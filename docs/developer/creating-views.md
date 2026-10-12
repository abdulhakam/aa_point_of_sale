# AA Point of Sale — Developer Guide: Creating New UI / Views

This guide covers how to add a new screen (page) to the application: a route, a template, optional
client-side enhancement, and (for declarative pages) a manifest.

## The Three Layers

A screen is composed of up to three layers, and you use only the ones you need:

| Layer | File | Required? | Purpose |
|-------|------|-----------|---------|
| **Route** | `ahscripts/routes/<path>/route.ts` | Yes (for non-report pages) | Auth gate, read data, render |
| **Template** | `app/views/<name>.html` | Yes | Jinja2 markup |
| **Manifest** | `app/pages/<slug>/meta.json` | Only for declarative/report pages | Filters, columns, totals |
| **Enhancement** | `app/public/js/…` or a component | No | Progressive JS behavior |

## File Locations

```
trailbase/traildepot/runtime/
├── ahscripts/routes/          # Route folders (URL → module)
│   └── my-screen/route.ts
└── app/
    ├── views/                 # Jinja2 templates
    │   ├── layout.html.jinja        # The shell (blocks: body)
    │   ├── my-screen.html.jinja
    │   └── partials/          # Reusable macros/fragments
    ├── pages/                 # Declarative pages (meta.json + optional page.html.jinja)
    ├── manifests/             # Shared manifests (icons live in views/partials/icons.html.jinja)
    └── public/                # Static assets (css/, js/)
```

---

## Part 1: The Route Module

### File: `ahscripts/routes/<path>/route.ts`

Route files are **TypeScript transpiled by the guest** and wrapped in an **IIFE**. The IIFE is
required: route files share one QuickJS scope per evaluation, so a top-level `const`/`function` name
would redeclare on the next request. Only `globalThis.GET` (or `.POST`, `.PATCH`, `.DELETE`) is
published.

### Minimal GET Route

```typescript
(function () {
  (globalThis as any).GET = async (req: any) => {
    // 1. Build the app bundle (loaded via the host's __AA_LOAD__)
    const A = await (await (globalThis as any).__AA_LOAD__("/app/lib/context.js")).app();
    const routeKit = A.routeKit;
    const db = (globalThis as any).sqlite;

    // 2. Normalise path + apply the AUTH GATE (a folder bypasses the dispatcher's gate)
    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);

    // 3. Read data, then render through the shell
    const refs = await routeKit.refs();
    return routeKit.renderRoute(
      req,
      { user, active: "my-section", title: "My Screen", template: "my-screen.html.jinja" },
      { refs }
    );
  };
})();
```

### The Three Mandatory Steps (recorded in `serving-a-route-from-a-route-folder`)

1. **Apply the auth gate yourself.** The host resolves `req.user` but does not enforce it for route
   folders. Without `userOf`/`loginRedirect` the screen serves anonymous requests.
2. **Build the dispatcher's `req` shape.** The host gives `query` as a raw string and no parsed
   params. Use `routeKit.normalizePath(path)` and `routeKit.parsePairs(query)`.
3. **Wrap in ONE IIFE.** Route files share a single QuickJS scope per evaluation.

### GET With a Path Parameter

```typescript
(function () {
  (globalThis as any).GET = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/app/lib/context.js")).app();
    const routeKit = A.routeKit;

    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);
    const query = routeKit.parsePairs(String(req.query || ""));

    // A `{id}` folder segment arrives unparsed — match it out of the path
    const match = /^\/things\/([^/]+)$/.exec(path);
    if (!match) return { text: "Not found", status: 404 };
    const idB64 = routeKit.decode(match[1]);

    const data = await A.things.read(A, idB64);
    if (!data) return { text: "Not found", status: 404 };

    return routeKit.renderRoute(
      req,
      { user, active: "things", title: "Thing", template: "things/detail.html.jinja" },
      data
    );
  };
})();
```

### A Write (POST) Route

```typescript
(function () {
  (globalThis as any).POST = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/app/lib/context.js")).app();
    const routeKit = A.routeKit;
    const db = (globalThis as any).sqlite;

    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);
    const form = routeKit.parsePairs(String(req.body || ""));

    const match = /^\/things\/([^/]+)\/save$/.exec(path);
    if (!match) return { text: "Not found", status: 404 };
    const idHex = routeKit.b64ToHex(routeKit.decode(match[1]));

    // `routeKit.write` invalidates the report fingerprint on commit. A write that
    // bypasses this MUST call routeKit.invalidate() itself, or reports go stale.
    await routeKit.write(async () => {
      await A.things.save(db, idHex, form);
    });

    // htmx write: re-render the same screen into #app-main. Plain POST 303-redirects,
    // so the form is never broken without JavaScript.
    if (A.http.isFragment(req)) {
      const view = await A.things.view(A, idB64);
      return routeKit.renderRoute(req, { user, ...view.options }, view.data);
    }
    return { redirect: `/things/${idB64}?status=ok&message=Saved`, status: 303 };
  };
})();
```

### Route Folder Conventions

- The **folder path is the URL** (with `_` and `{param}` and `[...rest]` conventions).
- A **folder wins over the `{param}` folder** at its own literal path (literal → `{param}` → `[...rest]`).
- A `/` in a slug is a folder separator: `/reports/ledgers/area` → `reports/ledgers/area/route.ts`.
- The **last segment of a catch-all is only honoured as the LAST segment** — used for static mounts.

### Available Route Globals

| Global | Purpose |
|--------|---------|
| `globalThis.__AA_LOAD__(path)` | Load an `app/lib` module (returns a module object) |
| `globalThis.sqlite` | `sqlite.all/get/execute/spool(query, params)` |
| `globalThis.kv` | `kv.get/set/delete(key)` |
| `globalThis.render` | `render.html/spooled/json(name, context, spools)` |
| `globalThis.fs` | `fs.readFile/readdir(path)` |
| `globalThis.ids` | `ids.b64ToHex/hexToB64(value)` |
| `globalThis.__AA_APP__` | Cached app bundle (after `app()` runs) |

---

## Part 2: Jinja2 Templates

### Base Template: `layout.html.jinja`

Every page extends the shell:

```html
{% extends 'layout.html.jinja' %}
{% import 'partials/icons.html.jinja' as icons %}
{% block body %}
<section class="card">
  <h1 class="page-title">My Screen</h1>
  <!-- content -->
</section>
{% endblock %}
```

The shell provides (`{% block body %}` sits inside it):

| Context var | Purpose |
|-------------|---------|
| `businessName`, `businessAddress`, `businessPhone` | Printed/header identity |
| `user` | `{ name, email }` or null |
| `active` | Nav section highlight |
| `title` | Page title |
| `paper` | Print size (`a5` / `a4` / blank) |
| `fragment` | True when an htmx fragment request (body-only render) |
| `refdbVersion` | Reference-cache version (#meta published out-of-band) |
| `flash` | `{ status, message }` for the toast |

### Blocks Provided by the Shell / Parent

| Block | Where | Purpose |
|-------|-------|---------|
| `body` | `layout.html.jinja` | The page content (the one block both full and fragment modes emit) |
| `extra_inputs` | `reports/report.html.jinja` | Extra filter inputs |
| `report_title` | `reports/report.html.jinja` | Override the report heading |
| `before_table` / `after_table` | `reports/report.html.jinja` | Insert around the table |

### Partials & Macros

```html
{# Import a macro namespace #}
{% import 'partials/table.html.jinja' as tb %}
{% import 'partials/filters.html.jinja' as fl %}
{% import 'partials/icons.html.jinja' as icons %}

{# Use them #}
{{ tb.simple(columns, rows, mobile, "report-table") }}
{{ fl.render_field(field, filters, options) }}
{{ icons.svg('printer', 18) }}
```

| Partial | Provides |
|---------|----------|
| `partials/icons.html.jinja` | `svg(name, size)` — inline SVG icon set |
| `partials/table.html.jinja` | `simple(columns, rows, mobile, id)` — sortable table |
| `partials/filters.html.jinja` | `render_field(field, filters, options)` — one filter control |
| `partials/totals.html.jinja` | Totals groups |
| `partials/entity_fields.html.jinja` | Manifest-driven entity form fields |
| `partials/invoice-sheet.html.jinja` | The printable invoice sheet |
| `partials/topbar.html.jinja`, `partials/nav.html.jinja`, `partials/flash.html.jinja` | Shell fragments |

### Template Context from `renderRoute`

`routeKit.renderRoute(req, options, data)` merges:

```js
{
  appName, businessName, businessAddress, businessPhone,  // from options/business.json
  user, active, title, paper,                             // from options
  fragment: isFragment(req),                              // body-only when htmx
  refdbVersion: await dataVersionIfWarm(),                // client cache version
  ...data                                                 // your per-page context
}
```

### Fragment vs Full Document

The shell emits **only** `{% block body %}` when `fragment` is true (plus an out-of-band meta and a
hidden title marker). This is what htmx swaps into `#app-main`. Never add markup outside `{% block
body %}` that a fragment needs — it will not be rendered in fragment mode.

---

## Part 3: Declarative Pages (`pages/<slug>/meta.json`)

For **data/report pages** you do not write a route at all — a `meta.json` manifest declares the page
and both `/p/<slug>` (JSON) and `/reports/<key>` (server-rendered) read it. **The manifest is the one
page definition**, so a page cannot be defined twice and drift.

### Folder

```
app/pages/my-report/
├── meta.json     # required
└── page.html.jinja     # optional (defaults to the shared report template)
```

### Minimal Manifest

```json
{
  "title": "My Report",
  "hub": { "title": "My Report", "tone": "pink", "icon": "report-money", "order": 30 },
  "filters": [
    { "name": "from", "label": "From", "type": "date", "default": { "source": "payments" } },
    { "name": "to", "label": "To", "type": "date" },
    { "name": "party", "label": "Party", "type": "select", "source": "parties" }
  ],
  "columns": [
    { "key": "date", "label": "Date" },
    { "key": "invoice_no", "label": "Invoice #", "link": "invoice" },
    { "key": "party", "label": "Party" },
    { "key": "amount", "label": "Amount", "right": true }
  ],
  "totals": [
    { "label": "Rows", "key": "rowCount" },
    { "label": "Total", "key": "total_amount" }
  ],
  "compute": { "report": "my-report" },
  "spool": {
    "sql": "my-report.sql",
    "binds": {},
    "row": ["date", "invoice_no", "party", "amount"],
    "totals": { "cents": { "total_amount": "SUM(final_amount)" } }
  }
}
```

### Manifest Field Reference

| Field | Purpose |
|-------|---------|
| `title` | Page heading |
| `template` | Template override (default `page.html.jinja`) |
| `view` | Server-rendered report template override |
| `hub` | Tile in a hub index: `{ title, tone, icon, order, hub: "reports"|"ledgers", target }` |
| `filters` | Declarative filter controls (`name`, `label`, `type`, `source`, `default`) |
| `columns` | Table columns (`key`, `label`, `right`, `wrap`, `cls`, `link`) |
| `totals` | One group of `{ label, key }` or `{ label, join: [...] }` |
| `totalsGroups` | Several totals groups |
| `openings` | `true` when the page needs opening-balance inputs (general ledger) |
| `filtersModal` | Render filters in a modal instead of inline |
| `resetLabel` | Adds a `RESET`/`CLEAR` control to the filter block |
| `compute.report` | Names the spooled report this page presents |
| `spool` | SQL + `row` + `totals` (see the Creating Reports guide) |
| `handlers` | Per-page JS workflows, relative to the page dir (loaded only for it) |
| `requires` | Capability hints for the renderer |
| `needs.tables` | Base tables the page reads (derived from filter sources too) |

### Filter Presets

A `filters`/`columns` entry may be a **string** naming a preset from
`app/manifests/page-presets.json`. An array preset (a date range) splices in; an object preset becomes
one entry. An unknown name is dropped **and logged** (a typo must not become a silently missing
filter).

### Report Pages

Add `compute.report` + a `spool` block (see the **Creating Reports** guide). The page then renders
server-side through `report-render.js` and exposes `/p/<slug>/data` for JSON.

---

## Part 4: Client-Side Enhancement

All client JS is **progressive enhancement** — the page works without it.

### Where to Put It

| Kind of behavior | Where |
|------------------|-------|
| Generic (print, confirm, table filter/sort) | `app.js` (`enhanceContent`) |
| New web component | `app/public/js/components/<name>.js` + a `<script defer>` tag in `layout.html.jinja` |
| Feature-specific | A module in `app/public/js/`, loaded via `layout.html.jinja` |
| Per-declarative-page workflow | `handlers` in the page manifest |

### Adding a Web Component

Web components upgrade markup that already works. Register in `layout.html.jinja` (with `defer`), and keep
the fallback functional.

```javascript
// app/public/js/components/my-widget.js
(function () {
  "use strict";
  class MyWidget extends HTMLElement {
    connectedCallback() {
      // Progressive enhancement: the authored children already work.
      if (this.dataset.upgraded) return;
      this.dataset.upgraded = "1";
      this.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-action]");
        if (btn) this.dispatchEvent(new CustomEvent("my-widget", { bubbles: true, detail: btn.dataset.action }));
      });
    }
  }
  if (!customElements.get("aa-my-widget")) customElements.define("aa-my-widget", MyWidget);
})();
```

```html
<!-- in layout.html.jinja, among the other component scripts -->
<script src="/static/js/components/my-widget.js" defer></script>
```

**Load-order rules** (from `layout.html.jinja`):
- `app.js` first (it listens for `htmx:afterSwap`).
- Components that depend on `autocomplete.js` (e.g. `refdb-create.js`, `invoicedb.js`,
  `invoice-remote.js`) load **after** it.
- `settings.js` and `refdb.js` load **before** `autocomplete.js` so a scope-trimmed picker is what the
  combobox is built from.

### Enhancement Must Re-Run After htmx Swaps

htmx swaps only `#app-main` on a boosted navigation. `app.js` re-runs its content enhancers and calls
`window.__AA_AUTOCOMPLETE__.enhanceAll(target)` / `__AA_INVOICEDB__.enhanceAll(target)` on
`htmx:afterSwap`. If your enhancement attaches listeners to plain elements, **re-run it on the swap**:

```javascript
document.addEventListener("htmx:afterSwap", (e) => {
  enhanceMine(e.detail && e.detail.target ? e.detail.target : document);
});
```

### Announce When Options Change So the Combobox Rebuilds

If you replace a `<select>`'s options from JS, fire `refdb:select` on it — the autocomplete control
listens for that event:

```javascript
select.dispatchEvent(new CustomEvent("refdb:select", { bubbles: true }));
```

### htmx Patterns

| Goal | Attributes |
|------|------------|
| Boosted nav | `<a href="…" hx-boost="true">` (inherited from `.card.hub`) |
| Swap the body | `hx-get="/path" hx-target="#app-main" hx-swap="innerHTML"` |
| Push URL | `hx-push-url="true"` |
| Out-of-band meta | `hx-swap-oob="outerHTML:#aa-refdb-version"` |

A critical gotcha: htmx's own `HX-Request` header is **not in the host's header allowlist**, so the
layout sets `hx-headers='{"X-Requested-With":"XMLHttpRequest"}'` on `<body>`. `isFragment(req)`
accepts either header.

---

## Part 5: Registering in Navigation

### Left Rail

Edit `app/views/partials/nav.html.jinja` to add a rail link, and set matching `active` in your route's
`renderRoute` options (`active: "my-section"`).

### Hub Tile (Reports / Ledgers)

Add a `hub` block to the page manifest; `hubIndex()` in `pages.js` collects them and orders by
`order`. No second list to maintain.

```json
"hub": { "title": "My Report", "tone": "pink", "icon": "report-money", "order": 30 }
```

<a id="icons"></a>
### Icons

Icons live in `app/views/partials/icons.html.jinja` as a `svg(name, size)` macro. Use an existing name or add
one to that map. Tones map to CSS classes (`c-pink-4`, `c-orange-4`, `c-blue`, `c-gray-4`, …).

---

## Part 6: CSS

Append to `app/public/css/app.css`. Tokens live in `theme.css`.

```css
.my-widget { padding: var(--spacing); border-radius: var(--radius); }
[data-theme="dark"] .my-widget { background: var(--color-surface); }
@media print { .my-widget { display: none !important; } }
```

- Use **theme tokens** (`--color-*`, `--spacing`, `--radius`, `--shadow`), never hard-coded values.
- Mark non-printing chrome `no-print`; the print style and `data-paper` handle the rest.
- A page that prints sets `paper` in `renderRoute` options (`"a5"` invoice/voucher, `"a4"` report).

---

## Worked Example: A "Low Stock" Screen (end to end)

### 1. Route — `ahscripts/routes/low-stock/route.ts`

```typescript
(function () {
  (globalThis as any).GET = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/app/lib/context.js")).app();
    const routeKit = A.routeKit;
    const db = (globalThis as any).sqlite;

    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);
    const query = routeKit.parsePairs(String(req.query || ""));
    const threshold = Number(query.threshold || 10) || 10;

    const rows = await db.all(
      'SELECT it.name, COALESCE(SUM(st.qty), 0) AS qty ' +
      'FROM items it LEFT JOIN (SELECT item, SUM(qty) AS qty FROM transactions WHERE deleted = 0 GROUP BY item) st ON st.item = it.id ' +
      'GROUP BY it.id HAVING qty < ? ORDER BY qty ASC',
      [String(threshold)]
    );

    return routeKit.renderRoute(
      req,
      { user, active: "inventory", title: "Low Stock", template: "low-stock.html.jinja" },
      { rows: rows.map((r) => ({ name: r[0], qty: Number(r[1]) || 0 })), threshold }
    );
  };
})();
```

### 2. Template — `app/views/low-stock.html.jinja`

```html
{% extends 'layout.html.jinja' %}
{% block body %}
<section class="card">
  <h1 class="page-title">Low Stock (below {{ threshold }})</h1>
  <form class="filters" method="get" action="/low-stock" hx-get="/low-stock" hx-target="#app-main" hx-swap="innerHTML">
    <label class="field"><span>Threshold</span>
      <input type="number" name="threshold" value="{{ threshold }}"></label>
    <div class="filter-actions"><button class="btn primary" type="submit">APPLY</button></div>
  </form>
  <table class="data-table" data-sortable>
    <thead><tr><th data-sort><span class="th-sort">Item</span></th><th data-sort><span class="th-sort">Qty</span></th></tr></thead>
    <tbody>
      {% for r in rows %}
      <tr><td>{{ r.name }}</td><td class="right">{{ r.qty }}</td></tr>
      {% else %}
      <tr><td class="empty" colspan="2">No items below the threshold.</td></tr>
      {% endfor %}
    </tbody>
  </table>
</section>
{% endblock %}
```

### 3. Nav — add a link in `app/views/partials/nav.html.jinja`

```html
<a class="nav-link" href="/low-stock" title="Low Stock">Low Stock</a>
```

No client JS is needed — table sort/filter and htmx boost come from `app.js` and the shell.

---

## Checklist

- [ ] Route folder created; **auth gate applied** (`userOf` + `loginRedirect`).
- [ ] Route wrapped in **one IIFE**; only `globalThis.GET/POST/…` published.
- [ ] `normalizePath` + `parsePairs` used (never trust the raw host shape).
- [ ] Writes wrapped in `routeKit.write(...)` (invalidates the data fingerprint).
- [ ] Template extends `layout.html.jinja`; content inside `{% block body %}`.
- [ ] `active` matches the nav rail section.
- [ ] Any new client JS re-runs on `htmx:afterSwap`; new component registered + `<script defer>` added.
- [ ] CSS uses theme tokens; print chrome marked `no-print`; `paper` set if it prints.
- [ ] Existing tools still pass (`tools/route-coverage.mjs`, `tools/guest-smoke.mjs`).