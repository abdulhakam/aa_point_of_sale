---
title: "Invoice print sheet put the TOTAL column before the DISCOUNTS columns"
type: issue
status: fixed
severity: minor
created: 2026-10-11
updated: 2026-10-11
tags: [invoices, print, guest, parity, columns, invoice-sheet]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[invoice-print-sheet-legacy-metrics]]", "[[guest-invoice-print-dropped-the-party-and-booker-names]]", "[[print-queue-is-browser-local-like-legacy]]", "[[parity-reinstates-the-legacy-look-with-defect-fixes]]"]
---

# Invoice print sheet put the TOTAL column before the DISCOUNTS columns

**Status:** fixed 2026-10-11 (`app/views/partials/invoice-sheet.html`). Reported by the operator while
reading a printed invoice: "the totals in column is printed before the discounts columns, which is
causing problems in understanding the invoice."

## Symptom

On any invoice whose lines carry a discount, the printed sheet (single view, `/print` preview and the
`/print/queue` batch — all render the one macro) ordered the line table:

```
# | ITEM | BOX SIZE | QUANTITY (CTN/UNTS/FREE) | PRICES (UNIT/CTN) | TOTAL | DISCOUNTS (1% 2% IN RS)
```

so a reader saw the discounted `TOTAL` **before** the discount figures that produced it, and read the
`TOTAL` as pre-discount.

## Cause

The guest macro was authored with the conditional `DISCOUNTS` group as the **last** group and `TOTAL`
before it. The legacy sheet does the opposite: `TOTAL` is the **last** column (a `rowSpan=2` header)
and the `DISCOUNTS` group precedes it.

## Evidence

Measured off the compiled legacy bundle, not inferred. The header-row order in the legacy print
component (`legacyforparity/standalone/.next/static/chunks/9493-90e6e323f9657a6f.js`, and the
server copy `.next/server/chunks/2727.js`) is:

```
# | ITEM | BOX SIZE | QUANTITY(colSpan 3) | PRICES(colSpan 2) | [DISCOUNTS(colSpan y)] | TOTAL(rowSpan 2)
```

and each body row emits `... UNIT, CTN, [discount_1, discount_2, discount_rs], total` — `total` is
the **last** cell. The `DISCOUNTS` group is rendered only when some line carries a discount
(`E/L/q` in the minified chunk), matching the guest's `hasLineDiscounts`.

The vault reference [[invoice-print-sheet-legacy-metrics]] listed the columns as
`... PRICES (UNIT / CTN) | TOTAL` "with a conditional DISCOUNTS group", which reads as DISCOUNTS
*after* TOTAL. That phrasing was the source of the mistake and is corrected in the same change.

## Fix

`app/views/partials/invoice-sheet.html`: the header `TOTAL` `<th>` and the body `TOTAL` `<td>` were
moved to **after** the conditional `DISCOUNTS` group, in both header rows and every body row, so the
order is `... PRICES | [DISCOUNTS] | TOTAL`. The explicit column widths (`BOX SIZE = 2em`,
   `UNTS = 1em`) are applied to body columns 3 and 5, which the reorder does not move, so `app.css` is
   unchanged.

**Verified live 2026-10-11** on a depot rebuilt from the legacy database: invoice #2 (line discounts)
renders the header as `… PRICES | DISCOUNTS | TOTAL`, DISCOUNTS before TOTAL, matching legacy. See
[[ui-parity-run-2026-10-11]].

## Not verified

No automated gate asserts the line-table column order; this was found by reading the sheet. A
print-sheet structural check would catch a future reorder.
