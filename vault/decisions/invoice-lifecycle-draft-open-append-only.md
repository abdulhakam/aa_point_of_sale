---
title: "Invoice lifecycle — draft, open, and an append-only correction rule"
type: decision
status: superseded
decided_on: 2026-09-29
created: 2026-09-29
superseded_by: "[[no-draft-invoices-published-on-save]]"
superseded_on: 2026-10-02
tags: [invoices, lifecycle, concurrency, ledger, audit, trailbase, guest]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[tb-0021-invoices-cashmemos-printing]]", "[[invoice-entry-freshness-and-writes]]", "[[guest-invoice-lifecycle]]", "[[single-writer-per-invoice]]", "[[returns-are-negative-quantities]]", "[[verified-negative-quantity-stock-and-money]]", "[[money-is-2dp-everywhere]]", "[[guest-writes-via-sql]]", "[[legacy-invoice-numbering-is-racy]]", "[[no-draft-invoices-published-on-save]]"]
---

# Invoice lifecycle — draft, open, and an append-only correction rule

> **SUPERSEDED 2026-10-02 by [[no-draft-invoices-published-on-save]].** The ORDERS system this
> lifecycle existed for has been removed, so there is no draft phase and no append-only rule: an
> invoice is in the books when it is saved and stays editable. Everything below is kept as the record
> of the design that was in force and why — it is **not** the current behaviour. In particular,
> "`status` is the single source of truth", the two-state table, the lease, the commit step and the
> "an open invoice is append-only" rule are all withdrawn. The draft filter also emptied the
> production reports — see [[imported-invoices-are-all-drafts-so-every-report-is-empty]].

## Context

[[invoice-entry-freshness-and-writes]] designed immediate-push entry against the legacy shape: a
`completed` boolean, every line written straight to `transactions`, and the whole document visible
to reports from the moment the first line lands. It recorded nine known flaws (F1–F9), of which the
structural ones were:

- **F1** — an in-progress invoice is in reports, so a half-entered invoice is visible to everyone and
  consumes a human number the moment it is created.
- **F2** — the lease can strand an incomplete invoice after a crash.
- **F3** — line writes are not idempotent.
- **F4** — totals race, because they are derived from a stale read.

Those are not edge cases; they follow from choosing immediate push with an in-place `completed` flag.
This system will be **single-writer, multiple-readers** and it will be a ledger, so the lifecycle is
designed from that rather than ported. The legacy lifecycle explicitly does not apply.

## Decision

### Two states

| State | Meaning | Writable by | In the books |
| --- | --- | --- | --- |
| `draft` | being entered right now | the lease holder only | **no** |
| `open` | committed; part of the books | nobody in place — see below | **yes** |

A draft is **readable by every authenticated user** and **writable only by the lease holder**. This
is single-writer / multiple-readers applied per document ([[single-writer-per-invoice]]). A second
person can open a draft and watch it, but the grid is read-only for them and says whose it is.

There is no `void` and no `paid`. Cancelling is not a state change; it is another document.

### `invoices.status`

A new `TEXT` column, `CHECK (status IN ('draft','open'))`, backfilled from `completed`
(`open` where `completed = 1`, else `draft`). **`status` is the single source of truth from now
on.** `completed` stays because the record API's contract and the import depend on it, and every
statement that changes `status` sets `completed` in the *same* `UPDATE` — so the two cannot drift,
and there is exactly one write path. The app never reads `completed` for behaviour.

### The transitions

```
create ──▶ draft ──commit──▶ open
             │                 │
             └── abandon ──▶ (row stays draft, number consumed)
```

- **create → draft.** Allocates the number, sets `status='draft'`, takes the write lease. A draft is
  readable by everyone but is **not in the books** — every report filters `status = 'open'`, so
  entering an invoice cannot move a number under anyone else's feet. This is what closes F1: a
  draft is no longer "in the reports but should not be".
- **draft → open.** One `UPDATE`. The writer releases the lease at the same moment. Validation
  (at least one live line) happens immediately before it, and the money is already derived from
  `transactions`, so the commit needs no multi-statement transaction to be consistent — which is
  what makes F4 unrepresentable rather than merely unlikely.
- **open → open, by appending.** An open invoice is **append-only**. No row is ever edited and no
  row is ever deleted.

### Returns are negative rows on the same invoice

A return is not a new document and is not a link to one. The writer **adds a negative-quantity row
for the item that was sold on that same invoice**, so the two rows cancel in the invoice's own
totals and the invoice nets to the corrected value. This is the ledger's own answer, and it needs
no `invoices_return_reference` for new documents. The 54 historical returns keep their existing rows
and their existing references; nothing is rewritten.

The arithmetic was verified against the live depot before this was adopted — see
[[returns-are-negative-quantities]].

### One writer per invoice, everyone else reads

The write lease is per invoice ([[single-writer-per-invoice]]). Because only one user can hold it,
the grid is a single-writer view, and the append-only rule means the writer never has to mutate a
row another reader could be looking at.

## Why

- **An append-only open document is auditable by construction.** A correction is visible as its own
  row, so "what did this invoice say, and what was changed" is answered by reading the rows rather
  than by trusting an audit log that has to be correct.
- **Two states is enough.** A `void` state would need a rule for whether it stays in the books. An
  append-only negative document already answers that question, and it is the same mechanism a
  return uses, so there is one thing to learn rather than two.
- **Hiding drafts from the books is the single biggest win.** No report moves while someone is
  typing (that is F5, closed), no half-entered document is summed into a total, and "someone is
  typing right now" is not a state the ledger has to represent. Readers *can* look at a draft — they
  simply never see it in a report.
- **The one cost of "readable by everyone" is that every report needs the predicate.** Fourteen
  report pages gain `status = 'open'`. That is a deliberate divergence from legacy, which had no
  draft concept at all, and it is the price of not putting half-entered invoices in the books.
- **It matches how a shop actually uses a till.** A sale is entered, then it is done. Mistakes are
  rare and they are corrected by cancelling the goods, not by rewriting history.

## Consequences

**Accepted**

- Reports gain one predicate: `status = 'open'`. Without it a draft is in the books, which is F1.
- A crash strands a **draft**, not an invoice: no number was visible to anyone and nothing is in the
  books. The lease still auto-expires (F2), and a stranded draft is voidable by the lease holder or
  visible to nobody at all.
- Line idempotency is now a per-row `opKey` in `invoice_line_op` for *every* line operation, and a
  line removal is an append of a reversal rather than a `DELETE`, so a retried request cannot remove
  a different line.
- `status` must be added to the record API's readable/writable column list, or the Node client
  cannot see it.

**Given up**

- **An open invoice's text can no longer be corrected in place.** A typo in a description is fixed
  by appending a correcting header row, not by editing. That is the price of auditability, and it is
  a real ergonomic loss for a typo in a *description* specifically.
- **Drafts are invisible, so "where is that invoice I was entering" needs a list.** The writer's own
  draft list is a required screen, not an optional one.
- **Reading a draft does not require the lease**, but writing one does, so a second user sees a
  read-only grid with the owner's name and an explicit "being edited by" reason rather than a
  silently disabled form.

## Evidence

- `trailbase/migrations/main/` — the status column, its `CHECK`, and the backfill.
- `trailbase/runtime/app/lib/invoice-lifecycle.js` — the transitions, the lease, and the append-only
  line operations.
- `trailbase/runtime/app/views/invoices/grid.html.jinja` — the single-writer spreadsheet.
- The stock-sign and money verification in [[returns-are-negative-quantities]].

## Related

- [[guest-invoice-lifecycle]] — the task that builds this.
- [[invoice-entry-freshness-and-writes]] — the design this replaces; F1–F5 are what closed.
- [[single-writer-per-invoice]] — the concurrency half.
- [[client-side-live-recalculation]] — how the grid recalculates without a round trip.
- [[returns-are-negative-quantities]] — how a return and a difference are entered.
