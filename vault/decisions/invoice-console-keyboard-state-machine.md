---
title: The invoice console is one keyboard-first surface with 0/999/000/up codes
type: decision
status: accepted
decided_on: 2026-10-10
created: 2026-10-10
tags: [pos, guest, invoice, keyboard, ui, component]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[no-draft-invoices-published-on-save]]", "[[single-writer-per-invoice]]", "[[keyboard-layer-and-the-two-bugs-a-real-keystroke-found]]", "[[features-as-native-web-components]]", "[[invoice-console-preview-is-live-not-materialised]]"]
---

# The invoice console is one keyboard-first surface with 0/999/000/up codes

The guest's invoice screen is one keyboard-first surface — the **console** — that *is* the invoice:
an invoice-number picker, the header, and the line body, drivable from the keyboard with the same
capability present as a visible button ([[features-as-native-web-components]]). It lives at
`GET /invoices/new?type=N` (template `views/invoices/console.html`, controller
`public/js/components/invoice-view.js`, host `<aa-invoice-view>`); `grid.html` stays the no-JS power
fallback and the older `entry.html` remains the loaded-invoice landing for callers that need it.

## The state machine

| State | What is focused | Enter does |
|---|---|---|
| 0 PICKER | the `INVOICE #` searchable select, `NEW` selected, every field disabled | `NEW` -> state 1; an invoice -> the action dialog (state E) |
| 1 BOOKER (sale only) | the booker select | -> state 2 (purchase/return/difference skip straight to 2) |
| 2 PARTY | the party searchable select (`data-create="#qc-party"`) | -> state 3 |
| 3 DATE | the invoice date (`name="dated"`, prefilled today) | -> state 4 |
| 4 CREATE | — | POST the header to `/invoices/new`; the fragment answers the OPENED console with focus on the blank line's item |
| E ACTIONS | an `<aa-modal>` with 1 Edit, 2 View (default), 3 Payment, 4 Print | — |
| 999 FINISH | invoice discounts -> payment dialog -> a print tab | — |

## The magic codes

- **`0`** — from the picker's empty value, exits to `/dashboard`. Consumed only as an exact typed
  value in an empty picker, so a real invoice numbered `0` is still reachable as an option.
- **`999`** — at the item field, finishes: focus the invoice discounts, then open the payment dialog.
- **`000`** — at the item field, opens the advanced item-search dialog. It is a synthetic row appended
  by `autocomplete.js` (`shown()` / `choose()`, gated on `data-adv-search` and the exact query `000`),
  exactly like the existing create row, so it is arrow-walkable and Enter-selectable. Because it is a
  row in the same array the arrows walk, an item legitimately named `000` is still selectable from the
  list below it.
- **`up`** — inside the invoice surface only (event target is one of its fields): from a line's qty to
  the qty of the line above (nothing on the topmost), from another cell to that line's qty.

## Why this is safe against the global keyboard layer

`hotkeys.js`'s `j`/`k` row cursor is gated on `when:"grid"`, which needs a `[data-grid]` table the
console does not render, and the `alt+ArrowUp/Down` field move requires Alt. The console claims `up`
only when the event target is a `.cell` inside the surface, so the global cursor is never fought.

## Consequences

- The line create uses the canonical `invoice-lifecycle.js` path (`appendLine`/`editLine`/`removeLine`);
  the existing `/invoices/<id>/header`, `/line`, `/line/<id>/delete`, and `/complete` routes re-render
  the **console** when the form carries `surface=console`, and the older entry screen otherwise — one
  form field, so a write's screen cannot drift from the GET that rendered it.
- A NEW create posts `surface=console` and 303s back to the console; every other caller keeps the
  long-standing `/invoices/<id>` landing (which the smoke suite relies on).
- Tested by `tools/invoice-view-check.mjs` (console render, fragment create, line add, PATCH edit, live
  sheet, composite party label, soft delete).

See also: [[invoice-console-preview-is-live-not-materialised]], [[invoices-are-soft-deleted]].
