# AA Point of Sale — Developer Guide: Editing Report, Invoice & Receipt Layouts

This guide explains how printing is built and how to change the layout of **reports**, **invoices**, and
**vouchers/receipts**.

## The Core Model: One Artefact, Styled for Paper

There is **no separate print renderer**. The on-screen document and the printed page are the same HTML —
whose only difference is the print stylesheet and the paper size. `?print=1` does not render a different
document; it drops the navigation/action bar and selects a paper size:

- `views/invoices/document.html` — the standalone invoice document
- `views/print/queue.html` — the queued batch, importing the same macro
- Both `{% import 'partials/invoice-sheet.html' as sheetdoc %}` and call `{{ sheetdoc.sheet(sheet) }}`

```
Screen document ─┐
                 ├─→ partials/invoice-sheet.html (macro: sheet(d))  ← THE single layout source
Print queue ─────┘
```

> **Rule:** the sheet body lives in **one macro**. A single print and a queued print cannot drift because
> they render the same macro from the same data shape.

## Paper Sizes

| Value | Use | `@page` |
|-------|-----|---------|
| `a5` | Invoice, voucher/receipt | `size: A5 portrait; margin: 0.5cm 0.9cm 0.9cm 0.9cm` |
| `a4` | Report, ledger | `size: A4 portrait; margin: 10mm` |
| `""` (blank) | Dashboard, screens | printer default, portrait |

### How Paper Is Selected

1. The route sets a **`paper` option** in `renderRoute` (only in print mode):

```typescript
// /invoices/{id}/view
const print = String(query.print ?? "") === "1";
const paper = String(query.paper ?? "") || "a5";
return routeKit.renderRoute(req, {
  user, active: "invoices", title: "Invoice " + sheet.invoiceNo,
  paper: print ? paper : "",          // blank on screen → no print @page applies
  template: "invoices/document.html",
}, { sheet: sheet.data, print, actions /* … */ });
```

2. `renderRoute` puts it on `<body data-paper="a5">` (via the shell context).
3. CSS selects a **named** `@page` through the `page` property:

```css
@media print {
  @page { margin: 10mm; }                       /* default for pages with no data-paper */
  @page a5 { size: A5 portrait; margin: 0.5cm 0.9cm 0.9cm 0.9cm; }
  @page a4 { size: A4 portrait; margin: 10mm; }
  body[data-paper="a5"] { page: a5; }
  body[data-paper="a4"] { page: a4; }
}
```

> **Why named pages:** `@page` is document-scoped and cannot be selected by a body attribute, and two bare
> `@page { size }` rules cascade with the last winning for **every** page — which once made every print
> landscape. Named pages plus the `page` property sidestep that.

`?paper=` overrides the size per link, so a till slip (A5) and a filed A4 copy are one link apart.

---

## Part 1: Editing the Invoice Layout

### Files

| File | Role |
|------|------|
| `views/partials/invoice-sheet.html` | **The layout** — macro `sheet(d)` |
| `views/invoices/document.html` | The page; imports the macro, adds action bar |
| `views/print/queue.html` | Queued batch; imports the same macro |
| `app/lib/invoice-sheet.js` | **The data builder** — `buildSheet` / `buildSheetFresh` → `d` |
| `app/public/css/app.css` | Layout CSS (`[data-invoice-doc] …` + `@media print`) |

### The Two Sides of a Layout Change

A layout edit usually touches **one or both**:

- **Structure** — the macro (`invoice-sheet.html`): which blocks, columns, labels.
- **Values** — the builder (`invoice-sheet.js`): the `d` object the macro renders.

```html
{# invoice-sheet.html — structure #}
<article class="invoice-doc" data-invoice-doc>
  <header class="doc-print-head"> … business header … </header>
  <h3 class="doc-type">{{ d.typeLabel }}</h3>
  <section class="doc-parties"> … Party/Address/Booker/Remarks + boxed Invoice # … </section>
  <table class="data doc-lines"> … line columns … </table>
  <section class="doc-totals"> … TOTAL AMOUNT / DISCOUNT 1/2 / DISCOUNT cash / PAYABLE AMOUNT … </section>
  <footer class="doc-foot"> … Checked By / Delivered By … </footer>
</article>
```

```javascript
// invoice-sheet.js — the data the macro consumes
const data = {
  businessName, businessAddress, businessPhone, typeLabel,
  partyName, partyPhone, partyAddress, bookerName, bookerPhone, remarks,
  invoiceNo, invDate, invTime, dueDate, nowTime, nowDate,
  lines: [{ index, itemName, boxSize, ctn, units, free, unitPrice, ctnPrice, d1Text, d2Text, drsText, total }],
  hasLineDiscounts,
  totals: { totalAmountText, d1Text, d2Text, cashText, payableText },
};
```

### Recipe: Add or Remove a Line Column

1. **Header** — add/adjust `<th>` in the two header rows (note the `colspan`/`rowspan` groups):

```html
<tr>
  <th rowspan="2">#</th><th rowspan="2">ITEM</th><th rowspan="2" class="right">BOX SIZE</th>
  <th colspan="3" class="center">QUANTITY</th>
  <th colspan="2" class="right">PRICES</th>
  {% if d.hasLineDiscounts %}<th colspan="3" class="right">DISCOUNTS</th>{% endif %}
  <th rowspan="2" class="right">TOTAL</th>
</tr>
<tr>
  <th class="right">CTN</th><th class="right">UNTS</th><th class="right">FREE</th>
  <th class="right">UNIT</th><th class="right">CTN</th>
  {% if d.hasLineDiscounts %}<th class="right">1(%)</th><th class="right">2(%)</th><th class="right">IN RS</th>{% endif %}
</tr>
```

2. **Body cell** — add a matching `<td>` in the `{% for l in d.lines %}` loop, and keep the `data-label`
   (used by the mobile-cards layout and harmless on paper).
3. **Value** — add the field in `invoice-sheet.js` (both `buildSheet` **and** `buildSheetFresh`).
4. **Empty-colspan** — update the no-lines row's `colspan` (`12` with discounts, else `9`).
5. **Column widths** — only BOX SIZE and UNTS carry explicit widths (see below).

### Recipe: Change Column Widths

Legacy explicit widths are scoped to the sheet so the voucher table is untouched:

```css
/* Body cells are the stable index (headers have colspans): col 3 = BOX SIZE, col 5 = UNTS. */
[data-invoice-doc] .doc-lines td:nth-child(3),
[data-invoice-doc] .doc-lines th:nth-child(3) { width: 2em; }
[data-invoice-doc] .doc-lines td:nth-child(5),
[data-invoice-doc] .doc-lines th:nth-child(5) { width: 1em; }
```

> **Constraint:** printed invoice column widths must match the legacy system. If you add a column, the
> `nth-child` indices may shift — recount them against the **body** row, not the header (whose colspans
> make its indices differ).

### Recipe: Change the Totals Labels

Labels are legacy literals in the macro; values come from the builder:

```html
<tr><th>TOTAL AMOUNT</th><td class="right"><b>{{ d.totals.totalAmountText }}</b></td></tr>
<tr><th>DISCOUNT 1</th><td class="right">{{ d.totals.d1Text }}</td></tr>
<tr><th>DISCOUNT 2</th><td class="right">{{ d.totals.d2Text }}</td></tr>
<tr><th>DISCOUNT cash</th><td class="right">{{ d.totals.cashText }}</td></tr>
<tr><th>PAYABLE AMOUNT</th><td class="right"><b>{{ d.totals.payableText }}</b></td></tr>
```

```javascript
totals: {
  totalAmountText: A.format.money(doc.total ?? 0),
  d1Text: (Number(doc.d1 ?? 0) || 0).toFixed(2) + "%",
  d2Text: (Number(doc.d2 ?? 0) || 0).toFixed(2) + "%",
  cashText: A.format.money(doc.drs ?? 0),
  payableText: A.format.money(doc.final_total ?? 0),
}
```

> **Money is 2 dp everywhere** (display); the underlying arithmetic is integer paisa (see the Reports
> guide). Use `A.format.money(...)` for amounts — never hand-format.

### Recipe: Change the Business Header / Footer

The header values come from `business.json` (`globalThis.__AA_BUSINESS__`), resolved at build time:

```javascript
// invoice-sheet.js
const biz = globalThis.__AA_BUSINESS__ || { name: "…", address: "…", phone: "…", logo: "" };
```

Edit `app/config/business.json` (values) — the macro already renders `d.businessName/Address/Phone`.
The optional **logo** is `biz.logo` (a URL such as `/static/logo.png`); it reaches the templates as
`businessLogo` via `routeKit.renderRoute` → `http.js` `shellContext`. It is rendered — only when set —
in the invoice sheet's left header cell, the report `print-head`, and the voucher `doc-head`, and is
capped by `.doc-logo` (`max-width: 150px; max-height: 56px`). The user-facing walkthrough is
`docs/user/getting-started.md`, "Set Up Business Information & Logo".

The printed **Checked By / Delivered By** footer is currently hard-coded literals in the macro; edit
`invoice-sheet.html` to change the names/phones, or move them into `business.json` and the builder if
they must be configurable.

### Header and Footer Repeat on Every Page

The `doc-print-head` and `doc-foot` are `position: fixed` for print (offset into the margin); the A5
`@page` margin reserves their band. The line table's header repeats via `display: table-header-group`.

### Printed vs Screen

```css
[data-invoice-doc] .doc-print-head, [data-invoice-doc] .doc-foot { display: none; }   /* screen: hidden */
@media print {
  [data-invoice-doc] .doc-print-head { display: flex; … }                             /* print: shown */
  [data-invoice-doc] .doc-foot       { display: flex; … }
  [data-invoice-doc] .doc-lines thead { display: table-header-group; }
  .btn, .pagebar, .crumbs, .no-print, .report-filter, .filters { display: none !important; }
}
```

Mark any screen-only control `class="no-print"`. The whole `#app-main` action bar uses `pagebar no-print`.

### The Invoice View Also Looks Like the Printed Invoice

The invoice entry/view screens are laid out to mirror the sheet (a project constraint): the entry view
must look like the printed invoice, and the print uses the legacy column widths. Keep new screen columns
and the printed sheet's columns in step.

---

## Part 2: Editing the Report Layout

### Files

| File | Role |
|------|------|
| `views/reports/report.html` | The shared report layout (all spooled reports) |
| `app/lib/report-render.js` | Builds the report context (columns, rows, totals, pager) |
| `app/public/css/app.css` | `.report table.data` + `@media print` A4 rules |
| `pages/<slug>/meta.json` | Per-report `columns`, `totals`, `filters` (data, not layout) |

### How a Report Renders

`views/reports/report.html` iterates the manifest:
- filters from `def.fields` (`partials/filters.html`)
- the table from `tb.simple(columns, rows, mobile, "report-table")` (`partials/table.html`)
- totals from `partials/totals.html`
- a client-side "Find in this report" filter, and an offset pager

### Overridable Blocks

| Block | Purpose |
|-------|---------|
| `report_title` | The heading (defaults to `def.title`) |
| `extra_inputs` | Extra filter inputs inside the filter form |
| `before_table` | Markup between the heading and the table |
| `after_table` | Markup after the table, before totals |

### Recipe: Restyle One Report Without Forking the Template

Give the page a `view` in its manifest pointing at a template that extends the shared one:

```json
{ "view": "reports/my-report.html" }
```

```html
{# app/views/reports/my-report.html #}
{% extends "reports/report.html" %}
{% block report_title %}My Report (custom){% endblock %}
{% block before_table %}<p class="notice">Figures are provisional.</p>{% endblock %}
```

### Recipe: Change Columns / Labels

Columns are **data** in `meta.json`, not markup:

```json
"columns": [
  { "key": "date", "label": "Date" },
  { "key": "invoice_no", "label": "Invoice #", "link": "invoice" },
  { "key": "amountText", "label": "Amount", "right": true }
]
```

`right` → right-aligned; `wrap` → wrapping; `link: "invoice"` → invoice-number link. The `key` must match
a row field produced by the SQL / `report-render.js`.

### Recipe: Print the Report on A4 with Repeating Header

The A4 print rules already do this:

```css
@media print {
  .report table.data thead { display: table-header-group; }   /* header on every page */
  .report table.data tr { break-inside: avoid; }
  body[data-paper="a4"] .report table.data { min-width: 0; font-size: 8.5pt; }
  table.grid { display: none !important; }                    /* never print the editor grid */
}
```

Reports set `paper: "a4"` at their render call. The operator may still pick Landscape in the browser
dialog (a CSS `size` sets the default, it is not a lock).

> **Report constraint:** the printed report carries the business identity (`print-head`) and the active
> filters, so the sheet is the report the operator was looking at.

---

## Part 3: Editing Vouchers / Receipts

### Files

| File | Role |
|------|------|
| `views/cashmemo/voucher.html` | The voucher (receipt) layout |
| `views/cashmemo/vouchers.html` | The voucher list (with a print link) |
| `views/payments/new.html` | The payment entry that produces a voucher |

A voucher is **money that moved with no invoice behind it** (a payment with `invoice IS NULL`). It
renders the payment directly, not an invoice document — so it reuses the shared `.doc-*` CSS but does
**not** carry `data-invoice-doc` (the sheet-only rules must not apply to it).

```html
<article class="invoice-doc" data-voucher>   {# note: data-voucher, not data-invoice-doc #}
  <header class="doc-head"> … business … typeLabel / # / date … </header>
  <section class="doc-parties"> Direction / Party / Paid to </section>
  <table class="doc-lines"> Description | Amount </table>
  <section class="doc-totals"><table class="totals-table"><tr class="doc-grand">…</tr></table></section>
</article>
```

### Editing It

- **Fields**: the template context (`voucher`, `directionText`, `selectedType`, `print`) comes from
  `routes/cashmemo/vouchers/{id}/route.ts`. Add a field there and render it here.
- **CSS**: reuse `.doc-head` / `.doc-parties` / `.doc-lines` / `.doc-totals` from `app.css`. These are
  **shared** with the invoice — if you need a voucher-only tweak, scope it with `[data-voucher]`, never
  by editing the shared rule (that would change the invoice too).
- **Print link**: the list uses `<a href="/cashmemo/vouchers/{{ r.id }}?print=1" data-print>` — `data-print`
  opens the `?print=1` page in a new tab and calls `window.print()` (`app.js` → `enhancePrint`).

### Adding a New Printable Kinds (e.g., a new receipt type)

1. Create the template `views/<area>/<things>.html`, `{% extends 'layout.html' %}`, with an
   `article` carrying a **unique root attribute** (like `data-voucher`) so shared `.doc-*` rules can be
   scoped if needed.
2. Set `paper: "a5"` in the route's `renderRoute` options when `?print=1`.
3. Reuse the `.doc-*` classes; add scoped overrides only under your root attribute.
4. Add a print link with `class="btn" ... data-print` (or a `?print=1` href).

---

## Part 4: The Print Queue

### Files

| File | Role |
|------|------|
| `views/print/index.html` | Picker (type + invoice no) with a live preview `<iframe>` |
| `views/print/queue.html` | The batch: every queued sheet |
| `app/public/js/print-queue.js` | localStorage queue (`print-queue` key) |

The queue is **browser-local** (localStorage), like the legacy. `print-queue.js` syncs queued ids into
`?ids=`; the server renders each with the **same macro**:

```html
{% for s in sheets %}
<div class="pq-doc">
  <p class="pq-doc-remove no-print"> … Remove … </p>
  {{ sheetdoc.sheet(s.data) }}
</div>
{% endfor %}
```

Batching rules (print CSS):

```css
@media print {
  body[data-paper="a5"] .pq-doc + .pq-doc { break-before: page; }  /* one invoice per sheet */
  .pq-doc, .invoice-doc { break-inside: avoid; }
}
```

### Live vs Materialised

Two builders back the sheet, mapped into the **same `d` shape** so one macro renders both:

| Builder | Source | Used by |
|---------|--------|---------|
| `buildSheet(A, id)` | materialised `inv_doc` JSON | `/print`, `/print/queue`, bookmarks |
| `buildSheetFresh(A, id)` | base tables via `invoices.readInvoice` | `/invoices/{id}/view?source=live` (console preview, finish-flow print tab) |

If you change the sheet's data shape, change **both** builders.

---

## Part 5: Date/Time on Documents

`app/lib/dates.js` provides the print helpers used by the builder:

| Helper | Returns | Used for |
|--------|---------|----------|
| `printDate(value)` | e.g. `Apr 11, 2026` | Invoice Date |
| `printTime(value)` | 12-hour local time | Invoice Time |
| `shopNow()` | `{ date, time }` in shop time (PKT) | `PRINT TIME:` band |

Legacy header date/time come from the invoice's **`created`** (not `dated`); `dated` falls back for the
due-date comparison. Keep that source when editing the header.

---

## Editing Checklist

- [ ] Structural changes go in **one** place (`partials/invoice-sheet.html` for the sheet; the shared
      `reports/report.html` for reports).
- [ ] Value changes go in `app/lib/invoice-sheet.js` — **both** `buildSheet` and `buildSheetFresh`.
- [ ] Money via `A.format.money(...)` / existing formatters; never hand-format.
- [ ] Column widths/indices rechecked against the **body** row (headers have colspans).
- [ ] New page sets `paper` in `renderRoute`; screen-only controls marked `no-print`.
- [ ] Root attribute uniqueness preserved (`data-invoice-doc` vs `data-voucher`) so scoped CSS stays scoped.
- [ ] Business identity read from `business.json`, not hard-coded (unless intentionally a literal like the
      signature footer).
- [ ] Compare against the legacy printout (`tools/print-parity-pdf.mjs`; legacy/guest PDFs under
      `legacyforparity/zprintsforparity/`).
- [ ] A template/asset edit may need a **server restart** — the guest caches templates and loaded modules.

## Related Constraints

- Printed **invoice column widths must match the legacy** system.
- The invoice **entry/view must look like the printed invoice** (keyboard-centric, with buttons).
- Reports are parity-**functional**, not pixel-identical — but the print **head/filters** are the
  operator's document and should match the legacy sheet.
- Money is **2 dp** on every printed amount.