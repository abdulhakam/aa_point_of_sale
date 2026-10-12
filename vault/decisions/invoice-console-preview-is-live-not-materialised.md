---
title: The console's view dialog and finish print use the LIVE sheet, not inv_doc
type: decision
status: accepted
decided_on: 2026-10-10
created: 2026-10-10
tags: [pos, guest, invoice, print, materialised]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[invoice-document-write-through-and-rebuild]]", "[[invoice-console-keyboard-state-machine]]"]
---

# The console's view dialog and finish print use the LIVE sheet, not inv_doc

The `inv_doc` materialised document ([[invoice-document-write-through-and-rebuild]]) is a second copy
kept current by 14 triggers; the request behind the console's action dialog was explicitly "show the
LATEST data (not from cache / invoice_doc)".

**Decision.** `/invoices/<id>/view` gains `?source=live`. When set, the sheet is built by
`invoice-sheet.js buildSheetFresh(A, id)`, which maps `invoices.readInvoice`'s base-table output into
the exact `data` shape `buildSheet` produces, so the ONE `partials/invoice-sheet.html.jinja` macro renders
both and their layout cannot diverge. The **console's View dialog and its finish-flow print tab** use
`?source=live`. `/print` and `/print/queue` **stay on `inv_doc`** — the trigger-maintained tier — because
they are the legacy picker/queue batch and do not need to bypass the materialisation.

## Evidence

- `runtime/app/lib/invoice-sheet.js` — `buildSheetFresh` added beside `buildSheet`; the `data` shape is
  identical (business header, `typeLabel`, party/address/booker, lines with CTN/UNTS/FREE and UNIT/CTN,
  the `hasLineDiscounts` group, the legacy totals labels).
- `runtime/app/lib/invoices.js` `readInvoice` gained `created` so the live sheet's Invoice Date/Time has
  the same source the materialised one uses.
- `runtime/ahscripts/routes/invoices/{id}/view/route.ts` — `source=live` selects `buildSheetFresh`;
  an unknown id 404s with "No such invoice" (the materialised path keeps its "No materialised document…"
  404).
- `tools/invoice-view-check.mjs` asserts `?source=live` renders the sheet, reflects an edit made in the
  same run, and 404s for an unknown id.
