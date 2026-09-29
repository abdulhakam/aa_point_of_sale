---
title: "Client-side live recalculation replicates the server's rounding; no spreadsheet engine"
type: decision
status: accepted
decided_on: 2026-09-29
created: 2026-09-29
tags: [invoices, grid, javascript, rounding, ironcalc, guest, ui]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[guest-invoice-lifecycle]]", "[[money-is-2dp-everywhere]]", "[[sql-rounding-differs-from-js-round2]]", "[[invoice-lifecycle-draft-open-append-only]]", "[[guest-writes-via-sql]]"]
---

# Client-side live recalculation replicates the server's rounding; no spreadsheet engine

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
