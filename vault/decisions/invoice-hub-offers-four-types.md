---
title: "The invoice hub offers all four invoice types — return and difference are first-class again"
type: decision
status: accepted
decided_on: 2026-10-08
created: 2026-10-09
updated: 2026-10-09
tags: [invoices, returns, difference, ui, parity, guest, decision]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[returns-are-negative-quantities]]", "[[tb-0023-guest-feature-parity]]", "[[ui-parity-discrepancies-2026-10-08]]", "[[reports-and-ledgers]]", "[[data-model]]", "[[invoice-type-write-verification-2026-10-09]]"]
---

# The invoice hub offers all four invoice types — return and difference are first-class again

## Context

`invoice_types` has always carried four codes — 0 purchase, 1 sale, 2 return, 3 difference — and
the legacy `/app/invoices` hub is a **five-tile** screen: Purchase, Sale, Print Invoices, Return,
Difference (measured off the live legacy bundle in [[ui-parity-discrepancies-2026-10-08]]).

On 2026-09-29 the guest decided **not** to offer return and difference as new types
([[returns-are-negative-quantities]]): "a return is a negative-quantity row on the same invoice,
a difference is an invoice to the party named *Difference*", and that note concludes *"Only
purchase (0) and sale (1) are offered as new invoice types … the app never creates them."*

That decision was **not what the code does today.** On 2026-10-08 the legacy-look mandate
([[parity-reinstates-the-legacy-look-with-defect-fixes]]) drove the invoices hub to be rebuilt as
the legacy five tiles, and the entry screen to accept all four types. The reversal shipped without
a superseding decision note; this note records it.

## Decision

**The invoice hub offers the legacy five tiles, and `/invoices/new` creates any of the four
`invoice_types`.** Return (2) and Difference (3) are first-class, creatable types again.

- `/invoices` is the five-tile hub; the Return and Difference tiles link to
  `/invoices/new?type=2` and `?type=3` (`runtime/ahscripts/views/invoices/index.html.jinja`).
- `/invoices/new` GET and POST map the requested `type` through `INVOICE_TYPES` and fall back to a
  sale for anything else (`runtime/ahscripts/routes/invoices/new/route.ts`).
- `INVOICE_TYPES` and `typeLabel` are `{0 Purchase, 1 Sale, 2 Return, 3 Difference}`
  (`runtime/ahscripts/lib/invoices.js:16`).
- Each type numbers in **its own** legacy `count+1` sequence
  (`runtime/ahscripts/lib/invoicing.js` `createInvoice`), so a return does not move the sale numbers.
- The entry bar shapes itself by type (`runtime/ahscripts/views/invoices/entry.html.jinja`): a return shows a
  PARTY and an **Original Invoice** field; a difference shows **no party field at all**; booker is
  sale-only.

The negative-quantity convention from [[returns-are-negative-quantities]] is **not** withdrawn — a
line still stores whatever quantity the operator types, negative included, and the report stock
rule still reads it. What changed is that a return/difference need no longer be encoded as a
negative line on a purchase/sale; the legacy document type is available directly.

## Why

- **Parity: the legacy hub is five tiles.** [[parity-reinstates-the-legacy-look-with-defect-fixes]]
  makes the legacy look required; a four-tile hub could not match a five-tile one.
- **The arithmetic already handled types 2 and 3.** The shared report prelude already carries the
  return/difference stock rules, so creating the documents needed no report change
  (`runtime/ahscripts/reports/sql/prelude.sql`: `stock_deltas` signs return by party type and difference
  positively; `difference_deltas` keys on `inv_type = 3` as well as the Difference party).

## Consequences

**Accepted**

- The 54 historical return invoices and 1 difference invoice in the imported ledger are no longer a
  "legacy-only shape": new entries produce the same shape, so reports that filter `type` stay
  exercised.
- The Difference Report reads a new type-3 invoice whether or not it has a party, because
  `difference_deltas` selects `tv.inv_type = 3 OR tv.inv_party = <Difference party>`; the UI's
  party-less difference invoice is still picked up.

**To watch**

- [[returns-are-negative-quantities]] is now **superseded** on its "only 0 and 1 are offered" half.
  Its negative-quantity and Difference-party mechanisms remain true and are kept.
- The stale route comment that said "return and difference have no guest screen yet" was corrected
  in `runtime/ahscripts/routes/invoice/route.ts` on 2026-10-09.

## Evidence

- `runtime/ahscripts/views/invoices/index.html.jinja` — the five tiles and their `?type=` targets.
- `runtime/ahscripts/routes/invoices/new/route.ts` — GET/POST accept all four types.
- `runtime/ahscripts/lib/invoices.js` — `INVOICE_TYPES`, `typeLabel`.
- `runtime/ahscripts/views/invoices/entry.html.jinja` — the per-type entry bar.
- `runtime/ahscripts/reports/sql/prelude.sql` — `stock_deltas`, `difference_deltas`.
- The write path itself was verified 2026-10-09:
  [[invoice-type-write-verification-2026-10-09]].

## Related

- [[returns-are-negative-quantities]] — the decision this half supersedes.
- [[tb-0023-guest-feature-parity]] — where the 2026-10-08 hub work is recorded as done.
- [[ui-parity-discrepancies-2026-10-08]] — the measurement that showed the hub is five tiles.
