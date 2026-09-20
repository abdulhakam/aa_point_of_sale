---
type: Task
status: Ready
ticket: POS-0017
priority: P1
belongs_to:
  - "[[AA Point of Sale]]"
related_to:
  - "[[Frontend — Next.js Application]]"
  - "[[Data Model]]"
affects:
  - "[[Frontend — Next.js Application]]"
blocked_by:
  - "[[POS-0011 Paginated list plumbing]]"
created: 2026-09-20
updated: 2026-09-20
tags:
  - performance
  - frontend
  - invoices
  - pagination
---

# POS-0017 Invoice entry pages: paginate + trim expands

## Goal

Speed up *opening invoices* — the other half of the user's complaint.

## Scope

- `invoices/InvoiceForm.tsx` currently does:
  - `fullList(invoice_view, expand: "party,invoice_maker,booker", filter: type=...)` →
    thousands of rows just to populate the invoice selector and current invoice.
  - `fullList(parties, expand: "area,area.section")`, `fullList(items, expand: category)`,
    `fullList(invoices_return_reference, expand: original_invoices)`, `fullList(order_bookers)`.
- Also `invoices/difference/page.tsx` (`invoice_view` full list) and `invoices/orders/page.tsx`.

## Changes

- Invoice picker: use paginated/searchable fetch (getList with a search filter) or a slim
  `invoice_view` query selecting only `id, invoiceNo, type, party, booker` — not the full
  row with expands.
- Load the *current* invoice's expands only for the selected record (getOne), not the whole list.
- Keep `items`/`parties`/`order_bookers` as `getFullList` (small reference data) but ensure
  they're cached aggressively per [[POS-0009 Fix React Query cache config]]; trim `area,area.section` expand to what's shown.

## Done when

- Opening the Sale/Purchase/Return invoice page no longer fetches the full
  `invoice_view` + all expands; the invoice selector still lists/search by invoiceNo.
- Editing an invoice loads its transactions and party correctly.

## Related

- Verified by [[POS-0018 Regression-test performance suite]] (page-load timing).
- Uses [[POS-0011 Paginated list plumbing]], relies on [[POS-0009 Fix React Query cache config]] cache.
