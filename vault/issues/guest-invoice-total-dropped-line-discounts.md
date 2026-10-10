---
title: "readInvoice dropped per-line discounts from the invoice total"
type: issue
status: fixed
severity: critical
created: 2026-10-10
updated: 2026-10-10
tags: [invoices, money, guest, bug, readInvoice, totals]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[money-is-2dp-everywhere]]", "[[client-side-live-recalculation]]", "[[single-writer-per-invoice]]", "[[full-app-ui-sweep-2026-10-10]]", "[[invoice-console-build-2026-10-10]]"]
---

# readInvoice dropped per-line discounts from the invoice total

**Status:** fixed 2026-10-10 in `runtime/app/lib/invoices.js` (`readInvoice`).

## Symptom

An invoice that carried a **per-line** discount showed two different totals on the same screen. On the
grid, the "Total" stat card read **797.50** while the "Invoice total" card (client-recomputed) read
**731.00**; the invoice list and the print document both said **731.00**. On a 4-invoice depot the
console/dialog for the same sale also read 797.50 if readInvoice's `total` was shown directly.

## Cause

`readInvoice` builds a camelCased line object (`discount1`, `discount2`, `discountRs`, `amount`) but then
passed those objects straight to `invoiceTotals`, whose `lineAmount` reads **snake_case**
`discount_1` / `discount_2` / `discount_rs`. Those fields were `undefined` → treated as 0, so every line
was summed at `price × qty` with no per-line discount, and the header chain ran on that inflated sum:

- correct: 10×70×0.9 = 630, plus 5×30 = 150 → 780; −5% → 741; −Rs 10 → **731.00**
- buggy: 10×70 = 700, plus 150 → 850; −5% → 807.5; −Rs 10 → **797.50**

The invoice list (`LIST_SQL`), the materialised document (`compute/views.js buildInvoiceView`) and the
grid's **client** preview (`app.js lineAmount`) all read snake_case and were right, which is why the
client preview masked the bug on screen — the card it writes (`[data-sum]`) was correct while the
server-rendered card beside it was not.

## Fix and guard

`readInvoice` now projects `{qty, price, discount_1, discount_2, discount_rs}` for `invoiceTotals`.
`tools/invoice-view-check.mjs` PATCHes a line to `qty 5, price 70, discount_1 10` and asserts the
console and the live sheet read **315.00** (not 350.00).

## Note

Invisible until an invoice carried a line-level discount, which the smoke fixtures and the original
grid-preview fixture did not — the reason it survived every existing gate.
