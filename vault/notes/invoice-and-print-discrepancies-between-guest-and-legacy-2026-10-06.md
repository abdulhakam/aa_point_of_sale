---
$schema: "./notes.schema.json"
title: "Invoice and print discrepancies between guest and legacy, 2026-10-06"
type: note
status: active
created: 2026-10-06
tags: [invoice, print, parity, visual, guest, legacy]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[parity-is-functional-not-visual]]", "[[guest-invoice-lifecycle]]", "[[guest-invoice-print-dropped-the-party-and-booker-names]]", "[[tb-0023-guest-feature-parity]]", "[[route-map]]"]
---

# Invoice and print discrepancies between guest and legacy, 2026-10-06

Both apps were loaded live at the same viewport against the same imported data and compared screen by
screen — headings, controls, table columns and text — with invoice **#8606** used for the view/print
comparison. This records what differs, so a reader does not have to re-run it.

## Reports hub — match

Same eleven tiles, same labels, same order (Unified Payments, Item Sales, Sales, Payments By Company,
Ledgers, Stock, Profit, Difference, Outstanding Payments, Product Sale, Daily Sale).

## Invoices landing — different information architecture

- **Guest** `/invoices`: one unified list — filters (Type All/Purchase/Sale/Return/Difference, From/To,
  Party) over a table `Inv # | Type | Date | Total | Paid | Balance | Status`, **capped at 300 rows**.
- **Legacy** `/app/invoices`: a **tile hub** — Purchase / Sale / Print Invoices / Return / Difference,
  no list and no filters.

## Invoice entry / view — different layout

- **Guest** `/invoices/<id>/grid`: tabs **Header / Lines / Payments**; line columns
  `Item | Qty | Qty as | Price | D1 % | D2 % | Disc Rs | Free | Amount | Actions`; `+ PAYMENT`,
  `Save header`, `SAVE LINES`; totals `+ PAYMENT / TOTAL / PAID / BALANCE`.
- **Legacy** `/app/invoices/sale`: a flat editable grid, columns
  `SALE INVOICE | INVOICE NO | INVOICE DATE | BOOKER | CUSTOMER | USER`, plus `Create`.

## Print queue — different flow

- **Guest** `/print`: a **batch** form (From/To → `QUEUE PRINT RUN`, "up to 200 slips") and a
  "Recent runs" table (`Queued | State | Requested | Job`).
- **Legacy** `/app/invoices/printinvoice`: a **single-invoice picker** (Invoice Type + Invoice No →
  `View Invoice`) plus a separate queue page `/app/invoices/printinvoice/queue`.

**CLOSED 2026-10-08.** The guest `/print` is now the legacy picker (Type + Invoice No + preview + a
Queue rail) and `/print/queue` is the legacy queue page; the queue is browser-local
(`localStorage` `print-queue`), as legacy's was, and the sheet carries the legacy "Print Invoice Now"
and "Add to Print Queue" actions. The server-side batch job (`print.run`) was removed. See
[[print-queue-parity-fix-2026-10-08]] and
[[print-queue-is-browser-local-like-legacy]].

## Print preview — was different, now aligned to legacy

The guest sheet (`/invoices/<id>/view?print=1&paper=a5`) previously used its own column set
(`Qty | Qty as | Price | Disc | Amount`) and dropped the party and booker
([[guest-invoice-print-dropped-the-party-and-booker-names]]). It is now aligned to the legacy sheet
(`/app/invoices/print?invoiceId=…`):

- Header: `+ SALE INVOICE`, `Party <name> (<phone>)`, `Address - <area> - <section>` when present,
  `Booker <name> (<phone>)` when present, `Remarks`, `Invoice #`, `Invoice Date`, `Invoice Time`.
- Lines: `# | ITEM | BOX SIZE | QUANTITY (CTN / UNTS / FREE) | PRICES (UNIT / CTN) | TOTAL`, where
  CTN price is box size × unit price.
- Totals: `TOTAL AMOUNT`, `DISCOUNT 1`, `DISCOUNT 2`, `DISCOUNT cash`, `PAYABLE AMOUNT`.

For #8606 the line row is now byte-identical to legacy; the one residual is **Invoice Time**, which
legacy sources from v1 `created` — not preserved by the import
([[guest-depot-created-is-import-time]]).

## Cosmetic

The guest shows a dev-style `idle · not loaded` control on several screens that legacy does not.

## Reading

The report hub is a match; the **invoice and print surfaces are where the two apps differ most**. Some
of that is the withdrawn visual-parity mandate ([[parity-is-functional-not-visual]]) — the guest is
allowed a better layout — but the print sheet is special: it is the artefact a customer receives, so
it has been aligned to legacy deliberately.
