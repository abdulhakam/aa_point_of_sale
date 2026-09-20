---
type: Task
status: Done
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
  `useAPI.ts` and compiles cleanly in the frontend build.
- 2026-09-20 — Wrote `scripts/tests/test_pagination.py` and ran it against the live
  PocketBase API (port 8090). All 5 checks PASS.

## Verification

- `scripts/tests/test_pagination.py` → RESULT: PASS — pagination behaves correctly.
  - Page 1 vs page 2: disjoint (0 overlapping IDs), 50 items each.
  - `totalItems` = 8927 (matches known `invoice_view` row count).
  - Filter `type = "sale"` narrows to 500 rows (< 8927 total).
  - `perPage=10` → 10 items; `perPage=100` → 100 items.
  - Sort `+invoiceNo` ascending, `-invoiceNo` descending — both honored.
  - Page 3 (perPage=30): 30 items, all unique.
