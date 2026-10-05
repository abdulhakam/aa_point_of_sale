---
title: Guest feature parity — every legacy capability, plus a better UI
type: task
status: doing
priority: high
created: 2026-09-27
updated: 2026-10-05
tags: [guest, ui, parity, legacy, cutover, autocomplete, usability]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[parity-is-functional-not-visual]]", "[[guest-frontend-feature-parity-gaps]]", "[[legacy-ui-reference-captures]]", "[[ui-parity-discrepancies-2026-10-05]]", "[[runtime-js-guest-platform]]", "[[mobile-layout-is-additive-to-the-legacy-look]]", "[[tb-0021-invoices-cashmemos-printing]]", "[[screen-parity-against-the-legacy-bundle-2026-10-04]]", "[[keyboard-layer-and-the-two-bugs-a-real-keystroke-found]]", "[[sale-price-adjustment]]"]
---

# Guest feature parity — every legacy capability, plus a better UI

Make the guest ([[runtime-js-guest-platform]]) able to do **everything the legacy app
([[frontend]]) could do**, and better where it can be.

> **Renamed 2026-10-05 from "Direct-shift the legacy UI onto the guest".** The old slug asserted a
> mandate that was withdrawn the same day — see [[parity-is-functional-not-visual]]. A slug is read as a
> claim, and this one was making a claim the operator had withdrawn.

## Mandate

**Functional parity, visual freedom.** The test is a **capability inventory** — for each legacy screen,
the actions, fields, filters, columns and states it offers — not a screenshot. Visual differences are
recorded, not fixed; [[legacy-ui-reference-captures]] is now a *capability* reference.
[[ui-parity-discrepancies-2026-10-05]] is evidence and a record of accepted differences, not a work list.

## Requested 2026-10-05

In the operator's order, with the reason each one was asked for.

- [x] **A real searchable autocomplete, replacing the select-beside-a-text-input pattern.** Every long
      `<select>` used to get a separate `filter…` box injected beside it, which is exactly the "looks
      bad" the operator named. Done 2026-10-05 — `app/public/js/autocomplete.js`, one control, keyboard
      first, **the native `<select>` stays in the form so submission is unchanged**. Selects under 12
      options are deliberately left alone: booker (4) and section (10) stay native, company (15), area
      (59), item (207) and party (943) become comboboxes. See [[the-searchable-autocomplete]].
      **Not included:** the create affordance — see the suggestion list below.
- [ ] **Create-party and create-item on the invoice pages.** Legacy lets an operator create a party or an
      item **from the invoice they are writing**, so a new customer never costs a detour. The guest's
      invoice grid has no such affordance. **This is now the highest-value item on the list**, and the
      autocomplete is the natural host for it — the control that finds a party should also be able to
      create one.
- [ ] **Fewer rail buttons.** The rail carries the five legacy destinations plus **Pages**, **Plugins**,
      the background-refresh dot and Logout — the last three are utility, not destinations. The operator
      read it as "too many buttons".
- [ ] **Sale price adjustment.** Not present in the guest at all. See [[sale-price-adjustment]] — the
      concept is ambiguous and the ruling is recorded there.
- [x] **Record the mandate change and remove the knowledge that conflicts with it.**
      [[parity-is-functional-not-visual]] supersedes [[guest-ui-is-a-direct-shift-of-legacy]]; the
      withdrawn decision is kept and marked, not deleted; the nine pixel discrepancies are re-triaged
      below.

## The re-triage of the nine pixel discrepancies

From [[ui-parity-discrepancies-2026-10-05]] Part 1. Under functional parity these split cleanly:

| # | discrepancy | ruling |
|---|---|---|
| A | management screens carry an inline create form, a count badge and card wrappers where legacy has a bare filter row and a table | **CLOSED as accepted.** The guest's page does strictly more, and the create form is the same capability legacy puts one click away |
| B | management tables have no sort arrows and no view action | **OPEN — capability.** Sorting and view are capabilities legacy has and the guest lacks. This is now a work item, not a pixel fix |
| C | management tables sit in bordered cards | **CLOSED as accepted** |
| D | report date inputs are native, so they look like the browser's | **OPEN — usability.** Native date inputs are a *worse* control than Mantine's on desktop |
| E | the select search box has no legacy counterpart | **CLOSED as accepted**, and superseded by the autocomplete item above |
| F | the invoice column is a bare number, not `S 8606` with a link | **OPEN — capability.** The link from a report to the invoice is the useful half |
| G | the Cash Memo tile uses the wrong glyph | **CLOSED as accepted** |
| H | the dashboard keeps an `Overview` counters card legacy lacks | **CLOSED as accepted**, and the smoke assertion that protected a divergence should be revisited on its own terms |
| I | the rail carries extra utility items | **OPEN — now the "fewer rail buttons" item above** |

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
      has to be keyboard-first to be worth having.
- [x] Screen inventory: 44 legacy screens against the guest's 68 routes, with the five that have no
      counterpart and why — [[screen-parity-against-the-legacy-bundle-2026-10-04]].

## Definition of done

**Every row of the capability inventory has a guest equivalent.** Named per screen: the actions a user
can take, the fields they can fill, the filters and columns they see, and the states the screen can be
in. A capability with no home is a gap; a capability with a different home is **not** a gap.

## Still open from the earlier framing

- [ ] Sortable management tables, and a view action on a row (**item B**).
- [ ] A link from a report's invoice column to the invoice (**item F**).
- [ ] Decide the category-4 differences in [[guest-frontend-feature-parity-gaps]] (opening balances,
      report-filter gating) and record the ruling.
- [ ] Decide, per category-5 item, whether the new-side-only screens (Companies, `/p`, plugins) are
      additions to keep or capabilities to converge.

## Suggestions, for the operator to take or leave

Offered because the mandate now allows them, and because each costs little next to what it saves.

1. **The autocomplete should create as well as find** — type a party that does not exist, get "create
   it", land back in the field. Legacy has this on the invoice screen (the create-party and create-item
   asks), and it is the single highest-value thing on this list: it removes the detour that costs an
   operator the most time in the whole app.
2. **A keyboard-first item entry.** With the autocomplete and [[keyboard-layer-and-the-two-bugs-a-real-keystroke-found]]
   in place, `Ctrl+Enter` to add a line and arrow-key selection inside the grid make invoice entry
   almost entirely typable. The grid is already a spreadsheet.
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
