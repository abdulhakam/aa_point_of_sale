---
type: Task
status: Done
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

## Work log

- 2026-09-20 — Added `crud.listPage` and the `usePagedList` hook to `frontend/src/app/api/useAPI.ts`.
  `usePagedList` uses `pb.collection(collection).getList(page, perPage, {...})`, spreads the
  raw result, and returns `records`/`totalRecords`/`totalPages`/`page`/`perPage` directly
  suitable for `mantine-datatable` (`records`/`totalRecords`/`page`).
- 2026-09-20 — Adds `placeholderData: keepPreviousData` so tabbing between pages doesn't flicker.
- 2026-09-20 — Fixed two pre-existing bugs surfaced during this work:
  - `crud.listall` did not `return` its `getFullList` result, so callers always got `undefined`;
    now fixed.
  - The CRUD hooks (`useCreate`/`useUpdate`/`useDelete`/`useFullList`) called
    `queryClient.invalidateQueries(collection)` where `collection` is a string — in React Query
    v5 that is an **exact query-key match** and does not match the keys those hooks actually use
    (`[collection, recordID]`, `[collection, "page", ...]`), so writes never invalidated their own
    lists. Changed to `invalidateQueries({ queryKey: [collection] })` (prefix match). The
    bare `queryClient.invalidateQueries()` call used by some non-CRUD mutations still nothing on
    those keyed queries — that is a separate pre-existing issue, not fixed here.

## Verification

- `npm run build` from `frontend/` succeeds cleanly (compiled + types + static export with 48
  pages); `scripts/frontend_build2.txt` is the clean log. `usePagedList` compiles with no type
  errors and the old `crud.*` signatures are unchanged (callers do not break).
