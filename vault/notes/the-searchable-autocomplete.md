---
title: The searchable autocomplete, and the bug that made it ignore typing
type: note
status: active
created: 2026-10-05
updated: 2026-10-05
tags: [guest, ui, autocomplete, combobox, keyboard, accessibility, performance, client-js]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[tb-0023-guest-feature-parity]]", "[[parity-is-functional-not-visual]]", "[[runtime-js-minimal-file-authoring-contract]]", "[[keyboard-layer-and-the-two-bugs-a-real-keystroke-found]]", "[[minimise-client-side-calculation]]", "[[the-invoice-grid-has-no-cost-field]]", "[[legacy-ui-reference-captures]]", "[[ui-parity-discrepancies-2026-10-05]]", "[[client-side-live-recalculation]]"]
---

# The searchable autocomplete, and the bug that made it ignore typing

Requested as *"there's no searchable autocompletes in the new frontend, so please add one (right now its
a select beside a text input, it looks bad)"* — item 1 of [[tb-0023-guest-feature-parity]] under the
current mandate ([[parity-is-functional-not-visual]]).

`app/public/js/autocomplete.js`, loaded from `views/layout.html`. It replaces the select-plus-filter-box
pair that `enhanceSelects` used to inject.

## What it is

One control: a text field that filters as you type, with a list under it and a caret that opens it.
Type to filter · ↑↓ move · **Enter** choose · **Tab** choose and move on · **Esc** close, then blur — the
same two-stage Escape as the global layer, so one key press means the same thing everywhere
([[keyboard-layer-and-the-two-bugs-a-real-keystroke-found]]).

Prefix matches rank above substring matches. 50 options render at most.

## Four rules it will not break

1. **The native `<select>` stays in the form.** Hidden with `opacity: 0`, never detached, keeps its
   `name`. So **the form posts exactly what it posted before**, and choosing dispatches a real `change`
   event on the select so every existing handler keeps working — the invoice grid's price fill is the one
   that matters.
2. **Without JavaScript it is a normal form with normal selects.** Nothing here is needed to read or
   submit a page.
3. **A value that is not on the list is never submitted.** Free text is fine while typing; on blur it
   falls back to the select's own label. Nonsense typed over an *existing* choice reverts to that choice
   rather than clearing it, which is what every combobox does and is less destructive than the
   alternative.
4. **Short selects are left alone**, below **12 options**. Measured on this app's own data: booker 4 and
   section 10 stay native selects; company 15, area 59, item 207 and party 943 become comboboxes. A
   combobox that filters four bookers is theatre — and it also means the report filter row is not seven
   identical controls.

## The bug worth recording

`show()` opened the list on the first character and then **returned early on every subsequent one**:

```js
function show() { if (open) return; filter(); … }
input.addEventListener("input", show);
```

So the list opened on `k` and never narrowed again. `k` matches almost every party name in this
database, so after typing `kar` the list still showed **943 options** and the operator was typing into a
control that was no longer listening. The gate caught it as *"typing narrows the list — 943 options for
'kar'"*, which reads as a data problem and was a control problem.

The fix splits the two questions the function was conflating: `refresh()` always re-filters, `show()`
only decides whether the list is *visible*.

```js
function show() {
  // This must NOT return early when already open…
  refresh();
  if (open) return;
  …
}
```

The same commit also capped an empty query at 50 rendered options. The invoice grid has **37** of these
controls on one page, and an empty query was rendering every option into the DOM — 943 `<li>` per open,
per control.

## The gate

`tools/autocomplete-check.mjs` — headless Chrome, real `Input.dispatchKeyEvent`, **25 checks**. It exists
because the risk here is silent: a combobox that looks right, feels right and submits nothing is
indistinguishable from one that works, until an invoice saves without a party.

So the assertions that matter most are not about looks:

- the form submits the chosen **id**, and it is not the **label**;
- **the server accepts it** and the report renders — the request is actually made;
- a value that is not on the list is never submitted (both cases: empty control, and over a real choice);
- choosing dispatches exactly one `change`;
- picking an item by keyboard still fills the price — the integration point that breaks silently if
  `change` is not dispatched;
- short selects are untouched.

## Two of my own assertions were wrong about the product

Worth recording, because it is the second time in two days (the first: [[minimise-client-side-calculation]]).

**1.** "Picking an item fills price and cost" — it failed on a row already carrying `114.583333`,
because the grid deliberately does not overwrite a price the operator set. The test asserted the
**opposite of the documented rule**; it now clears the cell first and asserts the real contract.

**2.** "Text matching nothing clears the control" — it failed because the control held an earlier
choice. There are **two** contracts here, not one: an empty control must stay empty, and a control with
a choice must revert to it. The test now asserts both.

**And the third failure was a finding, not a bug:** the grid renders **no `cost_price` field at all**, so
`app.js`'s cost half can never fire — [[the-invoice-grid-has-no-cost-field]].

## Cost

`autocomplete.js` is ~200 lines and replaces ~45. The filtering runs over a plain array of
`{value, label}` built once at init from the select's own options, and the list is painted only when
open — so per keystroke it is a substring scan over ≤943 short strings, no DOM reads, and ≤50 writes.
That is the same work `enhanceSelects` did, minus the second control.

## Not done

- **No "create" in the autocomplete.** Typing a party that does not exist shows `No match` and nothing
  else. The create affordance is the highest-value item on the suggestion list in
  [[tb-0023-guest-feature-parity]] and is deliberately a separate change: it needs a decision about
  which fields a quick-create collects.
- **No async lookup.** The whole list is in the page, which is fine at 943 parties and would not be at
  50,000. When it stops being fine, the filter moves server-side and this component keeps its shape.
- **No touch-specific affordances.** The mobile layout has no combobox gestures
  ([[mobile-layout-is-additive-to-the-legacy-look]]).

## Gates

| gate | result |
|---|---|
| `tools/autocomplete-check.mjs` | **25 passed, 0 failed** |
| `tools/guest-smoke.mjs` | **passed in full** |
| `tools/hotkey-check.mjs` | **34 passed, 0 failed** |
| `tools/grid-preview-check.mjs` | **14 passed, 0 failed** |
| `tools/route-snapshot.mjs` | **49 routes, 0 erroring** |
| `tools/db-digest.mjs` | 60,245 → 60,246, only the seeded `Difference` party |

⚠️ One route-snapshot run mid-work showed `outstanding` and `difference` 500ing. Both answer 200 on a
plain fetch and the snapshot is clean on a quiet machine — they sit at the **WASM call deadline**
(`outstanding` is 15.5 s against 20 s) and flake when something else is using the CPU. Recorded because
"it passed on the retry" is exactly how a real deadline problem gets lost
([[heavy-report-blocks-runtime-threads]]).

## Related

- [[tb-0023-guest-feature-parity]] — the request this is item 1 of.
- [[runtime-js-minimal-file-authoring-contract]] — why the native select is kept in the form.
- [[keyboard-layer-and-the-two-bugs-a-real-keystroke-found]] — the Esc convention and the drive-it rule.
