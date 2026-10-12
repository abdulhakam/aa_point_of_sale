---
title: Legacy-look restyle progress, 2026-10-08
type: note
status: active
created: 2026-10-08
updated: 2026-10-08
tags: [guest, ui, parity, legacy, evidence, restyle]
related_to: ["[[ui-parity-discrepancies-2026-10-05]]", "[[ui-parity-discrepancies-2026-10-08]]", "[[tb-0023-guest-feature-parity]]", "[[parity-carve-outs-reconfirmed-2026-10-08]]", "[[parity-reinstates-the-legacy-look-with-defect-fixes]]", "[[features-as-native-web-components]]", "[[legacy-ui-reference-captures]]"]
---

# Legacy-look restyle progress, 2026-10-08

First restyle increment under [[parity-reinstates-the-legacy-look-with-defect-fixes]] (plan A1 + the
cheap items of A2), with the fresh discrepancy list regenerated rather than carried forward.

## How the list was produced

- Guest captures refreshed: `node trailbase/tools/ui-capture.mjs --system guest` → 28 screens at
  1600×900 into `vault/attachments/ui-capture/guest/`.
- Diff: `node trailbase/tools/ui-parity-report.mjs` → 28 screens compared, **28 still with at least
  one difference**.
- The **legacy arm is the frozen capture set** in `vault/attachments/ui-capture/legacy/` and
  `vault/attachments/legacy-ui/`. The live legacy app needs PocketBase credentials held by the
  operator and not recorded anywhere, so `ui-capture.mjs --system both` cannot be run unattended;
  the diff is guest-fresh vs legacy-stored. This is a limitation of the A0 harness, not of the app.

## Fixed in this increment

| Item | Change | Evidence |
|---|---|---|
| **Body link colour** | `a { color: gray-7 }`, not blue | `ui-parity-report` metric `linkColor` no longer differs on any screen |
| **Shared shell font** | appended `"Apple Color Emoji", "Segoe UI Emoji"` to `--font` | metric `bodyFont` now identical |
| **Rail** | five legacy destinations in legacy order (Dashboard, Reports, Invoices, Cash Memo, Management) + Logout at the foot; Payments, Inventory, Print, Pages, Plugins and refresh behind one foot menu | `views/partials/nav.html.jinja`; legacy `02-dashboard.snapshot.yml` shows exactly those five links + one button |
| **A — management list** | bare Search row + table, no heading, no count badge, no card wrappers; create form moved behind a `New {singular}` affordance (`?new=1`) | `views/management/list.html.jinja`, `routes/management/{entity}/route.ts` |
| **C — management cards** | nested bordered cards removed | same |
| **D — report date inputs** | native `input[type=date]` given the Mantine look by `<aa-date-input>` | [[features-as-native-web-components]]; verified in-browser: text `January 1, 2024`, native `2024-01-01`, name `from` preserved |
| **G — Cash Memo tile glyph** | filled blue € circle (`coin-euro-filled`) | `views/dashboard/index.html.jinja` |
| **H — dashboard `Overview` card** | removed; `guest-smoke` assertion changed from "Overview" to "Cash Memo" | `views/dashboard/index.html.jinja`, `tools/guest-smoke.mjs:287` |
| **Management table borders** | black, matching legacy (the earlier comment claimed only report tables were black) | metric `thBorder` on `management-parties` was gray-3 vs legacy black |

## Gates run (all green)

- `guest-smoke.mjs` **115/115**
- `route-snapshot.mjs` **49 routes, 0 erroring**
- `autocomplete-check.mjs` **39/39**
- `hotkey-check.mjs` **62/62** (one assertion retargeted — see below)
- `grid-preview-check.mjs` **14/14**
- `refdb-check.mjs` **12/12**

Two test/tooling corrections were needed and are deliberate:

- The hotkey field-navigation assertion ran on the management list, which no longer has a form (item
  A). Retargeted to the list's create panel (`?new=1`), which is where that page now keeps a form.
- `ui-capture.mjs`'s `linkColor` metric sampled the first anchor, which is the guest's header brand
  (`a.brand`, black) and not a content link on the legacy side. It now samples a throwaway `<a>` for
  the base anchor colour, which is comparable across both apps.

## Second increment (2026-10-08, later): the "Filter Data" dialog

The user's ask was that the guest look exactly the same **including when and where a dialog opens**.
`stockreport` and `difference` open their filters in a centered Mantine "Filter Data" dialog
([[ui-parity-discrepancies-2026-10-08]] §3); the guest showed the same fields inline.

- New reusable component **`<aa-modal>`** (`app/public/js/components/modal.js`) — the 440px white card,
  a 60% overlay, an H2 title with an X, Escape and overlay-click to close, and `[data-modal-open]` /
  `[data-modal-close]` declarative wiring. It MOVES the authored children into the dialog, so with no
  JavaScript the form still renders inline and works ([[features-as-native-web-components]]).
- The two reports declare `"filtersModal": true` in their `meta.json`; `normalizeMeta` now passes that
  flag through (it did not pass unknown keys). `reports/report.html.jinja` renders those filters inside the
  dialog with an **OK** submit and hides the inline row and the "find in this report" box, and the
  dialog starts open when no `company` is chosen.
- `autocomplete.js`'s blank-option label now reads as its own label ("All") rather than an empty box,
  matching the legacy select; two `autocomplete-check` assertions that encoded the old empty-box
  divergence were updated to expect the label.

Gates after this increment: `guest-smoke` 115/115, `autocomplete-check` 39/0, `hotkey-check` 62/0,
`route-snapshot` 49 routes / 0 erroring. Verified in-browser: the dialog is 440×150, title `<h2>`
"Filter Data", the select reads "All".

## Third increment (2026-10-08, later): management and cash-memo hubs

Worked the self-contained groups of the actionable list in
[[ui-parity-discrepancies-2026-10-08]].

- **Management hub** — order is now sections, areas, parties, companies, bookers, items (the legacy
  order; the guest was reversed), and each link shows its lowercase KEY, so "bookers" not
  "order bookers". `app/views/management/index.html.jinja`, `app/manifests/entities.json`.
- **Management list columns** — added the legacy **Created** column to sections, areas, companies and
  bookers (the imported `created` TEXT is in exactly the legacy format, e.g.
  `2024-01-31 09:50:40.038Z`); bookers' multi-column relabelled "Company"; items reordered to Company,
  Name, Cost price, Sale price, Carton Size with Display ID/Barcode dropped. **Items Qty is still
  missing** (it is computed stock, not a table column).
- **Cash-memo hub** — now the legacy grey "CASH MEMO" card with the five legacy tiles in legacy order:
  DA Entry - Purchases, CRV - Cash Recieve Voucher, CPV - Cash Payment Voucher, Payments, Expenses
  (added `arrow-down`/`arrow-up` icons). The guest-only summary card, date filter and crumb are gone.
- **Active rail link colour** — back to gray-7 on the blue-0 chip (the guest had made the active glyph
  blue-9).

**Deferred:** the **invoices hub** — legacy `/app/invoices` is a five-tile hub whose Return and
Difference tiles need the unbuilt return/difference entry, so restructuring `/invoices` waits on those;
and the **rail** (the missing Orders destination and the foot-menu extras) is a capability decision,
not a pure restyle.

Gates: `guest-smoke` 115/115, `route-snapshot` 49 routes / 0 erroring.

## Fourth increment (2026-10-08, later): invoices hub, items Qty, grid create

The four items the owner asked for next.

- **Invoices hub** — `/invoices` is now the legacy five-tile hub (Purchase, Sale, Print Invoices,
  Return, Difference); the list moved to `/invoices/all`. The entry route used to coerce every create
  to a sale (it read only the query, ignoring the form's hidden `type`) — it now accepts all four
  `invoice_types`, so **Return** and **Difference** entries exist. `views/invoices/index.html.jinja`,
  `all.html.jinja`, `routes/invoices/{route.ts,all/route.ts,new/route.ts}`.
- **Items Qty column** — the items list shows the legacy `165 (1 ctn 21 units)`, the signed stock read
  from the SAME `itemsReport` view the stock report and `/inventory` use, so the three cannot disagree.
  `routes/management/{entity}/route.ts`, `app/manifests/entities.json`.
- **Create-from-invoice on the grid** — the grid form now carries the item quick-create panel and every
  row's item select points at it. `autocomplete.js` records which select opened the panel
  (`panel.__aaSelect`) and `refdb-create.js` selects the new item IN THAT ROW, so SAVE LINES saves it
  normally. JS-only, which is fine: with no JS the combobox never offers "Create …".
- Test harnesses that found their page on `/invoices` now use `/invoices/all`
  (`autocomplete-check`, `refdb-check`).
- **Hub tile spacing** — the guest spread hub tiles across the card (`justify-content: space-between`);
  the legacy packs them left with a fixed gap. Measured off the live `/app/invoices` hub (five 160px
  tiles at x = 113/411/709/1007/1305, a 138px gap), `.tiles` now uses `justify-content: start; gap: 32px
  138px`; the dashboard keeps its own 84px gap. The guest invoices hub now renders at those exact x
  positions.

  ⚠️ The capture diff's "login" screen is an **artifact**: the legacy arm's `/auth` redirected to
  `/app/dashboard` (it was already authenticated), so it compared the legacy dashboard against the
  guest login form. Not a real difference.

Gates: `guest-smoke` 115/115, `autocomplete-check` 39/0, `hotkey-check` 62/0, `grid-preview-check` 14/0,
`refdb-check` 12/12, `route-snapshot` 49/0.

## Fifth increment (2026-10-08, later): the reconfirmed carve-outs, the invoice entry bar, the create dialog

After the owner restated "1-1 with legacy, except the discussed cases" and reconfirmed each carve-out
one by one ([[parity-carve-outs-reconfirmed-2026-10-08]]), this increment applied the four answers that
changed something.

- **The four invoice entry views** — `views/invoices/entry.html.jinja` is now the legacy entry bar: a
  `{TYPE} INVOICE` heading over a rule, then one inline row — `INVOICE NO:`, `INVOICE DATE`, the
  transaction's party (`BOOKER` + `CUSTOMER` on a sale, `SUPPLIER` on a purchase, `PARTY` +
  `Original Invoice` on a return, **none** on a difference), the disabled `USER:`, the create/save
  control and the print glyph — then the lines grid. Measured off the live legacy
  `/app/invoices/{purchase,sale,return,difference}` (all four captured). The create path
  (`/invoices/new?type=…`) uses the same bar, so the four types look the same before and after the
  invoice exists; `routes/invoices/new/route.ts` now honours the form's `dated` and `booker`.
  The bar's controls are the legacy ones: the invoice-create button reads **`Create`**, and the
  legacy **blue `+`** beside the party opens the **Create New Customer/Supplier** dialog
  (measured live: legacy's `+` raises a modal titled `Create New Customer` with Name / Area / Phone /
  Address and an OK). The `+` is wired by `refdb-create.js`'s `[data-qc-open]` handler; the combobox's
  own "Create …" row remains the other opener.
- **Create-from-invoice is a dialog with its own submit** — `partials/quick-create.html.jinja` wraps each
  panel in `<aa-modal>` with its own `<form action="/quick-create">`; `autocomplete.js` opens/closes the
  owning dialog instead of an inline panel, and `components/modal.js` tags its overlay with `__aaHost`
  because `<aa-modal>` MOVES its children out of the element (so `closest("aa-modal")` is null).
  ⚠️ The dialog is authored **outside** every enclosing form: a `<form>` inside a `<form>` is invalid
  HTML and the browser drops the inner one, which would have put the dialog's fields back into the
  invoice's submit.
- **Dashboard** — the guest's `Payments` and `Inventory` tiles are removed; the dashboard is exactly
  the legacy four (Reports, Invoices, Cash Memo, Management).
- **Management create control** — the button reads legacy's `add new`.
- **Payments below an invoice** — the amount of a return can take an invoice below what was paid; the
  entry screen no longer renders an empty `Payments` section, only when `paidPayments` is non-empty.

Gates after this increment: `guest-smoke` 115/115, `autocomplete-check` 39/0, `hotkey-check` 62/0,
`route-snapshot` 49/0, `grid-preview-check` 14/0, `refdb-check` 12/12.

Test/tooling corrections were needed and are deliberate: three `guest-smoke` needles encoded the
old headings (`Start a sale invoice`, `New Section`) and now assert the legacy ones
(`SALE INVOICE`, `add new`); `autocomplete-check` and `refdb-check` both filter their invoice to a
**sale** (a difference invoice has no party field) and `autocomplete-check` checks the party select is
*unchanged* by the create flow rather than *empty* (a real sale may carry a party).

## Still open (the rest of A2 and the reopened list)

- **Report filter modal** behind the glyph, in addition to the inline row.
- **Remaining shell metrics** — spacing and per-screen layout, as the captures still show shape
  differences on the report/ledger and invoice screens (tiles, filters order, totals).
- **Return and difference invoice entry** — still unbuilt.
- **Invoice grid create-from-invoice affordance**.
- The two "take or leave" suggestions (remember last filters; sale price beside cost).

## Related

- [[ui-parity-discrepancies-2026-10-05]] — the original nine-item list this re-measures.
- [[tb-0023-guest-feature-parity]] — the work item.
- [[features-as-native-web-components]] — the decision behind `<aa-date-input>`.
