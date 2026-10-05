---
title: The invoice grid has no cost field, so the cost fill is inert
type: issue
status: open
created: 2026-10-05
updated: 2026-10-05
tags: [guest, invoice, grid, cost, margin, dead-code, finding]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[sale-price-adjustment]]", "[[tb-0023-guest-feature-parity]]", "[[client-side-live-recalculation]]", "[[data-model]]", "[[minimise-client-side-calculation]]", "[[guest-invoice-lifecycle]]"]
---

# The invoice grid has no cost field, so the cost fill is inert

Found on 2026-10-05 while writing the autocomplete's gate, by an assertion that was **wrong about the
product** and therefore had to be re-derived from the code.

## What is there

`app/public/js/app.js` fills a row's price **and cost** when an item is chosen:

```js
select.addEventListener("change", function () {
  var option = select.options[select.selectedIndex];
  if (option && option.dataset.price !== undefined) {
    if (!price.value || Number(price.value) === 0) price.value = option.dataset.price;
    if (cost && !cost.value) cost.value = option.dataset.cost || "";   // `cost` is always null
  }
```

and the item options **do** carry the data it wants:

```html
<!-- app/views/invoices/grid.html:96 and :135 -->
<option value="…" data-price="8.33333" data-cost="7.33333" data-box="288">CHILLI GARLIC 22GM</option>
```

**`invoices/grid.html` contains no `cost_price` input.** The only occurrences of the string are those
two `data-cost` attributes. So `row.querySelector('input[name="cost_price"]')` matches nothing, `cost` is
always `null`, and the guard `if (cost && …)` silently skips. **The cost half of that handler has never
done anything.**

The `lineOf()` reader has the same shape — `cell("cost_price")` returns `""` for every row — and the
preview's `lineAmount()` does not use cost at all, so nothing else depends on it. **There is no wrong
number here: there is a field nobody can see and a handler that cannot fire.**

## Why it was not simply added

Because "should an invoice line show cost" is a **margin** question, not a rendering one, and it sits
next to the still-open sale-price ruling ([[sale-price-adjustment]]). An operator entering a sale may not
want cost per line on screen; a manager reviewing margin does. Adding a column to the grid for everyone
decides that question by accident.

So this is filed, not fixed. The decision needed: **is cost per line an entry field, a review field, or
neither?**

## What is *not* wrong, and was nearly "fixed" by mistake

The gate's first version asserted that picking an item fills price **and** cost, and it failed on cost.
The price part failed too, on a row that already carried `114.583333` — because the grid deliberately
does **not** overwrite a price the operator has set:

> `if (!price.value || Number(price.value) === 0) price.value = option.dataset.price;`
> — *"unless they were already set — the operator's number always wins"*

So the first version of the test asserted the **opposite of the documented rule**, in two places. It
was corrected to clear the cell first and assert the real contract: pick into an **empty** cell and the
price arrives.

Recorded because it is the second time in two days a test written to check a feature ended up asserting
a bug instead — the first was the grid total, where "the total must move" was right but "the total must
move by the line's delta" was not ([[minimise-client-side-calculation]]). **A test that fails for a
reason you did not anticipate is a question about the product, not only about the test.**

## Evidence

`tools/autocomplete-check.mjs`, driving real keystrokes on the heaviest invoice (36 lines):

```text
PASS  picking an item by keyboard selects it
PASS  ...and fills the price into an empty cell
PASS  the grid renders no per-line cost field (so app.js's cost fill is inert)
```

The third line is the finding, asserted rather than assumed — so if a cost field is ever added, the
gate says so.

## Related

- [[sale-price-adjustment]] — the adjacent open question; cost per line belongs to the same ruling.
- [[client-side-live-recalculation]] — the decision covering the grid's client-side arithmetic.
