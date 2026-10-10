---
title: Invoice console keyboard build — evidence and gate results (2026-10-10)
type: note
status: active
created: 2026-10-10
tags: [pos, guest, invoice, keyboard, build, evidence]
related_to: ["[[invoice-console-keyboard-state-machine]]", "[[invoice-console-preview-is-live-not-materialised]]", "[[invoices-are-soft-deleted]]", "[[invoice-print-sheet-legacy-metrics]]"]
---

# Invoice console keyboard build — evidence and gate results (2026-10-10)

Implements `.kilo/plans/1791600000000-invoice-view-keyboard-redesign.md`.

## What shipped

- **New surface** `views/invoices/console.html` + `components/invoice-view.js` (`<aa-invoice-view>`)
  + `components/item-search.js` (`<aa-item-search>`), served by `GET /invoices/new?type=N` and by
  `?invoice=<id>`. The keyboard state machine, the `0`/`999`/`000`/`up` codes, and the write-path
  routing are recorded in [[invoice-console-keyboard-state-machine]].
- **Backend enablers**: fragment create on `POST /invoices/new`; `PATCH /invoice/<id>/line/<lineId>`
  (new, wired to `lifecycle.editLine`); `buildSheetFresh` + `?source=live` on `/invoices/<id>/view`;
  composite party `label` on `invoices.partyOptions` (console + `/invoice/context`);
  `POST /invoices/<id>/delete` soft delete (`lifecycle.softDeleteInvoice`).
- **autocomplete.js**: the synthetic `000` advanced-search row in `shown()`/`choose()`, gated on
  `data-adv-search` and the exact query `000`.
- **Print parity**: A5 margins `0.5cm 0.9cm 0.9cm 0.9cm` and `BOX SIZE = 2em` / `UNTS = 1em`
  ([[invoice-print-sheet-legacy-metrics]]).

## Two write implementations, reconciled (partly)

`invoicing.js` and `invoice-lifecycle.js` both write lines. The console routes its writes through the
canonical `invoice-lifecycle.js` path (lease + `appendLine`/`editLine`/`removeLine`), and the JSON
`PATCH /invoice/<id>/line/<lineId>` calls `lifecycle.editLine`. The older entry routes still call
`invoicing.js` for their non-console path — the two remain side by side. The money chain
(`lineAmount`/`lineTotal`/`invoiceTotals`/`balanceOf`) stays in `invoice-lifecycle.js`, mirrored in
`app/public/js/app.js`; `readInvoice` computes the same. Retiring `invoicing.js` entirely is **not**
done and is left to a follow-up (the routes that still use it are the entry-screen adds and the
non-console line delete).

## Gates

- `tools/guest-smoke.mjs` — **116/116**.
- `tools/invoice-view-check.mjs` — **new**, all checks pass: console render, fragment create (opened
  console), line add via the console form (3 x 70.00 = 210.00), `PATCH` edit (5 x 70 = 350.00), live
  sheet reflects the edit and 404s for an unknown id, composite party label `Console Customer - Area-1 -
  North`, soft delete removes from the picker but the row survives. Self-boots a throw-away depot on
  port 4325.

## Manual browser pass (Chrome DevTools) — 8 real bugs found and fixed

The HTTP gate was green but the actual UI was not. Driving the real console in Chrome (create → line
entry → edit → `000`/`999` → action dialog → view → soft delete) found defects no HTTP assertion saw:

1. **Enter on `NEW` did nothing.** The picker only reacted to `change`, which does not fire when `NEW`
   is already the selected option. Fixed with an explicit Enter handler (claimed only when the
   combobox list is closed).
2. **The NEW walk's Enter chain was never wired** — booker → party → date did not advance. Fixed by
   binding the create form's keydown.
3. **Date-input internals stayed disabled** — enabling only `input[name=dated]` left `<aa-date-input>`'s
   visible field inert. Fixed by enabling every non-hidden, non-readonly control.
4. **The item combobox was not forced** for a short item list, so `999`/`000` (which need the text
   input) could not be typed. Added `data-force-combo` (autocomplete opt-in) on the console item.
5. **Initial focus was lost** — the component upgrades before `autocomplete.js` wraps the select, so
   focus landed on the hidden native select and blurred. Fixed by waiting for the `.ac` wrapper.
6. **`000` advanced search**: the list offered a "Create 000" row before the advanced-search row (Enter
   would make a bogus item) — the create row is now suppressed for the exact code; and the dialog
   rendered empty because it ran before refdb was ready — it now re-renders on `refdb.ready` and on
   each open.
7. **The action dialog did not exist in the picker state**, so selecting an invoice there did nothing.
   Selecting now navigates to the loaded console with the dialog open (`?actions=1`).
8. **`999` discount chain unwired** — Enter in a discount field submitted the header form instead of
   walking discount_1 → discount_2 → discount_rs → payment dialog. Fixed with a discount-field walk.

Verified end-to-end in Chrome: NEW walk, item prefill (box 12 / qty 1 / free 0 / price 70), the line
walk to submit, `999` → payment dialog (invoice preselected), `000` → advanced search → choose, the
picker action dialog with all four actions, `up`-to-edit → PATCH → refresh (350.00), `?source=live`
sheet, `0` → dashboard, and soft delete with its confirm.

## Not done in this build

- The headless-Chrome keyboard choreography gate (focus walk, real `up`/`Enter`) — the plan's CDP
  harness. `invoice-view-check.mjs` is the deterministic HTTP half; the component behaviour is wired but
  not yet driven by a real browser in a gate.
- `hotkeys.js` was not given a new `invoice` page context; the console claims its keys inside the
  surface element (capture phase), which already composes with the global layer.
- The legacy-PDF pixel diff for the auto columns.
- Composite party `label` via refdb's option spec: the console and `/invoice/context` render it
  server-side, but `refdb.js` repopulates `select[data-ref="parties"]` from its own spec (`name`), so on
  a version-change rebuild those labels fall back to the bare name. Closing that needs `label` added to
  the `/data/refs` parties projection and `spec.label` set to it.
