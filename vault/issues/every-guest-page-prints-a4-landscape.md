---
title: "Every guest page prints A4 landscape, because @page size is not scoped to the page"
type: issue
status: fixed
severity: medium
created: 2026-10-09
updated: 2026-10-09
tags: [printing, css, app-css, invoice, report, paper, guest, legacy]
related_to: ["[[tb-0021-invoices-cashmemos-printing]]", "[[print-queue-parity-fix-2026-10-08]]", "[[runtime-js-guest-platform]]", "[[reports-and-ledgers]]"]
---

# Every guest page prints A4 landscape, because @page size is not scoped to the page

## FIXED 2026-10-09 — portrait by default, operator chooses landscape in the print dialog

The bare `@page { size }` rules are replaced by **named pages** in
`trailbase/runtime/app/public/css/app.css`, which the `page` property on `<body>` can actually
select:

```css
@media print {
  @page { margin: 10mm; }                 /* default: printer's own paper, portrait */
  @page a5 { size: A5 portrait; margin: 6mm; }
  @page a4 { size: A4 portrait; margin: 10mm; }
  body[data-paper="a5"] { page: a5; }
  body[data-paper="a4"] { page: a4; }
}
```

- **Default is portrait everywhere**, including a page with no `data-paper` (the dashboard), which
  now takes the printer's own paper rather than a forced A4 landscape.
- The **A5 receipt/voucher and A4 report paper sizes are kept** — only the orientation default
  changed (report was `A4 landscape`, now `A4 portrait`, matching legacy).
- The operator gets the **Landscape/Portrait choice in the browser's print dialog**: a CSS `size`
  sets the *default* layout, it is not a lock. This satisfied the request without inventing new UI.

Verified end to end in real headless Chrome (`Page.printToPDF`, `preferCSSPageSize`) against the
**running dev server on `:4000`** (logged in), 2026-10-09:

```text
invoice sheet (?print=1)  data-paper=a5      A5      portrait  (420x595)
print queue               data-paper=a5      A5      portrait  (420x595)
report payments           data-paper=a4      A4      portrait  (595x842)
dashboard (no paper)      data-paper=(none)  Letter  portrait  (612x792)
```

The generated depot copy `trailbase/traildepot/runtime/app/public/css/app.css` was synced to match
(`RUN.BAT` would do this on the next start anyway). Stale "A4 landscape" comments in `http.js` and
`reports/report.html` were corrected.

## The defect (as found)

In the guest, **every** printed page came out A4 landscape, including the A5 till receipt and
voucher that the stylesheet said were portrait, and including pages with no `data-paper` at all
(the dashboard). The legacy stack prints **portrait**: invoices on A5 and reports on A4, both
portrait.

Verified in real headless Chrome (CDP `Page.printToPDF` with `preferCSSPageSize: true`) against the
**exact two `@media print` blocks from `app.css`**:

```text
data-paper=a5    ->  841.9 x 595 pt  landscape   (A5 portrait expected: 419.5 x 595)
data-paper=a4    ->  841.9 x 595 pt  landscape
data-paper=none  ->  841.9 x 595 pt  landscape
```

So the `size: A5 portrait` declaration never takes effect. This is the whole of the "all the prints
are landscape" report — not a printer-driver setting, not a per-route mistake.

## Root cause

The two sizes are written as bare `@page` rules inside two `@media print` blocks:

```css
/* trailbase/runtime/app/public/css/app.css */
@media print {
  body[data-paper="a5"] { font-size: 9.5pt; }      /* the selector only styles the body */
  @page { size: A5 portrait; margin: 6mm; }         /* ...but @page is document-scoped */
}
@media print {
  body[data-paper="a4"] .report table.data { ... }
  @page { size: A4 landscape; margin: 10mm; }        /* later, so it wins for every page */
}
```

`@page` is **not** scoped by a preceding sibling selector, and it cannot be nested inside a style
rule. Both rules apply to the printed document regardless of `data-paper`; the cascade picks the
last one, so **A4 landscape is applied to every page**. The comment above the block ("The page is
chosen by the `data-paper` attribute… so neither is a guess") describes the intent, not the
behaviour: the attribute changes body styles but cannot change the sheet.

## Two separate concerns

1. **A bug (invoice/voucher):** A5 receipt/voucher is meant to be portrait and is not.
2. **A deliberate divergence (report):** the guest sets reports to `A4 landscape` on purpose
   (`app/lib/report-render.js` passes `paper: "a4"`; `app.css` comment says "A4 — a report,
   landscape"), while legacy react-to-print used `@page {size: A4; ...}` = A4 **portrait**. This is
   a real guest-vs-legacy difference regardless of the cascade bug, and is what the user sees on
   report prints even after the scoping is fixed.

## Fix

Use **named pages**, which *can* be selected per element:

```css
@page a5 { size: A5 portrait; margin: 6mm; }
@page a4 { size: A4 landscape; margin: 10mm; }
body[data-paper="a5"] { page: a5; }
body[data-paper="a4"] { page: a4; }
```

(One un-named `@page` for the default margins is fine; there must be no second un-named `size`.)
Then decide explicitly whether reports should follow legacy portrait (A4) or keep landscape — this
is a decision to record, not a silent default.

## Evidence

- `trailbase/runtime/app/public/css/app.css:640-654` — the two `@media print` blocks and their bare
  `@page { size: … }` rules.
- `trailbase/runtime/app/views/layout.html:12-13` — `<body data-paper="{{ paper }}">`.
- `trailbase/runtime/app/lib/report-render.js:232` — reports pass `paper: "a4"`.
- `trailbase/runtime/ahscripts/routes/invoices/{id}/view/route.ts:26,38` and
  `.../cashmemo/vouchers/{id}/route.ts:27` — invoices/vouchers pass `paper` defaulting to `a5`.
- Legacy (compiled, `legacyforparity/standalone/.next/server/...`): invoice print uses
  `pageStyle:"@page {size: A5; …}"`, reports use `pageStyle:"@page {size: A4; …}"` — both portrait.
- Headless-Chrome measurement above (2026-10-09); reproduction is two static `@page` rules, so it is
  independent of the running depot.

## Status

**Fixed 2026-10-09** (see the section at the top). `print-queue-check.mjs` asserts `data-paper="a5"`
but not the resulting sheet size, which is why it passed 14/14 while the bug was live — the check
tested the attribute, not the page. A future `print-orient` check should assert the `MediaBox` of
the printed page, not the body attribute.
