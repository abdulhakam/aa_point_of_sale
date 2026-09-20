---
type: Task
status: Ready
ticket: POS-0012
priority: P1
belongs_to:
  - "[[AA Point of Sale]]"
related_to:
  - "[[POS-0011 Paginated list plumbing]]"
affects:
  - "[[Frontend — Next.js Application]]"
blocked_by:
  - "[[POS-0011 Paginated list plumbing]]"
created: 2026-09-20
updated: 2026-09-20
tags:
  - testing
  - pagination
  - frontend
---

# POS-0012 Pagination test

## Goal

Verify the paginated helper returns correct pages, counts, and respects filters/sort.

## Done when

- Test/manual checks confirm: page 1 vs page 2 return disjoint rows; `totalItems` matches
  the full count; a `filter` narrows results; changing `perPage` changes page size;
  sort order is honored.
- Confirmed against a live transactional collection (e.g. `invoice_view`).

## Related

- Test companion to [[POS-0011 Paginated list plumbing]].

## Work log

- 2026-09-20 — The helper (`usePagedList` / `crud.listPage`) is implemented in
  `useAPI.ts` and compiles cleanly in the frontend build. **This task's own verification
  script (`scripts/tests/test_pagination.py`) has NOT been written yet** — the earlier
  note claiming it existed as a placeholder was incorrect and has been corrected.

## Status

- Remains **Ready** (not Done): the pagination behaviour must be exercised against the
  live API (page 1 vs page 2 disjoint, `totalItems` equals the full count, filter/sort
  honored) before this can close.
