---
title: Invoices are soft-deleted (the deleted marker, not a row delete)
type: decision
status: accepted
decided_on: 2026-10-10
created: 2026-10-10
tags: [pos, guest, invoice, delete]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[no-draft-invoices-published-on-save]]", "[[invoice-console-keyboard-state-machine]]"]
---

# Invoices are soft-deleted (the deleted marker, not a row delete)

[[no-draft-invoices-published-on-save]] says deleting an invoice is a soft delete; the column is
`invoices.deleted` (`INTEGER NOT NULL DEFAULT 0 CHECK (deleted IN (0,1))`,
`migrations/main/U1790208000__create_base_tables.sql:210`), and the list already filters
`i."deleted" = 0` (`app/lib/invoices.js filteredQuery`). Before this build there was **no delete route
or library function** for an invoice at all.

**Decision.** `app/lib/invoice-lifecycle.js` gains `softDeleteInvoice(db, hex, {userHex, device})`
(takes the lease, then sets `deleted = 1`) and `restoreInvoice`. `POST /invoices/<id>/delete` is the
route: it soft-deletes, re-renders the console picker on an htmx request (`surface=console`), and
303s to the console otherwise. The console's Delete button carries a confirm.

## Consequences and limits

- The row and its lines survive; only the list and the pickers hide it. `readInvoice` and the JSON
  `/invoice/<id>` still return it, which is how the check asserts "leaves the list but survives".
- The report engine does **not** filter `invoices.deleted`; a soft-deleted invoice can still be counted
  by a report. This is the same "what you see is what is in the books" tension the line-delete note
  records (`removeLine` is a hard DELETE for exactly that reason). Hiding a deleted invoice from
  reports is a separate change and is not made here.
- Line deletion stays a **hard** DELETE (`invoice-lifecycle.removeLine`), unchanged: no report filters
  `transactions.deleted`, so a soft-deleted line would still be summed. Invoice deletion is soft;
  line deletion is not. The asymmetry is deliberate.
