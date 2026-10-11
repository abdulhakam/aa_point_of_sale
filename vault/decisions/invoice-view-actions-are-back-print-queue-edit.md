---
title: "The invoice view/preview shows only Back, Print, Add to Queue and Edit"
type: decision
status: accepted
created: 2026-10-11
updated: 2026-10-11
tags: [invoices, print, view, controls, decision, guest]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[print-queue-is-browser-local-like-legacy]]", "[[invoice-print-sheet-legacy-metrics]]", "[[invoice-print-total-column-before-discounts]]", "[[ui-parity-run-2026-10-11]]"]
---

# The invoice view/preview shows only Back, Print, Add to Queue and Edit

**Decided 2026-10-11**, at the operator's request: the invoice preview (the `/print` iframe and the
`/invoices/<id>/view` page) should carry no controls other than `go back`, `print`, `add to queue`
and `edit`.

## Decision

`views/invoices/document.html`'s non-print action bar is exactly:

- `← Back` → `/invoices`
- `Print` → `/invoices/<id>/view?print=1` (`data-print="a5"`, opens the print page and prints it)
- `+ Add to Print Queue` → the localStorage queue
- `Edit` → `/invoices/<id>/grid`

`Back` and `Edit` use `target="_top"` so they act on the whole window when the document is shown in
the `/print` preview iframe.

## What was removed and why

The former **"Print A4 copy"** link (`?print=1&paper=a4`) is gone: the paper size is the browser
print dialog's business, and the invoice is an A5 artefact. The route still accepts a `paper` query
(harmless), but no UI exposes A4 for an invoice. "Print Invoice Now" was renamed to "Print".

## Consequences

- The screen and the paper stay the same artefact (printing is a stylesheet over this page); the
  change only trims the on-screen controls.
- The `?print=1` page still drops the nav and keeps only a `← Invoices` / `Edit` crumb line for the
  printed sheet.
