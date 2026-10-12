---
$schema: "./decisions.schema.json"
title: Quick-create rides in the form that needed it
type: decision
status: accepted
decided_on: 2026-10-05
created: 2026-10-05
updated: 2026-10-07
tags: [invoices, parties, items, guest, forms, legacy-parity, client-js]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[the-searchable-autocomplete]]", "[[reference-lists-come-from-indexeddb]]", "[[tb-0023-guest-feature-parity]]", "[[runtime-js-minimal-file-authoring-contract]]", "[[v1-categories-map-to-companies]]", "[[guest-writes-via-sql]]", "[[money-is-2dp-everywhere]]", "[[keyboard-layer-and-the-two-bugs-a-real-keystroke-found]]"]
---

# Quick-create rides in the form that needed it

## Context

The legacy invoice screen let an operator create a party or an item without leaving the invoice they
were writing. The guest lost that, so a new customer cost a walk to Management, the full form, and a
hunt through a 943-entry combobox on the way back. [[tb-0023-guest-feature-parity]] calls it the
single most expensive detour in the app, and it was the one thing
[[the-searchable-autocomplete]] deliberately left open: "it needs a decision about which fields a
quick-create collects".

The legacy fields were recovered from the compiled bundles rather than guessed:

| flow | fields | after |
|---|---|---|
| sale → create party | name, area, phone, address; `type` hardcoded **customer** | list invalidated, NOT auto-selected |
| purchase → create party | name only; `type` hardcoded **supplier**; ALSO creates a `categories` row of the same name and links it | not auto-selected |
| invoice → create item | name, CP, SP, carton size, company | not auto-selected |

## Decision

### 1. The create travels in the form's own submit

The panel the combobox opens is rendered by `views/partials/quick-create.html.jinja` **inside the form it
serves** — the invoice's start form, its header form, or the add-a-line form. Its fields are part of
that form, so "create the party" and "save the header" are one POST, and "create the item" and "add
the line" are one POST. The redirect afterwards lands back on the same invoice with everything saved.

The alternatives were rejected on the app's own terms:

- **A fetch that creates the row and injects an option** is what the legacy did, and it is the one
  shape [[runtime-js-minimal-file-authoring-contract]] rules out: "queries/requests should be form
  methods/actions". It would also add a second write path beside `/management/{entity}/create`.
- **Navigating to a create page and returning** is a smaller detour, not the removal of one — and on
  the grid it would lose every unsaved line.
- **A `target`-ed iframe** needs the same JS to inject the option anyway, and hides the error page.

### 2. The panel is disabled while closed, and that is the whole signal

A hidden input is still submitted, so hiding the panel is not enough: a "Save header" after an
abandoned create would have carried the typed name into the database. Every control in a closed panel
is `disabled`, so nothing from it is posted, and the routes key off one thing — "`party_new_name` is
non-empty". No marker field, and nothing for a caller to remember to clear.

⚠️ The disabling has to happen **after every combobox on the page has been enhanced**, not from the
party select's own `enhance()`. The panel contains an area combobox, and enhancing *that* injects an
input into the panel — after the party's `enhance()` had already walked it. The first draft therefore
left one enabled control in a "closed" panel. `autocomplete.js` does it for every `.qc` at the end of
`init()`. The assertion that caught it is in `tools/autocomplete-check.mjs`.

### 3. `required` is never in the panel's markup

A hidden, `required` input still blocks form submission — the browser validates it whether or not
anyone can see it — so the header form would have been unsubmittable with JavaScript off. The
combobox sets `required` on the name when it opens the panel, drops it again on close, and the server
checks it anyway. It also drops the enclosing select's own `required` (the line form's item is
required) for exactly as long as the panel is open, because otherwise the browser refuses the submit
that creates the item.

### 4. Which fields each create collects

- **Party**: name, area, phone, address — the legacy sale form — for A customer **and** a supplier.
  The legacy collected only the name on a purchase; the extra three are optional and the same panel
  serves both, so being able to capture an area for a new supplier is a gain, not a divergence.
- **Item**: name, company, cost price, sale price, carton size — the legacy form exactly.

**A supplier also gets a company of its own name.** That is not an embellishment: it is what the
legacy purchase screen did, and the migrated data is full of it — every one of the 13 supplier parties
has a `party_companies` row, and 14 of the 15 companies are named after a party. Suppliers were the
legacy `categories` collection, which maps onto `companies`
([[v1-categories-map-to-companies]]), so a supplier without one leaves its goods uncategorised and
the operator making the company by hand — the detour this exists to remove. The company is
**find-or-create**: the legacy made a second one each time, which is a duplicate row with no upside.

### 5. Party type is derived from the invoice, in one place

Invoice type and party type are the same two names in the opposite order — invoice `0` is *purchase*,
party `0` is *customer* — so `lib/quick-create.js` holds exactly one translation
(`partyTypeForInvoice`) and it is the only code allowed to know it. The first draft of this feature
shipped the inversion, and `guest-smoke.mjs` asserts the direction on both a sale and a purchase for
that reason.

### 6. A newly created item's price wins over the form's default

The line form ships `price` with a default of `0`. Taking that literally would add every new item to
its invoice at zero — the one thing create-and-add must not do. When the item was created in this
same submit and the price is absent **or still at its default**, the line takes the item's own sale
price; a number the operator typed wins, as it does everywhere else. The existing-item path is left
untouched, because that is money behaviour nobody asked to change.

### 7. Writes go through `management.createRow`

The same call `/management/{entity}/create` makes, inside the invoice's lock and the route's
`write()`. Not a second INSERT: the column types, the 2-decimal money rounding
([[money-is-2dp-everywhere]]) and the required-field checks all live there. Two copies would drift.

## Scope

Implemented on **`/invoices/new` and `/invoices/{id}`** — the screens `/invoices` links to, and the
only ones whose create forms are single-valued.

**Not implemented on the invoice grid** (`/invoices/{id}/grid`), whose item selects are repeated-name
arrays inside one form; a create there needs per-row field alignment and is a separate change. The
party control on the grid is the same shape as the entry screen's, so it is the item half that is
missing, not both. Recorded rather than half-built.

**Not on cash memos, payments or the report filters.** The legacy had this on the invoice screen;
those screens have no create form to host it.

## Added 2026-10-07: a no-reload path, with the form path kept

The owner asked for a created product/party to land in the searchable select **without a page
reload** ([[reference-lists-come-from-indexeddb]]). The section above chose one submit — create and
save the invoice together — which is a page load. Both are now available:

- **With JavaScript and the refdb cache present**, the panel's button POSTs `POST /quick-create`
  (`ahscripts/routes/quick-create/route.ts`), which creates the row through the same
  `A.quickCreate.*FromForm` calls, and `public/js/refdb-create.js` puts the row in the cache and
  selects it in the control that opened the panel. The invoice is **not** saved by this POST; the
  operator then saves the header, or adds the line, as a separate, normal submit — which is what the
  legacy screen did (create-and-select, then save).
- **Without JavaScript, or if the fetch fails**, the button submits the invoice form exactly as
  before, and the create rides in that submit. The form path is the fallback, so a create is never
  lost.
- The buttons are now labelled **"Create party"** and **"Create item"** rather than "…and use" /
  "…and add line", because the JS path does not add the line; the ADD LINE button does.
- Decision 2 (the panel is inert while closed), decision 3 (`required` handover) and decision 7
  (`management.createRow`) are unchanged.

## Evidence

- `trailbase/runtime/app/views/partials/quick-create.html.jinja` — the two panels.
- `trailbase/runtime/app/lib/quick-create.js` — the create calls and the one type translation.
- `trailbase/runtime/app/public/js/autocomplete.js` — the "Create …" row, the panel's open/close, the
  inert-when-closed rule, and the `required` handover.
- `trailbase/runtime/ahscripts/routes/_app/route.ts` — the three handlers.
- `trailbase/tools/guest-smoke.mjs` — 91 checks, including the four creates and the price rule.
- `trailbase/tools/autocomplete-check.mjs` — 39 checks, including that a closed panel is inert.
- Legacy field sets: the compiled bundles under `legacyforparity/standalone/.next/server/`.
- Supplier companies: `SELECT COUNT(DISTINCT party) FROM party_companies JOIN parties … WHERE type = 1`
  → 13 of 13 suppliers; 14 of 15 companies share a party's name.

## Related

- [[the-searchable-autocomplete]] — the control this hangs off; its "Not done" list shortened by one.
- [[tb-0023-guest-feature-parity]] — the parity list this closes the top item of.
- [[runtime-js-minimal-file-authoring-contract]] — why this is a form post and not a fetch.
