---
type: Task
status: Done
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

## Work log

- 2026-09-20 — `InvoiceForm.tsx` (sale/purchase/return): the invoice selector no longer runs
  `getFullList(invoice_view, expand: "party,invoice_maker,booker")`. It now uses
  `usePagedList` (50 newest, `sort=-invoiceNo`, server-side `invoiceNo ~ "<search>"` via the
  Select's `onSearchChange`), a 1-row `usePagedList` as the type count for `idGenerator`
  (same view/filter the old list length used), and a `getOne` for the selected invoice. The
  old `expand.party?.id`/`expand.booker?.id` lookups now read the row's `party`/`booker`
  foreign keys directly; `parties` expand trimmed `area,area.section` → `area` (only
  `area.name` is rendered).
- 2026-09-20 — `invoices/difference/page.tsx`: dropped the redundant
  `expand: "party,invoice_maker,booker"`; the select handler now reads the row's `party`/`booker`.
- 2026-09-20 — `invoices/orders/page.tsx`: dropped `expand: "booker,invoice_maker,party"` and
  resolves party/booker names client-side with `useHydratedRefs(rows, ["party","booker"])`.
- `npx tsc --noEmit` clean; `npm run build` clean (48 pages).

## Verification

Browser pass 2026-09-20 (headless Chrome over CDP), capturing the real PocketBase requests:

| Route | `invoice_view` requests after the change | Rendered |
|---|---|---|
| `/app/invoices/sale` | `perPage=50&sort=-invoiceNo&filter=type="sale"` + `perPage=1` (count) | "SALE INVOICE" form |
| `/app/invoices/purchase` | `perPage=50&filter=type="purchase"` + `perPage=1` | "PURCHASE INVOICE" form |
| `/app/invoices/return` | `perPage=50&filter=type="return"` + `perPage=1` | "RETURN INVOICE" form |
| `/app/invoices/difference` | `perPage=500&filter=type="difference"` (small set, no expand) | form |
| `/app/invoices/orders` | `perPage=500` (all invoices, **no expand**) | 8,927 rows with resolved names |

The `perPage=500` + `expand=party,invoice_maker,booker` request is gone from the entry pages,
and orders renders `ABDUL MAJID` / `COUNTER SALE` (names), not ids.

Residual gaps (not blocking, recorded honestly): the interactive flow — picking an invoice in
the dropdown and confirming party/booker/date populate and its transactions load — was **not**
exercised by the harness (it needs real dropdown interaction); and `orders` still fetches the
full `invoice_view` (now without the expand) because `DataViewTable` has no server-pagination
props yet — paginating it is a follow-up.
