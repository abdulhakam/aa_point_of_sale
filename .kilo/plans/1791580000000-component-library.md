# Native component library — the "component work" slice

## Goal

Deliver the next component slice named in `vault/projects/trailbase-migration.md`:
**`<aa-money>` (historical-precision-safe), `<aa-entity-form>`, and the invoice-entry component** —
plus `<aa-flash>` — as light-DOM custom elements that consume server descriptors, per
[[components-consume-server-descriptors]] and [[features-as-native-web-components]]. Then update the
vault in the same task.

## Rules every component keeps (from the decisions)

1. **Light DOM, one file each, styled by the single global stylesheet** (`public/css/app.css`). No
   shadow DOM.
2. **Progressive enhancement.** The server keeps rendering real, working markup; a component only
   enhances it. With no JavaScript the page still works (the scripting-off gates depend on this).
3. **Consume, do not own.** A component takes a server descriptor as input; it never carries its own
   schema or a client-side type→table switch. Validation stays server-authoritative; the client
   mirrors `required` for UX only.
4. **Don't disturb the keyboard layer.** `hotkeys.js fields()` walks `input:not([type=hidden]):not([disabled]):not(.aa-date-native])`.
   A component that hides a control must take it out of the tab order and the field set.
5. **Survive an htmx swap.** Anything appended outside the host must clean up in
   `disconnectedCallback` (the `<aa-modal>` lesson, [[htmx-navigation-with-html-fragments]]).

## What gets built

### 1. `<aa-money>` — `public/js/components/money.js`

Wraps a native `<input type="number">`. Centralises the money rule
([[money-is-2dp-everywhere]]) **and** the historical-precision footgun
([[minimise-client-side-calculation]], point 3: "the editable input carries the stored value;
`money()` is for display columns").

- **Amount mode (default):** on `blur`/`change`, normalise the submitted value to `decimals` (2).
  An amount is 2 dp by rule, so this is safe.
- **Rate mode (`rate` attribute):** a unit price/cost is a *rate*, not an amount — it may carry more
  precision than a paisa (`114.583333`). The component must **never reduce the precision of a rate**;
  it only trims/normalises and sets `step="any"`.
- **`step` fix:** rate inputs get `step="any"`, fixing a real latent defect — the grid's price cell
  is `step="0.01"` while stored rates are not 2 dp, so the **no-JS** plain form submit would fail
  HTML5 constraint validation (`stepMismatch`). htmx never validated, which hid it.
- **Progressive:** without JS the wrapped input is a normal number input.
- **Keyboard:** the native input stays the form control (no second hidden field, unlike
  `<aa-date-input>`), so no tab-order handling is needed.

Sites to wrap (money/rate only; quantities stay plain `type="number"`):

| File | Field | Mode |
|---|---|---|
| `views/invoices/grid.html` | header `discount_1`, `discount_2` | rate |
| `views/invoices/grid.html` | header `discount_rs` | amount |
| `views/invoices/grid.html` | line `price` | rate |
| `views/invoices/grid.html` | line `discount_1`, `discount_2` | rate |
| `views/invoices/grid.html` | line `discount_rs` | amount |
| `views/invoices/entry.html` | header `discount_1/2` rate, `discount_rs` amount | |
| `views/invoices/entry.html` | line `price` rate, `discount_rs` amount | |
| `views/payments/new.html` | `amount` | amount |
| `views/cashmemo/expenses.html` | `amount` | amount |
| `views/inventory/index.html` | `cost_price`, `sale_price` | rate |
| `views/partials/quick-create.html` | `item_new_cost_price`, `item_new_sale_price` | rate |
| `views/reports/ledgers/general.html` | `openingRecievables`, `openingPayables`, `openingCash` | amount |
| `views/partials/entity_fields.html` | `number` fields flagged `money` | rate |

`entities.json` gains `"money": "rate"` on `items.cost_price`/`items.sale_price`; `management.js
formFields` carries it; `entity_fields.html` emits `<aa-money rate>` for those. (The descriptor is
the one place the field kind is declared.)

### 2. `<aa-entity-form>` — `public/js/components/entity-form.js`

Wraps the server-rendered `<form>`.

- **Disabled-during-flight:** on `htmx:beforeRequest` (originating in this form) set `aria-busy` and
  disable every submit control; restore on `htmx:afterRequest` / `htmx:responseError` /
  `htmx:sendError`. Prevent a double POST from an impatient second click.
- **Inline error surface (client):** on submit, if any field is `:invalid` (a mirrored `required`),
  render a `.field-error` message beside it, mark the control `aria-invalid`, focus the first, and
  stop submission. This replaces the browser's inconsistent native bubble with visible text.
- **Inline error surface (server):** on `htmx:responseError`, if the body is not a fragment with its
  own flash, show the response's error text in a `.form-error` region inside the form.
- **Progressive:** without JS the wrapper is an unknown element around a working form.

Sites: `management/list.html`, `payments/new.html`, `cashmemo/expenses.html`, `invoices/entry.html`
(header, line-add, complete), `invoices/grid.html`, `inventory/index.html`, `cashmemo/voucher.html`,
`cashmemo/da.html`.

### 3. `<aa-flash>` — `public/js/components/flash.js`

Wraps the flash region (`partials/flash.html`). Keeps the `.flash <kind>` markup (existing selectors
and gates read it), adds a close control and an auto-dismiss timer (success/ok shorter, error/warn
longer), paused while hovered. Guarantees cleanup on disconnect. Auto-dismiss is a client nicety; the
server-rendered flash is unchanged and present without JS.

### 4. `<aa-invoice-entry>` — `public/js/components/invoice-entry.js`

The invoice-entry component. Per [[components-consume-server-descriptors]] the type adaptation stays
**server-side** (`entryView` already builds the screen from the `type` code); the component consumes
server descriptors (`data-type`, `data-can-write`) and owns the client behaviour that repeats on the
entry screen:

- item-select → fill price/cost from the option's own data (the operator's number wins), and the
  qty-as display — **absorbing `enhanceLineEditor`** from `app.js`, which is removed (the grid's
  version stays in `enhanceGrid`).
- It never switches on `type` for data access — documented in the component header.

Wired as the container of `views/invoices/entry.html`.

## Verification

- `node trailbase/tools/guest-smoke.mjs` — HTTP, serves `runtime/` directly; must stay green
  (**116/116**).
- Server up on `:4000` (`--runtime-root-fs=runtime`, depot `traildepot`, default dev creds — verified).
- New gate **`trailbase/tools/component-check.mjs`** (real Chrome over CDP), asserting:
  1. an amount input normalises to 2 dp on blur; a **rate input keeps its stored precision** (the
     historical-precision footgun);
  2. a rate input is `step="any"` (no `stepMismatch`);
  3. `<aa-entity-form>`: an empty required submit shows an inline error and does not navigate;
  4. `<aa-entity-form>`: the submit control is disabled while a request is in flight;
  5. `<aa-flash>`: the flash is present on load and auto-dismisses;
  6. `<aa-invoice-entry>`: choosing an item on the line-add form fills the price.
- Existing browser gates re-run green: `grid-preview-check` 14/14, `autocomplete-check` 39/39,
  `hotkey-check` 62/62, `refdb-check` 12/12, `print-queue-check` 14/14, `route-snapshot` 50/0.

## Vault (same task, per AGENTS.md)

- `tasks/tb-0037-component-library.md` — tick the delivered boxes, add evidence, keep `doing` until
  the invoice-entry component is verified; record flash/dirty-guard status.
- `projects/trailbase-migration.md` — add a 2026-10-09 Sequence entry; update the "Next" line.
- New `decisions/` or `notes/` note recording the component contract as built and the
  historical-precision rule for `<aa-money>`.
- `links.mjs` exit 0, `check.mjs` exit 0, `stats.mjs --write-report`.

## Explicitly deferred (recorded, not silently dropped)

- **`<aa-dirty-guard>`** — real value now the shell survives a nav, but a `beforeunload`/navigation
  guard interacts with every browser gate that types into a form and then navigates
  (`grid-preview-check` calls `Page.navigate` on a dirty grid, `autocomplete-check` types without
  submitting). It needs dialog handling in the harnesses first; building it now would destabilise the
  gate suite for no verified gain. Recorded as a follow-up.
- **True offset paging** for report "Load more" (not part of the component work).
