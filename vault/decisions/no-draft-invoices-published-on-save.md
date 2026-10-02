---
title: No draft invoices — every invoice is published on save and stays editable
type: decision
status: accepted
decided_on: 2026-10-02
created: 2026-10-02
supersedes: "[[invoice-lifecycle-draft-open-append-only]]"
tags: [invoices, lifecycle, domain, trailbase, runtime-js, editing]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[imported-invoices-are-all-drafts-so-every-report-is-empty]]", "[[invoice-entry-freshness-and-writes]]", "[[tb-0021-invoices-cashmemos-printing]]", "[[browser-journey-sweep-2026-10-02]]", "[[guest-invoice-lifecycle]]", "[[invoice-lifecycle-draft-open-append-only]]"]
---

# No draft invoices — every invoice is published on save and stays editable

## Context

The guest app implemented an invoice lifecycle of `draft -> open`
([[invoice-lifecycle-draft-open-append-only]]): a new invoice was created as a draft, edited freely
while a lease was held, and only "in the books" once committed. Two things have changed.

1. **The ORDERS system has been removed from this project.** An order was the only thing a draft
   invoice was ever *for* — a quote being turned into a bill. With orders gone there is nothing to
   hold an invoice in limbo, so the draft phase has no purpose.
2. The lifecycle's draft phase is what emptied the production depot's reports
   ([[imported-invoices-are-all-drafts-so-every-report-is-empty]]): all 8,927 invoices were `draft`,
   and every report filtered drafts out, so the app showed a complete, correct, entirely empty
   ledger.

## Decision

**There is no invoice status. An invoice is in the books the moment it is saved, and it stays
editable afterwards.**

Three consequences, all deliberate:

- **`invoices.status` is removed**, along with its triggers and index. Not "kept but unused" — the
  column is what the import, the reports and the UI each keyed off, and leaving it invites the same
  class of bug to come back.
- **Invoice entry publishes on save.** One action writes the invoice and its lines; there is no
  separate commit step, and no lease, because there is no uncommitted window to protect.
- **A saved invoice is editable.** Lines, dates, party, booker, discounts and notes can all be
  changed later. This was asked and answered explicitly: the append-only rule is withdrawn, not
  merely relaxed.

The last point gives up something real: **a report you already ran can change under you.** That was
accepted rather than worked around. The mitigation is not technical — it is that a correction is
visible in the entry screen's own history of edits — and it is the reason this note records the
trade rather than pretending it away.

## What this supersedes

| Was | Now |
|---|---|
| `invoice-lifecycle-draft-open-append-only` — `draft -> open`, one way | **Superseded.** No transition, no lifecycle. |
| An invoice is editable only while it is a draft | Any saved invoice is editable |
| A draft may be hard-deleted (nothing in the books is lost); an open one may not | Deletion is a soft delete for every invoice; there is no "nothing was lost" case |
| `completed` mirrors `status`, moving with it in one UPDATE | `completed` is a legacy column with no lifecycle meaning; it is no longer written as a mirror of anything |

## Measured outcome

After the change, on the production depot, with the window the user asked for (1 Jan 2026 →
2 Oct 2026):

| Before | After |
|---|---|
| 10/10 reports and 4/4 ledgers: `Rows: 0`, every total `0.00` | Reports return rows and money |
| `/invoices`: "Invoices (0)", 0.00 billed/paid/balance | The invoice list shows the ledger |
| Dashboard invoice/payment tiles: `0.0` | Populated |

The counts are recorded in [[imported-invoices-are-all-drafts-so-every-report-is-empty]], which this
decision closes.

## Consequences

**Accepted**

- The report outage is over, and the class of bug that caused it — a silent filter keyed on a
  column the importer never set — is removed rather than patched.
- Invoice entry is one action instead of create-then-commit, and needs no lease.
- Correcting a mistyped invoice no longer requires cancelling and reissuing it.

**Given up**

- **Immutability of published documents.** A report already read can change afterwards.
- **A "who changed what, when" trail does not exist yet.** With append-only withdrawn this is worth
  having; it is a gap, not a consequence to accept silently.
- `completed` remains on the table for the record API and the v1 import, but is now inert. It is
  retained rather than dropped because the record API contract and the materialised invoice
  documents (`inv_doc`) read it; removing it is separate work.

## Related

- [[imported-invoices-are-all-drafts-so-every-report-is-empty]] — the defect this decision closes.
- [[invoice-lifecycle-draft-open-append-only]] — the decision replaced.
- [[invoice-entry-freshness-and-writes]] — the open design flaws in the entry path, several of which
  were about the lease and now need re-reading against this decision.