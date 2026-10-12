---
title: "Component library build 2026-10-09: aa-money, aa-entity-form, aa-flash, aa-invoice-entry"
type: note
status: active
created: 2026-10-09
updated: 2026-10-09
tags: [guest, ui, frontend, web-components, money, htmx, verification]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[components-consume-server-descriptors]]", "[[money-inputs-distinguish-amounts-from-rates]]", "[[features-as-native-web-components]]", "[[htmx-navigation-with-html-fragments]]", "[[minimise-client-side-calculation]]", "[[tb-0037-component-library]]", "[[tb-0036-htmx-navigation]]"]
---

# Component library build 2026-10-09

The "component work" named as next in [[trailbase-migration]]: `<aa-money>` (historical-precision
safe), `<aa-entity-form>`, `<aa-flash>` and the invoice-entry component, all light DOM, one file each,
consuming server descriptors ([[components-consume-server-descriptors]],
[[features-as-native-web-components]]). Built and gated in one task; [[tb-0037-component-library]].

## What shipped

| Component | File | What it does |
|---|---|---|
| `<aa-money>` | `public/js/components/money.js` | Amount (2 dp) or `rate` (precision kept, `step="any"`) — see [[money-inputs-distinguish-amounts-from-rates]] |
| `<aa-entity-form>` | `public/js/components/entity-form.js` | Wraps a write `<form>`: inline required messages, an inline surface for a bare 4xx/5xx, disabled-during-flight |
| `<aa-flash>` | `public/js/components/flash.js` | Gives the server's `.flash` banner a lifetime and a dismiss control; markup unchanged |
| `<aa-invoice-entry>` | `public/js/components/invoice-entry.js` | The entry screen's container: consumes the server `type`/`can-write` descriptor and fills the line price from the item's own |

All four are `display: contents` wrappers, so adding a tag does not move a pixel (rules in `app.css`).
Loaded from `views/layout.html.jinja` in the existing `defer` block.

## Wiring

- **`<aa-money>`**: the invoice grid (line `price`/`discount_1`/`discount_2` as rates, `discount_rs` as
  an amount; header discounts likewise), the entry header and line form, `payments/new`, cash-memo
  expenses, inventory cost/sale price, the quick-create item panel, the general-ledger opening fields,
  and the management `items` price fields via `entities.json` `"money": "rate"` + `entity_fields.html.jinja`.
- **`<aa-entity-form>`**: the management entity form, `payments/new`, expenses, inventory, the invoice
  entry header + line-add + new-create forms, and the grid header + grid form.
- **`<aa-invoice-entry>`**: wraps `views/invoices/entry.html.jinja`; its `data-type`/`data-can-write` are the
  server descriptor. It owns the item→price fill that `app.js` `enhanceLineEditor()` used to apply to
  every `form select[name="item"]`; that function is removed. The grid keeps its richer fill inside
  `enhanceGrid`.

## The two defects the gate caught

Both were found by `component-check.mjs` on first run, not by reasoning:

1. **`decimals()` read an absent attribute as `0`.** `Number(getAttribute("decimals"))` is
   `Number(null)` — `0` — so a bare `<aa-money>` normalised to **integers** (`1.5` -> `2`). The
   default mode has to be 2 dp; fixed by checking `hasAttribute("decimals")` first.
2. **The entity form's inline message never appeared.** The browser runs constraint validation and,
   when a field fails, does **not** dispatch `submit`; and Chrome does not deliver the `invalid` event
   to an ancestor's capture listener either. A `submit`/`invalid` listener therefore never sees an
   invalid form. Fixed by validating on the submit intent (a capture `click` on the submit control, and
   `submit` for Enter), stopping the event before htmx acts when a field is empty.

This is the same lesson the rest of the migration keeps recording: a harness that asserts behaviour
finds the defect, and a test that only proves the element "is defined" would have passed both bugs.

## Also fixed while wiring

- **A rate is `step="any"` in the server-rendered markup too** (grid, entry, inventory, quick-create,
  and the management `items` price fields through `partials/entity_fields.html.jinja`). The grid's price cell
  was `step="0.01"` while stored rates are not 2 dp, so the **no-JS** plain submit was a `stepMismatch`
  the browser would refuse. htmx submits over XHR and never validated, which hid it. See
  [[money-inputs-distinguish-amounts-from-rates]].

## Review pass (same day)

A local review of the uncommitted diff found four items, all fixed before commit:

- **`partials/entity_fields.html.jinja` dropped `step` in the new rate branch**, defaulting a management item
  rate to `step="1"` and blocking the no-JS save — the same defect, on the one path the first pass
  missed. The branch now emits the descriptor's `step`.
- **`<aa-money>` normalised amounts with `toFixed`, not the defined `round2`.** The two disagree at
  half-cent boundaries (`125.505` -> `round2` `125.51` vs `toFixed` `125.50`), and the component's value
  is what gets stored. It now uses `round2`.
- **`rate` mode attached no-op `blur`/`change` listeners** per grid cell on every htmx swap; it now
  attaches none (a rate is never normalised).
- **Dead markers removed** (`is-submitting` class, `aa-money-native` class); the `invoiceType`/
  `canWrite` accessors are now consumed by `component-check.mjs`.


## Gates (2026-10-09, all green)

| Gate | Result |
|---|---|
| `node trailbase/tools/component-check.mjs` (new) | **19/19** |
| `node trailbase/tools/guest-smoke.mjs` | **116/116** |
| `node trailbase/tools/grid-preview-check.mjs` | **14/14** |
| `node trailbase/tools/autocomplete-check.mjs` | **39/39** |
| `node trailbase/tools/refdb-check.mjs` | **12/12** |
| `node trailbase/tools/hotkey-check.mjs` | **62/62** |
| `node trailbase/tools/print-queue-check.mjs` | **14/14** |
| `node trailbase/tools/route-snapshot.mjs` | **50 routes, 0 erroring** |

`component-check.mjs` drives the running app in headless Chrome over CDP and asserts: an amount
normalises to 2 dp; a rate keeps the depot's real `114.583333` and is `step="any"`; an amount is
`step="0.01"`; an empty required submit shows an inline error and does not navigate; the submit control
is disabled during flight; the flash is present then auto-dismissed; choosing an item fills the line
price. It writes nothing.

## Deliberately deferred

- **`<aa-dirty-guard>`** — confirm before leaving an unsaved form. Real value now the shell survives a
  nav ([[htmx-navigation-with-html-fragments]]), but a `beforeunload`/navigation guard interacts with
  every browser gate that types into a form and then navigates (`grid-preview-check` calls
  `Page.navigate` on a dirty grid; `autocomplete-check` types without submitting). It needs dialog
  handling in the harnesses first. Building it now would destabilise the gate suite for no verified
  gain. Left as a [[tb-0037-component-library]] follow-up.
- **True offset paging** for the report "Load more" — a separate [[tb-0036-htmx-navigation]] item, not
  component work.
