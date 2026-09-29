---
title: "Returns are negative quantities, difference is a party — no return or difference invoice type"
type: decision
status: accepted
decided_on: 2026-09-29
created: 2026-09-29
tags: [invoices, returns, difference, stock, data-model, trailbase, guest]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[guest-invoice-lifecycle]]", "[[invoice-lifecycle-draft-open-append-only]]", "[[reports-and-ledgers]]", "[[data-model]]", "[[guest-frontend-feature-parity-gaps]]", "[[tb-0014-point-company-fields-at-companies]]", "[[money-is-2dp-everywhere]]"]
---

# Returns are negative quantities, difference is a party — no return or difference invoice type

## Context

`invoice_types` carries four codes: 0 purchase, 1 sale, 2 return, 3 difference. The guest had
inherited all four, and the entry screens were being built to offer all four. The shop does not
want that: a return is "the same items again, backwards", and a stock difference is "an invoice to
the Difference counterparty".

Both are already expressible without a new type, which was verified before adopting this
([[returns-are-negative-quantities]]):

- A **return** is a negative-quantity row on the same invoice. The stock sign rule in
  `buildItemsReport` already does the right thing with a negative quantity — a sale of −5 adds 5 to
  stock, a purchase of −5 removes 5.
- A **difference** is an ordinary purchase or sale invoice whose party is a party named
  "Difference". The stock moves by the ordinary sign, and the difference is visible as that party's
  balance.

## Decision

**Only purchase (0) and sale (1) are offered as new invoice types.** Return (2) and difference (3)
remain in the schema and remain in the historical data — 54 returns and 1 difference invoice are
already in the imported 8,935 rows, and nothing is rewritten — but the app never creates them.

- **Return** — add a negative-quantity row for the item that was sold on that same invoice, so the
  two rows cancel in the invoice's own totals. No new document, no reference row.
- **Difference** — an invoice to the **Difference** party, created once as a party
  (`tb-0014-point-company-fields-at-companies` is the naming precedent for exactly this kind of
  named counterparty). Its type decides the direction: a purchase to Difference reduces stock, a
  sale to Difference increases it.
- **The Difference Report is re-keyed on the party**, not on `type = 3`, so the stock-adjustment
  view keeps working. It reads the Difference party's invoice movements.

## Why

- **One less thing to learn at the till.** Two types, not four. A return is a minus sign, which is
  also what it is in the arithmetic and in the stock.
- **The arithmetic already works.** Verified against the live depot: the stock sign and the money
  both behave for negative quantities. Adopting this needs no change to the report engine.
- **A return is self-evidencing.** Because the cancelling row is *on the same invoice*, "why is
  this invoice short" is answered by reading the invoice. A separate return document needs a
  reference row to be legible at all, and the 54 historical ones are exactly that burden.
- **The Difference party is a real counterparty.** A stock difference is a claim against a name, and
  making it a party means it appears in the ledger, the outstanding report and the party ledger for
  free — where a `type = 3` invoice appears in almost nothing.

## Consequences

**Accepted**

- Report arithmetic is untouched, so the existing report parity is preserved exactly.
- The Difference Report is a **changed report**, not a dead one. It is the one screen that must be
  re-pointed, and it must handle a historical `type = 3` invoice alongside the new party-based ones.
- An invoice's net can now be **negative** (a return on an invoice whose only lines were the sold
  ones). A negative balance is shown as **credit due** — the shop owes the customer — and is labelled
  as such, never as an unpaid invoice. This is the same sign convention the stock rule already uses.

**Given up**

- **A return can no longer be a standalone document**, so a return against an *already-settled* and
  *paid* invoice lands on that invoice and can make its balance negative. The alternative — a
  separate credit note — is a fourth type again, and the shop declined it. The negative balance is
  the honest representation of "we owe this customer money back".
- **The 54 historical return invoices are a legacy shape** that new entries never produce. Reports
  that filter `type = 2` (the payments report's type map does) must keep doing so.

## Evidence

- `trailbase/runtime/app/compute/views.js` — the stock sign rule and money chain this relies on.
- `trailbase/runtime/app/lib/invoices.js` — the entry-type list, now `{1, 0}`.
- `vault/issues/returns-are-negative-quantities` — the verification against the live depot.
- `trailbase/migrations/main/` — the Difference party seed.

## Related

- [[invoice-lifecycle-draft-open-append-only]] — where the return row is appended.
- [[reports-and-ledgers]] — the difference report's new predicate.
