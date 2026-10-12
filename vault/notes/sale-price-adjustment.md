---
title: "Sale price adjustment: what the ask was taken to mean, and what is still open"
type: note
status: closed
created: 2026-10-05
updated: 2026-10-05
tags: [items, pricing, sale-price, invoice, ambiguity, ruling-needed, margin]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[tb-0023-guest-feature-parity]]", "[[parity-is-functional-not-visual]]", "[[data-model]]", "[[money-is-2dp-everywhere]]", "[[reports-and-ledgers]]", "[[client-side-live-recalculation]]", "[[invoice-lifecycle-draft-open-append-only]]", "[[guest-frontend-feature-parity-gaps]]"]
---

# "Sale price adjustment": what the ask was taken to mean, and what is still open

Requested on 2026-10-05 as one of five items: **"sale price adjustment"**. Two words, three readings, and
the vault's own rule is not to build on a guess — so this note records what was checked, what each
reading would mean, and which one is proposed. **One line from the operator settles it.**

## What already exists

Checked before designing anything, because "add a sale price field" would have been a wrong fix for a
field that is already there.

| | exists? | where |
|---|---|---|
| `items.sale_price` column | **yes** | `migrations/main/…` — part of the imported schema |
| a **Sale price** input on the item form | **yes** | `app/views/management/index.html.jinja:61`, labelled "Sale price" |
| the item's sale price reaching an invoice line | **yes** | the grid's item options carry `data-price`, and `data-price` **is** `sale_price` — verified: `CHILLI GARLIC 22GM` has `cost_price 7.33333`, `sale_price 8.33333`, and its option renders `data-price="8.33333" data-cost="7.33333"` |
| a per-line price override | **yes** | `app.js` fills the price only when the cell is empty or zero, so typing over it wins — the operator's number always wins |

The legacy app uses the same two columns, labelled **`CP`** and **`SP`** in
`management/items/page.js`, and reads `sale_price` on the Stock and Difference reports.

**So the data model is not the gap.** On all 207 items: `sale_price` is populated and non-zero, none is
below cost, and the mean margin is **13.64%**.

## The three readings

**(a) Adjust the price on an invoice line away from the item's sale price.** *Already possible* — type
over the cell. The only thing missing is that the operator cannot see what the line *was* priced at, so
an adjustment is invisible after the fact: nothing on the line says "this was 8.33, sold at 8.00".

**(b) A quick adjust action on the item list** — change an item's sale price without opening its form,
because a price change is a one-column edit and the form is a page. The legacy `/app/management/items`
has no such action either (its bundle has no `adjust`, `increase`, `decrease` or `margin`), so this would
be a **new-side addition**, which [[parity-is-functional-not-visual]] explicitly permits.

**(c) A bulk price adjustment** — raise or halve the sale price across a category, or by a percentage.
The highest-value version and the most dangerous: it rewrites 207 rows at once with no per-row undo.

## What is proposed, and why

**Reading (a), plus the visibility it implies**, because it is the one that is currently *broken* rather
than absent, and because it is the one an invoice actually needs:

1. **The grid keeps the item's sale price visible** once a line is priced, so an adjustment is legible.
   Concretely: the read-only line amount already exists; what is missing is the original price beside it.
2. **A per-line "was" and the delta.** `transactions` already stores `price` per line, so the *saved*
   adjustment is reconstructible from the line history — but not on screen.

And **reading (b)** as a small, safe addition: an inline sale-price cell on the items list that saves on
blur. It is one column, one request, and it is the thing a shop does weekly.

**Reading (c) is explicitly not proposed** without a separate decision, because it is a bulk rewrite of
money columns and [[money-is-2dp-everywhere]] plus the imported prices that are still unrounded
([[minimise-client-side-calculation]]) make it the one change on this list that could quietly move a
lot of money.

## The open question

> **When you say "sale price adjustment", do you mean adjusting the price on an invoice line, adjusting
> an item's sale price, or adjusting prices across many items at once?**

**ANSWERED 2026-10-05 — reading (a).** The operator meant "when writing an invoice, the price needs to
be adjusted ONLY for that invoice, so we should be directly able to adjust the price in that invoice
line." The capability already existed (type over the price cell — `app.js` fills the price only when it
is empty or zero, so the operator's number always wins). What was missing was legibility: once a line is
priced there was nothing on the line saying what the item's list price had been. The grid now shows the
item's list price beside the editable price (`<span class="price-baseline">`, populated from the same
`data-price` that fills the cell), so an adjustment is visible as "list 8.33" next to a typed "8.00".
Reading (b) and (c) are **not** being built — no ruling asked for them, and (c) remains off the table
without a separate decision.

Two further questions ride on the answer, and are recorded here rather than asked separately:

- **Should the invoice line default to `sale_price` or to the last price this party paid?** Both are
  defensible; they differ whenever a price has moved since the last sale to that party, which is exactly
  when it matters.
- **Should an adjusted line remember that it was adjusted?** Nothing in `transactions` records *why* a
  price differs from the item's, so a margin report can show the margin but not the decision.

## Why the ask was not implemented on the spot

Three words do not determine a schema change. `transactions` has `price`, `cost_price` and the three
discounts; `items` has `cost_price` and `sale_price`. Reading (c) would add a bulk-update surface over
money columns, and reading (a) touches the invoice write path that
[[client-side-live-recalculation]] governs. Both are worth doing deliberately.

## Related

- [[tb-0023-guest-feature-parity]] — the five requested items; this is item 4.
- [[parity-is-functional-not-visual]] — the mandate that makes reading (b) a permitted addition.
- [[data-model]] — where `items.sale_price` and `transactions.price` are defined.
