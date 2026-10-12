---
title: "Client-side live recalculation replicates the server's rounding; no spreadsheet engine"
type: decision
status: accepted
decided_on: 2026-09-29
created: 2026-09-29
tags: [invoices, grid, javascript, rounding, ironcalc, guest, ui]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[guest-invoice-lifecycle]]", "[[money-is-2dp-everywhere]]", "[[sql-rounding-differs-from-js-round2]]", "[[invoice-lifecycle-draft-open-append-only]]", "[[guest-writes-via-sql]]", "[[minimise-client-side-calculation]]"]
---

# Client-side live recalculation replicates the server's rounding; no spreadsheet engine

## ⚠️ 2026-10-05: this decision had no check, and three defects lived in that gap

The smoke suite creates invoices with discounts and **never opens the grid**, and no browser-driven check
existed until 2026-10-04. So for the whole life of this decision **nothing asserted that the browser
preview agreed with the server** — which is the exact risk this decision names. `tools/grid-preview-check.mjs`
does now, and on its first run it found:

1. **The invoice total was never written.** `[data-sum]` sits above the grid element (`grid.html.jinja:64`
   against `:73`), so `grid.querySelector("[data-sum]")` was null. Typing a quantity moved the line amount
   and left the invoice total frozen — a recalculated line beside a stale total.
2. **The invoice-level discounts did nothing.** They came from `data-d1`/`data-d2` attributes rendered at
   load, and `discount_rs` was hardcoded to `0`.
3. **The editable price was rounded.** `invoices.js` rendered the price **input** with `money(r.price)`, so
   a stored `114.583333` appeared as `114.58` — which both made saving rewrite the stored price and made
   the preview disagree with the server by 7.39.

All three are fixed, and the per-keystroke cost fell from 3.10 ms to 0.40 ms at the same time:
[[minimise-client-side-calculation]].

## The rule this adds

**The editable input carries the stored value; `money()` is for display columns.** Legacy prices are not
all 2 dp ([[money-is-2dp-everywhere]] governs what the app *writes*; the import never normalised what it
read), so rounding a price for display silently changes the ledger on save.

## Context

The invoice grid should recalculate a line's amount and the invoice total the instant a cell
changes, with no round trip. That means the money formula runs in the browser *and* on the server.
If the two disagree, the operator sees a number move when the row saves — the kind of thing that
makes people stop trusting a till.

IronCalc was raised as the way to make the client side "correct by construction". This measures
whether it actually removes the risk, and the answer decides the architecture.

## The measurement

The server's rule is **not** "round the answer". It is a specific chain
(`buildTransactionView` / `buildInvoiceView` in `app/compute/views.js`):

```
line  = price*qty*(1 - d1/100)*(1 - d2/100) - drs     # unrounded
net   = round2(line * (1 - invD1/100) * (1 - invD2/100))
total = Σ round2(line)                                # per-line, THEN summed
        afterD1  = s - s*invD1/100
        unrounded= afterD1 - afterD1*invD2/100
        final    = round2(unrounded - invDrs)
```

Two adversarial sweeps over 2,192 single-line cases and 5,000 multi-line invoices
(`tools/` measurements, reproduced in the task note):

| Question | Result |
| --- | --- |
| If the client uses the **identical** chain, does it ever disagree with the server? | **0 / 5,000** multi-line invoices drift |
| If the client omits **one** `round2` the server has, how often is the difference visible? | **93%** of lines, worst **0.005** |
| Naive "round once at the end" vs the server's chain | **11%** of single-line cases drift, worst **0.01** |

## Decision

**The client recalculates live, by replicating the server's exact chain in integer paisa — and
IronCalc is not used.**

The reason IronCalc does not help is the whole point. The risk is not *evaluation*; it is
*formula equivalence*. A general spreadsheet engine knows cell references and operators; it has no
notion of "round to 2 dp after this particular multiplication, in this order, because that is what
the SQL does". Reimplementing that discipline inside IronCalc is the same hand-written rounding
function — and then there is still a second source of truth, plus a WASM dependency, plus a
compile step, for a four-line formula. IronCalc's value is general formulas and dependency graphs;
this grid has neither. It would be a large dependency buying a rounding bug.

What actually removes the risk is **one shared function, copied once, asserted to be identical**:

- The chain lives in exactly one place per side, named the same, and a smoke check asserts the
  browser and guest implementations agree on the pinned fixtures.
- The browser computes in **integer paisa** (multiply to paisa, round with the same
  `Math.round(x + Number.EPSILON)` rule, divide back), never accumulating in raw float.
- The server stays authoritative: on save it recomputes and returns the committed total, and the UI
  adopts the server's number. The client value is a preview, never the record.

## Consequences

**Accepted**

- Live feedback with no request per keystroke.
- A number that never changes on save, because both sides run the same arithmetic.
- No new runtime dependency; the grid is ~40 lines of the file `app.js` already loads.

**Given up / to watch**

- **Two copies of the formula must be kept in step by hand.** A guest change to the money rule
  means changing the grid too, and the smoke check is what catches a miss. This is the same
  "keep the copies in sync" hazard the report engine already carries
  ([[deterministic-sort-and-sql-reads-in-guest]]), accepted here deliberately for instant feedback.
- The client value is a **preview**. The ledger is the server's. If they ever disagree in
  production the server wins silently, which is correct but would hide a drift bug — the smoke
  check is the alarm.

## Evidence

- `trailbase/runtime/app/public/js/app.js` — the grid's `recalc()`, integer paisa.
- `trailbase/runtime/app/compute/views.js` — the server chain it mirrors.
- `trailbase/tools/guest-smoke.mjs` — the equivalence check on the pinned fixtures.
- `vault/tasks/guest-invoice-lifecycle` — the measurements reproduced.

## Related

- [[money-is-2dp-everywhere]] — the invariant both sides serve.
- [[sql-rounding-differs-from-js-round2]] — the prior float-parity incident this design answers.
