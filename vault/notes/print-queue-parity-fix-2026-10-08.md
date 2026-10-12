---
$schema: "./notes.schema.json"
title: "Print queue parity fix, 2026-10-08"
type: note
status: active
created: 2026-10-08
tags: [printing, printqueue, parity, legacy, guest, invoice, evidence]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[print-queue-is-browser-local-like-legacy]]", "[[tb-0021-invoices-cashmemos-printing]]", "[[invoice-and-print-discrepancies-between-guest-and-legacy-2026-10-06]]", "[[route-map]]", "[[guest-frontend-feature-parity-gaps]]", "[[runtime-js-guest-platform]]"]
---

# Print queue parity fix, 2026-10-08

Rebuilt the guest print surface as the **legacy** one ([[print-queue-is-browser-local-like-legacy]]):
a picker (`/print`), a browser-local queue, and a queue page (`/print/queue`) that prints the queued
sheets. This is the record of what changed, the evidence it matches legacy, and the gates it passed.

## What changed

| File | Change |
|---|---|
| `trailbase/runtime/app/lib/invoice-sheet.js` | **New.** The sheet render context, lifted out of the view route so the single view and the queued batch render from ONE builder. |
| `trailbase/runtime/app/views/partials/invoice-sheet.html.jinja` | **New.** The sheet body as a minijinja macro, used by `invoices/document.html.jinja` and `print/queue.html.jinja`. |
| `trailbase/runtime/ahscripts/routes/invoices/{id}/view/route.ts` | Calls `buildSheet`; passes `sheet` + `actions`. |
| `trailbase/runtime/app/views/invoices/document.html.jinja` | The legacy actions: **Print Invoice Now** and **Add to Print Queue**, then the guest extras (Edit, A4 copy). |
| `trailbase/runtime/ahscripts/routes/print/route.ts` | Rewritten: GET is the legacy picker (Type + Invoice No + preview); the batch POST form is gone. |
| `trailbase/runtime/app/views/print/index.html.jinja` | Rewritten as the picker + Queue rail + preview. |
| `trailbase/runtime/ahscripts/routes/print/queue/route.ts` | **New.** Renders each queued invoice's sheet from `?ids=…`. |
| `trailbase/runtime/app/views/print/queue.html.jinja` | **New.** Print Invoices / Clear Queue + the sheets + per-sheet remove. |
| `trailbase/runtime/app/public/js/print-queue.js` | **New.** The `localStorage` queue: add/remove/clear, the rail, the `?ids=` sync, the live picker preview. |
| `trailbase/runtime/app/public/css/app.css` | Picker/queue layout; one A5 page per queued sheet on print. |
| `trailbase/runtime/app/lib/queue.js` | Removed the `print.run` job spec (nothing enqueues it now). |
| `trailbase/runtime/app/views/partials/icons.html.jinja` | Added the `printer-off` glyph (Clear Queue). |

## How it matches legacy

- Legacy `/app/invoices/printinvoice` is a **picker**: `Invoice Type` + `Invoice No` selects, a
  `View Invoice` button, a preview iframe, and the queue rail on the left (28vw) with **Print
  Invoices** and **Clear Queue**. The guest `/print` reproduces that, and takes an invoice type/no
  through a plain GET so it works without JavaScript too.
- Legacy `/app/invoices/print?invoiceId=…` is the sheet with **Print Invoice Now** and **Add to Print
  Queue**. The guest sheet is `/invoices/<id>/view` and now carries both.
- Legacy `/app/invoices/printinvoice/queue` is **Print Invoices** + **Clear Queue** + the queued
  sheets, deduped by invoice number. The guest `/print/queue` reproduces that.
- Legacy's queue is `localStorage["print-queue"]`; so is the guest's, using the same key.

## Evidence (verified live, 2026-10-08, dev server on `:4000`)

Driven over HTTP against the imported production depot with cookie auth:

- `GET /print` → 200; "Invoice Type:" select with the type option `selected`, the queue rail
  (`data-print-queue`), the `printer-off` glyph, and every invoice of the chosen type as an option.
- `GET /print?type=1&invoice=<id>` → 200; the chosen option `selected`, the preview iframe
  `src="/invoices/<id>/view"`, and the "Open in new tab" link.
- `GET /print?type=1&invoice=<bogus>` → the picker renders with **no** preview iframe (a stale or
  hand-crafted id cannot point the preview at an arbitrary path).
- `GET /invoices/<id>/view` → 200; both "Print Invoice Now" and "Add to Print Queue" present.
- `GET /print/queue?ids=<id>` → 200; the sheet renders ("Payable Amount", party values), the remove
  button and the Print Invoices button are present, and `data-paper="a5"`.
- `GET /print/queue` (empty) → 200; "Nothing in queue".

`node trailbase/tools/guest-smoke.mjs` → **116/116** (the `/print` needle moved from "Print queue" to
"Print Invoices"; a `/print/queue` page check was added).

`node trailbase/tools/print-queue-check.mjs --base http://127.0.0.1:4000` → **14/14** in real headless
Chrome over CDP (the same dependency-free method as `hotkey-check.mjs`): log in, choose an invoice and
see the preview iframe and "Open in new tab" follow it, add the same invoice twice and get one queue
entry, add a second, see both in the picker rail, "Print Invoices" opens `/print/queue?ids=…` with one
A5 sheet per invoice, remove drops one, and "Clear Queue" empties it and the page says "Nothing in
queue".

## Notes for a future session

- ⚠️ The picker's controls are in the initial HTML, so `readyState` is not enough for a harness to know
  the queue layer has run: `print-queue.js` sets `data-pq-ready` on `<html>` when it initialises, and
  `print-queue-check.mjs` waits on it. A first run of that tool failed the live-preview assertions for
  exactly this reason (a `change` dispatched before the listener existed) — the marker is the fix.
- Ids are URL-safe base64 including `=` padding, and `print-queue.js` puts the RAW id in the path
  (`/invoices/<id>/view`), matching every server-rendered link; only the `?ids=` query is
  `encodeURIComponent`-encoded.
- The picker lists **all four** invoice types, where legacy listed only purchase/sale — deliberate, so
  returns and differences built by the guest remain printable. See
  [[print-queue-is-browser-local-like-legacy]].
- `tools/route-inventory.json` lost its `POST /print` entry and gained `GET /print/queue`;
  `tools/route-snapshot.mjs` gained the `/print/queue` route (run: **50 routes, 0 erroring**).

## Related

- [[print-queue-is-browser-local-like-legacy]] — why the queue is browser-local.
- [[tb-0021-invoices-cashmemos-printing]] — the task that built printing.
- [[invoice-and-print-discrepancies-between-guest-and-legacy-2026-10-06]] — the difference this closes.
