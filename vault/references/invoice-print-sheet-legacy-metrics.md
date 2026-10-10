---
title: Invoice print sheet legacy metrics (A5 page, explicit column widths)
type: reference
created: 2026-10-10
tags: [pos, guest, invoice, print, legacy, css]
related_to: ["[[parity-reinstates-the-legacy-look-with-defect-fixes]]", "[[print-queue-is-browser-local-like-legacy]]"]
---

# Invoice print sheet legacy metrics (A5 page, explicit column widths)

Measured off the compiled legacy bundle (`legacyforparity/standalone/.next/...`, modules 79493 and
78993, and `.../app/app/invoices/print/page.js` module 37792) during the invoice-console planning
session, 2026-10-10.

## Page

- **A5 portrait**, margins **`0.5cm 0.9cm 0.9cm 0.9cm`** (`useReactToPrint` `pageStyle`).
- The guest's `@page a5` was `margin: 6mm`; it is now the legacy value
  (`app/public/css/app.css`, `@media print`). A4 is legacy's *report* size, not the invoice; the
  guest keeps `@page a4 { size: A4 portrait; margin: 10mm }` for the A4 copy link.

## Columns

`# | ITEM | BOX SIZE | QUANTITY (CTN / UNTS / FREE) | PRICES (UNIT / CTN) | TOTAL`, with a
**conditional `DISCOUNTS`** group (`1(%) · 2(%) · IN RS`) rendered only when some line carries a
discount — the guest already does this (`hasLineDiscounts`).

- The **only explicit widths** in the legacy bundle are **`BOX SIZE = 2em`** and **`UNTS = 1em`**;
  every other column is auto.
- Applied in `app.css` to the sheet only (`[data-invoice-doc] .doc-lines`), body columns 3 and 5,
  so the cash-memo voucher's shared `.doc-lines` rules are untouched.

## Not verified here

The legacy PDFs (`legacyforparity/zprintsforparity/legacypurchaseinvoice.pdf`,
`guestpurchaseinvoice.pdf`) are the pixel oracle for the auto columns and were **not readable** in the
planning session. The two explicit widths and the page margins are the measured facts; the natural
pixel diff against those PDFs remains to be run.
