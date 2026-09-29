---
title: "Verified — a negative quantity already produces the correct stock and money"
type: issue
status: resolved
severity: low
created: 2026-09-29
updated: 2026-09-29
tags: [returns, stock, money, verification, invoices, trailbase]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[returns-are-negative-quantities]]", "[[reports-and-ledgers]]", "[[money-is-2dp-everywhere]]", "[[sql-rounding-differs-from-js-round2]]", "[[guest-invoice-lifecycle]]", "[[client-side-live-recalculation]]"]
---

# Verified — a negative quantity already produces the correct stock and money

This is a verification record, not a defect. It exists because
[[returns-are-negative-quantities]] removes two invoice types from the entry screens, and that is only
safe if the existing arithmetic already does the right thing with a negative quantity. Checked
directly against the live production depot on 2026-09-29, before the change, not reasoned about.

## 1. Stock sign

`buildItemsReport` in `app/compute/views.js` derives the stock movement from the transaction's
invoice type and quantity:

```js
if (t.type === 2) delta = t.party_type === 0 ? q : -q;   // legacy return
else if (t.type === 3) delta = q;                          // legacy difference
else if (t.type === 1) delta = -q;                         // sale
else delta = q;                                            // purchase
// where q = qty + scheme
```

Running that rule over the quantity cases:

| Invoice | qty | stock delta | expected | |
| --- | --- | --- | --- | --- |
| sale | +5 | −5 | −5 | OK |
| sale | **−5** | **+5** | +5 | **OK** |
| purchase | +5 | +5 | +5 | OK |
| purchase | **−5** | **−5** | −5 | **OK** |
| legacy return (type 2), customer, +5 | +5 | +5 | OK |

**A return needs no new code.** A negative quantity on a sale adds stock; a negative quantity on a
purchase removes it. The `-q` for a sale and `+q` for a purchase already compose with the sign of
`qty`.

## 2. Money

`line = price*qty*(1-d1/100)*(1-d2/100) - drs`, then the header chain. For a return of −5 @ 125.50
on an otherwise empty invoice: line sum **−627.50**, `final_total` **−627.50**. The chain is linear
in `qty`, so a negative quantity produces a negative line and a negative total, with no special
case and no rounding divergence — the values that go negative are ordinary REAL columns.

`qtyDisplay` in `app/compute/format.js` already renders a negative as `-2 ctns 3 units`; the stock
report needs no change to show a negative stock.

## 3. What the history already contains

| | count |
| --- | --- |
| invoices `type=0` purchase | 266 |
| invoices `type=1` sale | 8,614 |
| invoices `type=2` return | 54 |
| invoices `type=3` difference | 1 |
| transactions already at negative qty | **126** (Σ −1,846) |
| return invoices with a return reference | 54 |

Two things follow. The 54 historical returns and 1 difference are **real imported rows** and stay
exactly as they are — the change is to what the app *offers*, not to what it reads. And the negative
-quantity path is not theoretical: 126 transactions already use it, so the depot is proof the
arithmetic holds on real data.

## 4. The rounding risk is in the grid, not the ledger

The one place a negative value could *diverge* is the new client-side live recalculation, which
computes the same formula in the browser. Measured across 2,192 adversarial single-line cases and
5,000 multi-line invoices, the identical chain never drifts (0/5,000), while omitting a single
`round2` drifts on 93% of lines by up to 0.005. That is why the grid replicates the chain in integer
paisa and the server stays authoritative — see [[client-side-live-recalculation]] and
[[sql-rounding-differs-from-js-round2]].

## Conclusion

The negative-quantity return and the Difference-party difference need **no change to the report
engine**. The only report that must change is the Difference Report, which is re-keyed on the party
rather than `type = 3`. [[returns-are-negative-quantities]].

## Related

- [[returns-are-negative-quantities]] — the decision this verifies.
- [[reports-and-ledgers]] — the difference report's new predicate.
