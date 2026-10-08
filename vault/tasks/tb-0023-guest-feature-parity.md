---
title: Guest feature parity — every legacy capability, plus a better UI
type: task
status: doing
priority: high
created: 2026-09-27
updated: 2026-10-08
tags: [guest, ui, parity, legacy, cutover, autocomplete, usability]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[parity-reinstates-the-legacy-look-with-defect-fixes]]", "[[reference-lists-come-from-indexeddb]]", "[[parity-is-functional-not-visual]]", "[[guest-frontend-feature-parity-gaps]]", "[[legacy-ui-reference-captures]]", "[[ui-parity-discrepancies-2026-10-05]]", "[[ui-parity-discrepancies-2026-10-08]]", "[[ui-parity-restyle-progress-2026-10-08]]", "[[features-as-native-web-components]]", "[[runtime-js-guest-platform]]", "[[mobile-layout-is-additive-to-the-legacy-look]]", "[[tb-0021-invoices-cashmemos-printing]]", "[[screen-parity-against-the-legacy-bundle-2026-10-04]]", "[[keyboard-layer-and-the-two-bugs-a-real-keystroke-found]]", "[[sale-price-adjustment]]"]
---

# Guest feature parity — every legacy capability, plus a better UI

Make the guest ([[runtime-js-guest-platform]]) able to do **everything the legacy app
([[frontend]]) could do**, and better where it can be.

> **Renamed 2026-10-05 from "Direct-shift the legacy UI onto the guest".** The old slug asserted a
> mandate that was withdrawn the same day — see [[parity-is-functional-not-visual]]. A slug is read as a
> claim, and this one was making a claim the operator had withdrawn.

## Mandate

**Retargeted 2026-10-07: the legacy look is required again, with legacy defects fixed.**

The owner asked for the guest to **look and behave exactly like the legacy app** while keeping the
SQL calculation layer — [[parity-reinstates-the-legacy-look-with-defect-fixes]]. This **supersedes
the visual-freedom half** of [[parity-is-functional-not-visual]]; its **capability-inventory test
survives** and is still how coverage is counted. [[ui-parity-discrepancies-2026-10-05]] becomes a
work list again, with a **defect-fix carve-out**: friendly column labels, real `<th>` cells, the full
action heading, the searchable autocomplete and the create-from-the-invoice affordance stay.

Plan and sequence: `.kilo/plans/1791404570000-legacy-look-and-indexeddb-refs.md`. Alongside the
restyle, the owner asked for an IndexedDB reference store behind the dropdowns —
[[reference-lists-come-from-indexeddb]].

> **Prior mandate (2026-10-05 → 2026-10-07), kept on record.** *Functional parity, visual freedom.*
> The test was a **capability inventory** — for each legacy screen, the actions, fields, filters,
> columns and states it offers — not a screenshot; visual differences were recorded, not fixed. The
> capability-inventory half still stands; the visual-freedom half is withdrawn by the 2026-10-07
> decision above.

## Requested 2026-10-05

In the operator's order, with the reason each one was asked for.

- [x] **A real searchable autocomplete, replacing the select-beside-a-text-input pattern.** Every long
      `<select>` used to get a separate `filter…` box injected beside it, which is exactly the "looks
      bad" the operator named. Done 2026-10-05 — `app/public/js/autocomplete.js`, one control, keyboard
      first, **the native `<select>` stays in the form so submission is unchanged**. Selects under 12
      options are deliberately left alone: booker (4) and section (10) stay native, company (15), area
      (59), item (207) and party (943) become comboboxes. See [[the-searchable-autocomplete]].
      **Create affordance: done 2026-10-05** — see the item below and
      [[quick-create-rides-in-the-form-that-needed-it]].
- [x] **Create-party and create-item on the invoice pages.** Legacy lets an operator create a party or an
      item **from the invoice they are writing**, so a new customer never costs a detour. Done
      2026-10-05: the combobox's "Create …" row opens a panel **inside the invoice's own form**, so the
      create rides in the same submit — a new party saves the header, a new item adds the line, and
      nothing typed is lost. The legacy field sets were recovered from the compiled bundles; a purchase's
      new supplier also gets a company of its own name, as legacy did and as the migrated data shows on
      all 13 suppliers. See [[quick-create-rides-in-the-form-that-needed-it]].
      **Not on the invoice grid** (`/invoices/{id}/grid`) — its item selects are repeated-name arrays in
      one form and need per-row handling; recorded in the decision note rather than half-built.
- [x] **Fewer rail buttons.** The rail carries the five legacy destinations plus **Pages**, **Plugins**,
      the background-refresh dot and Logout — the last three are utility, not destinations. The operator
      read it as "too many buttons". **Done 2026-10-05:** Pages, Plugins and the refresh dot now collapse
      behind one "more" (⋯) menu at the rail's foot; Logout stays visible because the legacy rail ends
      with it. A `<details>` menu, so it works with no JavaScript.
- [x] **Sale price adjustment.** Not present in the guest at all. See [[sale-price-adjustment]] — the
      concept is ambiguous and the ruling is recorded there. **Ruled 2026-10-05: reading (a)** — adjust a
      line's price directly on the invoice being written, for that invoice only. The price was already
      editable; what was missing was legibility, so the grid now shows the item's list price beside the
      editable price ("list 8.33") so an adjustment is visible after the fact.
- [x] **Record the mandate change and remove the knowledge that conflicts with it.**
      [[parity-is-functional-not-visual]] supersedes [[guest-ui-is-a-direct-shift-of-legacy]]; the
      withdrawn decision is kept and marked, not deleted; the nine pixel discrepancies are re-triaged
      below.

## The re-triage of the nine pixel discrepancies

From [[ui-parity-discrepancies-2026-10-05]] Part 1. Under functional parity these split cleanly:

| # | discrepancy | ruling |
|---|---|---|
| A | management screens carry an inline create form, a count badge and card wrappers where legacy has a bare filter row and a table | **CLOSED as accepted.** The guest's page does strictly more, and the create form is the same capability legacy puts one click away |
| B | management tables have no sort arrows and no view action | **DONE 2026-10-05.** Headers are now clickable (client-side sort, asc/desc arrow), and each row gained a green view action |
| C | management tables sit in bordered cards | **CLOSED as accepted** |
| D | report date inputs are native, so they look like the browser's | **OPEN — usability.** Native date inputs are a *worse* control than Mantine's on desktop |
| E | the select search box has no legacy counterpart | **CLOSED as accepted**, and superseded by the autocomplete item above |
| F | the invoice column is a bare number, not `S 8606` with a link | **DONE 2026-10-05.** The Profit and Item Sales invoice column is now `S 8606` — type letter prefixed, linking to `/invoices/<id>/view` |
| G | the Cash Memo tile uses the wrong glyph | **CLOSED as accepted** |
| H | the dashboard keeps an `Overview` counters card legacy lacks | **CLOSED as accepted**, and the smoke assertion that protected a divergence should be revisited on its own terms |
| I | the rail carries extra utility items | **DONE — the "fewer rail buttons" item above** |

## Reopened 2026-10-07 (legacy look reinstated)

Under [[parity-reinstates-the-legacy-look-with-defect-fixes]], the pixel-only items closed on
2026-10-05 are work again, minus the defect-fix carve-out:

- [x] **A — management screens.** Move the inline create form off the list page; match legacy's bare
      filter row and table (no headings, no count badge, no card wrappers). **Done 2026-10-08** —
      `views/management/list.html`, the create panel behind `?new=1`.
- [x] **C — management cards.** Remove the nested bordered cards; legacy is borderless except the
      table grid. **Done 2026-10-08** with A. The management table border was also corrected to black
      (the earlier comment wrongly claimed only report tables were black; `ui-parity-report` metric
      `thBorder` measured legacy `rgb(0,0,0)`).
- [x] **D — report date inputs.** Replace the native `input[type=date]` (browser calendar button) with
      a legacy-like date control. **Done 2026-10-08** — `<aa-date-input>`
      ([[features-as-native-web-components]]).
- [x] **G — Cash Memo tile glyph.** Match legacy's filled blue € circle. **Done 2026-10-08** —
      `coin-euro-filled`.
- [x] **H — dashboard `Overview` counters card.** Remove it and fix the `guest-smoke` assertion that
      protects a divergence. **Done 2026-10-08** — card gone, `guest-smoke.mjs:287` now asserts
      "Cash Memo".
- [x] **Rail.** Reduce to legacy's six icons (including Logout at the foot); move Pages, Plugins and
      the refresh dot behind the foot menu. **Done 2026-10-08** — five legacy destinations in legacy
      order + Logout; Payments/Inventory/Print also moved behind the foot menu.
- [x] **Body link colour** to legacy grey `rgb(73,80,87)` on every screen. **Done 2026-10-08** —
      `a { color: gray-7 }`; the `linkColor` metric no longer differs.
- [ ] **Report filter modal** behind the glyph, in addition to the inline row.
- [x] **Shared shell** fonts/spacing/metrics to match Mantine's rendering. **Font stack, link colour,
      table border and the date control done 2026-10-08**; per-screen spacing/layout continues (A2).

Progress and the fresh discrepancy list: [[ui-parity-restyle-progress-2026-10-08]].

Plus the client-side reference store:

- [x] **IndexedDB ref store** for the nine dropdown lists — [[reference-lists-come-from-indexeddb]].
      Done 2026-10-07: `GET /data/refs` (98 KB, ETag/304), `public/js/refdb.js`, an
      `autocomplete.js` in-place refresh on `refdb:select`, `public/js/refdb-create.js` +
      `POST /quick-create` for the no-reload create (form fallback kept), and
      `tools/refdb-check.mjs` (**11 passed**). `invoices` deferred with its reason (its only
      dropdown is a computed unpaid/balance list over `payments`).

## Re-measured 1-1 against the live legacy, 2026-10-08

With operator-supplied legacy credentials (`user`/`admin`), both apps were captured side by side for
the first time (`ui-capture --system both`), and the rail's membership **and order** are now compared.
The full exact list is [[ui-parity-discrepancies-2026-10-08]]; the raw diff is
`vault/attachments/ui-capture/parity.json`. It corrects the earlier "five rail destinations" claim —
the legacy rail carries **six including Orders** — and shows a **reversed management-hub order** and a
**hub-vs-list `/invoices`** mismatch that the earlier one-sided diffs could not see.

- [x] **Check the UI parity 1-1** and record the exact differences. Done 2026-10-08.
- [x] **Report filter modal** — add the legacy "Filter Data" dialog (stockreport, difference) as a
      reusable component ([[features-as-native-web-components]]). **Done 2026-10-08** — `<aa-modal>`
      (Mantine 440px card, H2 title, X, overlay, Escape), auto-open on an empty `company`, OK submits;
      the two reports declare `filtersModal` in their meta. Progress:
      [[ui-parity-discrepancies-2026-10-08]].
- [ ] **Report filter labels** — `date from`/`date to`; review the autocomplete label text.
- [x] **Management `Created` column** and the items/bookers column sets. **Done 2026-10-08** —
      `created` on sections/areas/companies/bookers, bookers' "Companies"→"Company", and items now
      `Company / Name / Cost price / Sale price / Qty / Carton Size` with the legacy **Qty** display
      (`165 (1 ctn 21 units)`, signed stock read from the same `itemsReport` view the stock report and
      `/inventory` use).
- [x] **Management hub order** — sections, areas, parties, companies, bookers, items. **Done 2026-10-08**
      (order + lowercase key labels; "bookers" not "order bookers").
- [x] **Invoices hub vs list** — legacy `/app/invoices` is a five-tile hub; the guest is a list.
      **Done 2026-10-08** — `/invoices` is now the five-tile hub (Purchase, Sale, Print Invoices,
      Return, Difference); the list moved to `/invoices/all`. The entry route accepts all four
      `invoice_types` (it had coerced every create to 0/1 and ignored the form's own type), so the
      **Difference** and **Return** entries exist.
- [x] **Cash-memo tile set/labels** — da entry-purchases / crv / cpv / payments / expenses. **Done
      2026-10-08** — five legacy tiles, legacy order/labels/colours; the guest-only summary card, date
      filter and crumb removed.
- [ ] **Rail** — the Orders decision and the foot-menu extras.
- [x] **Colours** — active rail link (guest blue, legacy gray). **Done 2026-10-08** (active glyph back
      to gray-7 on the blue-0 chip). Raw/tile anchor colour still open.

## Already done, and still standing

- [x] The shared look ported 2026-09-27 (header, rail, tiles, tables, login) —
      `[[guest-ui-is-a-direct-shift-of-legacy]]`.
- [x] The legacy printout header as configuration ([[environment]]).
- [x] Screenshot-diffed 32 screens against the legacy reference and settled ten differences —
      [[ui-parity-discrepancies-2026-10-05]]. Two of the ten were real defects: the Profit and Item
      Sales reports printed the invoice number as a float (`1.0`), and the report period had never
      rendered because the page frame carries no `meta`.
- [x] Keyboard layer, so the app is operable without the mouse —
      [[keyboard-layer-and-the-two-bugs-a-real-keystroke-found]]. Relevant here because an autocomplete
      has to be keyboard-first to be worth having. **Extended 2026-10-05 to the reports, ledgers and hubs**,
      which the first version had never been driven against: `/` now filters a report's rows, `j/k` walk
      the tile grids on `/reports` and `/dashboard`, `Ctrl+F`/`Ctrl+L` went back to the browser, and four
      more dead keys were found — including `Alt+ArrowDown`, which had never worked anywhere. 62 checks.
- [x] Screen inventory: 44 legacy screens against the guest's 68 routes, with the five that have no
      counterpart and why — [[screen-parity-against-the-legacy-bundle-2026-10-04]].

## Definition of done

**Every row of the capability inventory has a guest equivalent.** Named per screen: the actions a user
can take, the fields they can fill, the filters and columns they see, and the states the screen can be
in. A capability with no home is a gap; a capability with a different home is **not** a gap.

## Still open from the earlier framing

- [x] Sortable management tables, and a view action on a row (**item B**) — done 2026-10-05.
- [x] A link from a report's invoice column to the invoice (**item F**) — done 2026-10-05.
- [x] Decide the category-4 differences in [[guest-frontend-feature-parity-gaps]] (opening balances,
      report-filter gating) and record the ruling. **Ruled 2026-10-05:** opening balances are a manual
      per-period input — already present on the general ledger ([[report-routes-ignore-date-defaults]]).
      The report-filter gating question (legacy filter modal vs inline) stays open, recorded below.
- [x] Decide, per category-5 item, whether the new-side-only screens (Companies, `/p`, plugins) are
      additions to keep or capabilities to converge. **Ruled 2026-10-05: keep as additions** — they are
      permitted under functional parity and the operator wants them available.

## Suggestions, for the operator to take or leave

Offered because the mandate now allows them, and because each costs little next to what it saves.

1. ~~**The autocomplete should create as well as find**~~ **DONE 2026-10-05.** Type a party that does
   not exist, get "Create …", fill the few fields and land back with it selected. Legacy had this on the
   invoice screen, and it was the single highest-value item on this list.
   See [[quick-create-rides-in-the-form-that-needed-it]]. Remaining gap: the invoice **grid**, whose item
   selects are repeated-name arrays in one form.
2. **A keyboard-first item entry.** With the autocomplete and [[keyboard-layer-and-the-two-bugs-a-real-keystroke-found]]
   in place, `Ctrl+Enter` to add a line and arrow-key selection inside the grid make invoice entry
   almost entirely typable. The grid is already a spreadsheet.
   **Assessed 2026-10-05, mostly already present.** The keyboard layer gives `Alt+Arrow` field
   navigation across the grid's cells and `Ctrl+Enter` to submit the form. A separate "add a line on
   Enter" would need a per-line append endpoint, which the batch-save grid model
   ([[no-draft-invoices-published-on-save]]) does not have — the blank row *is* the add. Left as-is
   rather than half-built; a per-line-append endpoint is its own change.
3. **Remember the last filters.** A report filter set is usually the same all day; the guest drops it on
   every navigation. One "remember per report" toggle beats re-picking eight selects.
4. **Put the rail's utilities behind one menu.** Six destinations and three utilities is two lists
   wearing one coat. Destinations stay on the rail; refresh, Pages, Plugins and Logout go under a footer
   menu.
5. **Fix the general ledger's default window.** It ends *today* while the other three ledgers end at the
   last day in the data, so it silently shows less than the rest — see
   [[party-and-booker-ledgers-render-empty-and-say-nothing]]. A capability bug wearing a UI costume.
6. **Show the sale price wherever the cost is shown.** Whoever asks for sale-price adjustment is
   thinking about margin; a margin column next to the profit report's profit would answer the same
   question without arithmetic.

## Related

- [[parity-is-functional-not-visual]] — the mandate.
- [[guest-frontend-feature-parity-gaps]] — the gap list, now the central document.
- [[sale-price-adjustment]] — what "sale price adjustment" was taken to mean, and what is still open.
