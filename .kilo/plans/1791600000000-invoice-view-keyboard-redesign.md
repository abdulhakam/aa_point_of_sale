# Invoice view — keyboard-first entry, edit, view, pay, print

## Goal

Rebuild the guest **invoice screen** as a single keyboard-first surface that *is* the invoice: an
invoice-number picker at the top, the header, and the line body, driven from the keyboard with the
same capability available on buttons. Concretely, deliver:

1. **Open state** — every field disabled; the `invoice #` searchable select focused with `NEW`
   selected by default.
2. **New-invoice flow** — `Enter` on `NEW` walks booker (sale only) → party → date → creates the
   invoice and drops into line entry.
3. **Existing-invoice flow** — selecting an invoice and pressing `Enter` opens an action dialog:
   `1` edit, `2` view (default), `3` payment, `4` print.
4. **Line entry** — item searchable select with `000` advanced search, prefilled carton/prices,
   carton→unit→free→discount qty walk, `up`-to-edit, `999` to finish.
5. **Finish** — `999` → invoice discounts → payment dialog → a print-preview tab with `[p]rint` /
   `[q]ueue`; the screen refreshes for the next invoice. `0` as the invoice number exits to the
   dashboard.
6. **Print parity** — the printed invoice looks like the legacy sheet and uses the legacy column
   widths.

The keyboard is an accelerator over markup that already works; **every action also has a button**
([[features-as-native-web-components]], [[keyboard-layer-and-the-two-bugs-a-real-keystroke-found]]).

## Where this lands

- **Surface:** a new template `runtime/app/views/invoices/view.html` wrapped in a new component
  `<aa-invoice-view>`, served by the existing **`GET /invoices/new?type=N`** route
  (`runtime/ahscripts/routes/invoices/new/route.ts`). That route already exists and is the one write
  still rendered as a full page; it becomes the keyboard surface.
- **Fallback retained:** `views/invoices/grid.html` and the entry form path stay as the no-JS / power
  fallback. The keyboard view must degrade to the same working markup without JS.
- **Decisions this build is bound by** (do not re-litigate; where the spec bends one, it is named):
  no draft/status — save is publish and the invoice stays editable ([[no-draft-invoices-published-on-save]]);
  one writer per invoice via an auto-expiring lease, everyone else reads ([[single-writer-per-invoice]]);
  amounts 2 dp, rates keep precision ([[money-is-2dp-everywhere]]); the client mirrors the server's
  money chain in integer paisa and the server stays authoritative ([[client-side-live-recalculation]]);
  components are light-DOM and consume server descriptors ([[components-consume-server-descriptors]]);
  references come from the client IndexedDB store ([[reference-lists-come-from-indexeddb]]);
  print is the browser dialog over the server-rendered A5 sheet ([[print-queue-is-browser-local-like-legacy]]);
  the legacy look is required but its defects are fixed ([[parity-reinstates-the-legacy-look-with-defect-fixes]]).

## The interaction model (state machine)

`<aa-invoice-view>` owns a small explicit state machine. All states are reachable by mouse too: each
magic key has a visible control equivalent.

### State 0 — PICKER (on open)

- Render header + line area with every field `disabled` (reuse the existing `canWrite`/`isNew`
  gating in `entry.html` L72–106 and `grid.html` L56).
- The **invoice #** control is a searchable select (`data-searchable data-ref="invoices"`), focused,
  with option **`NEW`** selected. Options = `NEW` + the invoices of the current type
  (`listInvoices`/`pickerInvoices` in `invoices.js`, capped like the payments picker at ~200), each
  labelled `<no> · <party> · <date> · <total>`.
- `Enter` on `NEW` → State 1. `Enter` on an invoice → State E (action dialog).
- Typing `0` then `Enter` → `location.assign("/dashboard")`.

### State 1 — BOOKER (sale only)

- Enable the booker field only for `type === 1` (matching `entry.html` L31–38); for purchase/return/
  difference skip straight to State 2. Move focus to booker with its first option selected; the
  operator may change it; `Enter` → State 2.

### State 2 — PARTY

- Focus the party searchable select (`data-ref="parties"`, `data-create="#qc-party"`). Fragmented
  word search over the party list.
- **Display name becomes `{partyName} - {area} - {section}`** so same-name parties in different
  locations are distinguishable. This is a new label projection: server adds the composite label to
  the party options (and to `refdb` rows / `invoice/context` parties), not just `name`.
- The existing **`+`** button beside it opens the create-party dialog (`#qc-party`, reuse
  `partials/quick-create.html` L19 + `refdb-create.js`); a newly created party is selected into the
  field. `Enter` → State 3.

### State 3 — DATE

- Focus the invoice date (`name="dated"` inside `<aa-date-input>`), prefilled **today**
  ([[sales.invoice-date-fallback]] — the invoice's date is the fallback so past-day invoices are
  allowed). The operator may set an earlier date. `Enter` → State 4.

### State 4 — CREATE & OPEN

- On `Enter`, POST the collected header (`type`, `booker`, `party`, `dated`) to create the invoice in
  **one request** — a new **htmx fragment path** on `POST /invoices/new` (today it is a full-load
  `303`; give it the `isFragment(req)` branch the other writes have, per
  [[htmx-navigation-with-html-fragments]]). Server: `createInvoice` → `patchHeader` →
  `takeLock` ([[invoicing.js]] L51/L116/L97, or the lifecycle equivalents). The invoice is **published
  immediately** — no draft ([[no-draft-invoices-published-on-save]]).
- The response is the opened invoice view (fresh `entryView`-style render); the header becomes
  `disabled`, and focus moves to the **item** input of the first (blank) line.

### State E — EXISTING INVOICE ACTION DIALOG

`Enter` on a selected invoice opens a dialog (reuse `<aa-modal>`) with four choices, **default `2`**:

| key | action | behaviour |
|---|---|---|
| `1` | **Edit** | open the invoice (write lease taken), focus the line `name`/item input, normal flow |
| `2` | **View** (default) | open a **view-only** print preview in a dialog; a `[p]ay` button inside triggers `3` |
| `3` | **Payment** | open the create-payment dialog with this invoice preselected |
| `4` | **Print** | trigger the print of this invoice |

- **View must show the LATEST data, not `inv_doc`.** The current preview (`invoices/{id}/view` →
  `invoice-sheet.js buildSheet` → `A.invoiceDoc.read`) reads the materialised document only, with no
  fresh path. Add a **live build** (`buildSheetFresh`) that maps `readInvoice` (which already reads
  the base tables, `invoices.js` L195) into the sheet shape, and a `?source=live` (or `?fresh=1`)
  flag on the view route used by this dialog. This directly serves the request "latest data (not
  from cache/invoice_doc)".
- **Payment dialog** reuses the payments preselection (`payments.js newView` L259–273: invoice,
  party, amount = balance) rendered inside `<aa-modal>`; the POST is the existing `POST /payments`
  (`payments/route.ts` L33). Show total / paid / balance from the invoice, enter amount; optionally
  expose the invoice's `discount_rs` (the "could" in the request) as a field that patches the header
  before payment.

### Line-entry sub-state machine (State 4 onward)

Focus is always the **item** field of the active line. Line fields are per `grid.html` L94–117 /
`entry.html` L133–145; the money chain is `app.js` L210–255 mirrored from `invoice-lifecycle.js`.

**Item field (`name`/item searchable select).**

- Type to filter the item list; `Enter` selects and advances; or type **`000`** → the synthetic
  **"Advanced search"** row is appended the same way the create row is (`autocomplete.js`
  `shown()` L165, `choose()` L238) → opens an **`<aa-item-search>` dialog** (search/filter items by
  company = `items.categories` → the `companies` list). Selecting there enters the item and advances.
- **On select:** prefill **Carton Size** (`box_size_qty`) and the **prices** by loading the item's
  own data (the `<option>` already carries `data-price/cost/box`, `entry.html` L138; the client
  recomputes carton price = box size × unit price). Defaults: **carton qty 0, unit qty 1, free 0**
  (0 must be a real value, never null/undefined).
- **`Enter` on an empty or unrecognised code that is neither `999` nor `000`** → do nothing, keep
  focus, **clear the text**. (Guard: codes match only as an exact value in this field at entry time,
  so an item legitimately named/numbered `000`/`999` is still selectable from the list.)

**Quantity walk (new line):** `Enter` through **carton → unit → free → discounts** (discounts only
when needed), then the **line is created** (`appendLine`/`editLine` — see the write-path note) and
focus moves to the **next empty line's item input, skipping the prices section**.

**Editing existing lines — the `up` key:**

- `up` from the active item → focus **unit qty of that item**; `up` again → unit qty of the item
  **above**; `up` on the topmost item does nothing.
- `Enter` on a qty → **update the line only if changed**, then move to the next qty (unit price
  next); `Enter` on **unit price** → update if changed → focus the **carton price** (editable;
  entering it back-computes the unit price); `Enter` on **carton price** → the **empty line's item
  input**, skipping intervening lines.
- Price edits change the **line**, never the database item (per [[sale-price-adjustment]]:
  adjust the invoice line, not the item master).

### Finish — `999` → discounts → payment → print

- `999` + `Enter` at the item field → focus **invoice discount 1** → **discount 2** → **discount
  cash (`discount_rs`)**; `Enter` on discount cash opens the **payment dialog** (State E/`3`).
- Completing the payment opens a **new tab** with the invoice's print preview and two actions
  `[p]rint` and `[q]ueue` (reuse `document.html` L18–23 and `print-queue.js`; the queue is the
  browser-local `localStorage` queue). Closing the tab = no print.
- The invoice screen then **refreshes** back to State 0 for the next invoice.
- `0` as the invoice number → dashboard.

## Backend / API work

1. **Fragment create** on `POST /invoices/new` (htmx branch returning the opened view; today full
   load). Reuse `createInvoice` + `patchHeader`.
2. **Line edit endpoint** for the keyboard flow: `PATCH /invoice/{id}/line/{lineId}` (or extend
   `invoices/{id}/lines`). There is JSON add (`invoice/{id}/line`, POST) and delete
   (`invoice/{id}/line/{lineId}`, DELETE) but **no single-line edit**; wire `lifecycle.editLine`
   ([[invoice-lifecycle.js]] L241). **Reconcile the two write implementations** (`invoicing.js`
   add/delete vs `invoice-lifecycle.js` append/edit/remove) — route the keyboard flow through the
   lifecycle functions (the canonical money chain) and either retire the duplicates or document the
   split.
3. **Live sheet build** — `buildSheetFresh(A, id)` from `readInvoice`; a `?source=live` flag on
   `invoices/{id}/view` and on the finish-flow print tab.
4. **Party composite label** — add `{name} - {area} - {section}` to the party options in
   `entryView`/`refdb` and the JSON `invoice/context` parties list.
5. **Advanced item search** — an item search filtered by company. Data already exists
   (`items.categories` → `companies`); implement client-side over the refdb store (no new server
   endpoint needed) or a small query route if the store lacks fields.
6. **Soft delete** — the request includes deleting invoices; `no-draft-invoices-published-on-save`
   says deletion is a **soft delete**, but no delete route/library function is evidenced. Add
   `DELETE`-as-soft-delete (set the delete marker, keep the row) + a list filter, and a confirm
   dialog. Confirm the exact column before building.

## Frontend components & files

| file | change |
|---|---|
| `runtime/app/views/invoices/view.html` | **new** — picker + header + line area, `<aa-invoice-view>` host, all fields`disabled` initially, `NEW` option, visible buttons for every key action |
| `runtime/app/public/js/components/invoice-view.js` | **new** — the state machine, the `up`/`999`/`000`/`0` handling, focus choreography, line create/edit calls |
| `runtime/app/public/js/components/item-search.js` | **new** — `<aa-item-search>` advanced-search dialog |
| `runtime/app/public/js/components/payment-dialog.js` (or reuse the payments partial in `<aa-modal>`) | **new/adapted** — payment in a dialog with the invoice preselected |
| `runtime/app/public/js/autocomplete.js` | add the synthetic **`000` advanced-search** row beside the create row (`shown()` L165, `choose()` L238) |
| `runtime/app/public/js/hotkeys.js` | add page-context `when:"invoice"`; make sure `up`/`Enter`/`Escape` and the field typing rules (bare letters suppressed in fields) compose with the controller; extend the help overlay + palette |
| `runtime/app/lib/invoices.js` | `entryView` gains the picker options and composite party labels; add a `viewView` builder so GET and the fragment create share one renderer |
| `runtime/app/lib/invoice-sheet.js` | `buildSheetFresh` + optional `source` |
| `runtime/app/views/partials/invoice-sheet.html`, `public/css/app.css` | legacy column widths + A5 margins (below) |
| `runtime/app/public/js/app.js` | keep `enhanceGrid`; the new view reuses the integer-paisa chain; ensure `htmx:afterSwap` re-init covers the new component |

## Print sheet parity (column widths + page)

From the compiled legacy bundle (`legacyforparity/standalone/.next/...` modules 79493/78993,
`.../invoices/print/page.js`):

- **Page:** A5 portrait, margins **`0.5cm 0.9cm 0.9cm 0.9cm`** (`useReactToPrint` `pageStyle`). The
  guest currently uses `@page a5 { margin: 6mm }` (`app.css` L686–694) — change to the legacy
  margins.
- **Columns:** `# | ITEM | BOX SIZE | QUANTITY (CTN / UNTS / FREE) | PRICES (UNIT / CTN) | TOTAL`,
  with a **conditional `DISCOUNTS`** group (`1(%) · 2(%) · IN RS`) rendered only when a line has a
  discount. The **only explicit widths in the legacy bundle** are **`BOX SIZE = 2em`** and
  **`UNTS = 1em`**; the rest are auto. Apply those two widths and verify the auto columns against
  the legacy PDFs (`legacyforparity/zprintsforparity/legacypurchaseinvoice.pdf` vs
  `guestpurchaseinvoice.pdf`) — the natural pixel oracle, which must be measured, not guessed.
- Footer band (`Checked By` / `Delivered By`, `showOnPrint`) already matches (`invoice-sheet.html`
  L103–112). Keep the guest's fixed defect-fixes (friendly `Carton Size`, real `<th>`).

## Keyboard layer integration

- Add an `invoice` page context in `hotkeys.js whenHolds` and keep the existing rules: a bare letter
  never fires while a field has focus; modifiers match exactly; nothing destructive bypasses its form.
- The controller listens on the invoice surface; `hotkeys.js` keeps `?`, `Ctrl+K`, `Esc`, `p`.
- `up`/`Enter` are claimed **only** inside the invoice surface and **only** when the event target is
  one of its fields, so the global `j/k`/`/` bindings still work elsewhere. Verify no key is
  listed twice in the help overlay (the recorded failure mode).

## Testing (drive the real UI, then clean up)

New gate **`trailbase/tools/invoice-view-check.mjs`** (headless Chrome over CDP, the
`hotkey-check.mjs` pattern) against a **throw-away depot** built from a fresh `trail backups trigger`
snapshot (never the production depot — the write practice from
[[invoice-type-write-verification-2026-10-09]]):

1. **Create** — `Enter` on `NEW`, walk booker/party/date, assert the invoice is created with the
   right type, sequence number, booker, party and dated, and the header is then disabled.
2. **Add lines** — select an item, assert carton size + prices prefill and defaults 0/1/0; walk
   qty; assert the line is created and the next empty item is focused.
3. **Edit** — `up` into a line, change qty then unit price then carton price; assert the line (not
   the item) changed, unchanged values do not rewrite, and carton↔unit back-computation is correct.
4. **`000`** — the advanced-search dialog opens, filters by company, selects, and the item lands in
   the field with focus advanced.
5. **`999`** — discounts take focus, the payment dialog opens preselected, completing it opens the
   print tab with `[p]rint`/`[q]ueue`, and the screen refreshes to `NEW`.
6. **Existing invoice** — select + `Enter` shows the action dialog; `2` shows a **live** (non-`inv_doc`)
   preview; `1` opens edit focused on the line item; `3` opens payment preselected; `4` prints.
7. **`0`** exits to the dashboard.
8. **Delete** — soft-delete an invoice and assert it leaves the list but the row survives.
9. Assert the **DB digest returns to baseline** after the test (no contamination), as every write
   harness in this repo does.

Also: manual browser pass over create/modify/delete/view; and re-run the existing gates green
(`guest-smoke`, `route-snapshot`, `grid-preview-check`, `autocomplete-check`, `hotkey-check`,
`refdb-check`, `print-queue-check`, `invoice-check`).

## Vault (same task, per AGENTS.md)

- New `decisions/` note: the invoice-view keyboard state machine and the `999`/`000`/`0`/`up` code
  contract (and the `0`-is-a-code caveat).
- Correct/record: the **live vs `inv_doc` preview** decision; the legacy print **column widths + A5
  margins** fact in `references/`; the two-write-path reconciliation; the soft-delete decision.
- Update `tasks/tb-0021-invoices-cashmemos-printing.md`, `tb-0037-component-library.md`, and the
  `projects/trailbase-migration.md` Sequence; run `links.mjs`, `check.mjs`, `stats.mjs --write-report`.

## Confirm before building (spec ambiguities)

1. **Surface** — replace the interactive entry with `view.html` at `/invoices/new?type=N`, keeping
   `grid.html` as the no-JS fallback? (Recommended.)
2. **Picker scope** — all invoices of the type, newest first, capped ~200? Or search-server-side?
3. **Line creation timing** — unit qty defaults to 1, so a line created by just pressing through the
   qty walk would carry qty 1. Confirm the line is created only on explicit confirm (recommended) so
   an abandoned row does not publish a 1-unit line.
4. **Payment dialog discount** — expose the invoice `discount_rs` field in the dialog, or not?
5. **`inv_doc` vs live** — confirm the view dialog and the finish-flow print use the **live** build;
   should `/print` and `/print/queue` also switch to live, or stay on `inv_doc` (the materialised tier
   kept current by triggers)?
6. **Delete** — confirm the soft-delete marker column and that deletion stays soft.
7. **Magic codes** — confirm `0`/`999`/`000` are consumed only as exact values in the invoice-number
   / item fields, so a real invoice numbered `0` or an item named `000` remains reachable via the
   list/dialog.
8. **Composite party label** — apply `{name} - {area} - {section}` everywhere the party is shown, or
   only in this picker?
