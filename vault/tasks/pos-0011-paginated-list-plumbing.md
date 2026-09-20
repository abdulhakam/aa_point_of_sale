---
type: Task
status: Ready
ticket: POS-0011
priority: P1
belongs_to:
  - "[[AA Point of Sale]]"
related_to:
  - "[[Frontend — Next.js Application]]"
  - "[[Data Model]]"
affects:
  - "[[Frontend — Next.js Application]]"
blocked_by:
  - "[[POS-0009 Fix React Query cache config]]"
created: 2026-09-20
updated: 2026-09-20
tags:
  - performance
  - pagination
  - frontend
---

# POS-0011 Paginated list plumbing

## Goal

Introduce real server-side pagination for transactional lists so the app stops calling
`getFullList` on 8.9k–26k-row collections.

## Changes

- Add a `usePagedList`/`crud.listPage` helper in `frontend/src/app/api/useAPI.ts` that wraps
  PocketBase `getList(page, perPage, { filter, sort, expand })` and returns
  `{ items, totalItems, totalPages, page }`.
- Keep `getFullList` only for small reference data; transactional collections
  (`invoices`/`invoice_view`, `transactions`/`transaction_view`, `payments_view`) must go
  through the paginated helper.
- Provide page/perPage state + controls compatible with `mantine-datatable` (which already
  supports `page`, `onPageChange`, `totalRecords`, `recordsPerPage`).

## Out of scope (call-site adoption)

- Rewiring individual pages to consume the paged data is done per-report in
  [[POS-0015 Trim expands + adopt pagination in report pages]] and
  [[POS-0017 Invoice entry pages: paginate + trim expands]].

## Done when

- Helper exists, typed, and returns paginated results from a live collection.
- No existing `getFullList` call site is broken (helper is additive).

## Related

- Verified by [[POS-0012 Pagination test]].
- Used by [[POS-0015 Trim expands + adopt pagination in report pages]] and
  [[POS-0017 Invoice entry pages: paginate + trim expands]].
