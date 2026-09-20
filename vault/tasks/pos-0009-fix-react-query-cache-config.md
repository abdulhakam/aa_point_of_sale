---
type: Task
status: Ready
ticket: POS-0009
priority: P0
belongs_to:
  - "[[AA Point of Sale]]"
related_to:
  - "[[Frontend — Next.js Application]]"
affects:
  - "[[Frontend — Next.js Application]]"
blocked_by:
  - "[[POS-0005 Baseline performance metrics]]"
created: 2026-09-20
updated: 2026-09-20
tags:
  - performance
  - react-query
  - cache
  - frontend
---

# POS-0009 Fix React Query cache config

## Goal

Make navigation feel instant by caching correctly. Current config
(`frontend/src/app/providers.tsx`) is `staleTime: 1000/2` (0.5 s) + `refetchOnMount: true`,
so every page change re-fetches 8.9k–26k-row views.

## Changes

- `staleTime`: raise to 30s default, **5 min for reference data** (areas, sections,
  categories, items, parties, order_bookers) — these rarely change.
- `refetchOnMount: false` so navigating back doesn't refetch.
- `refetchOnWindowFocus: false` (keep), `refetchOnReconnect: true` (keep, offline app).
- Implement per-query overrides: keep transactional/ledger queries fresher (shorter
  staleTime) than reference collections.

## Design note — correctness with `refetchOnMount: false`

Every mutation in the app calls bare `qc.invalidateQueries()` (no key) and relies on a
remount to refetch. With `refetchOnMount: false`, an **invalidated but inactive** query is
NOT refetched on next mount → risk of stale screens after a write. Mitigation (must ship
with this change): after create/update/delete of an invoice/transaction/payment, explicitly
`invalidateQueries` (or `refetchQueries`) for the affected keys, or scope the long
`staleTime` + `refetchOnMount:false` to reference data only and keep transactional lists at
a short staleTime with `refetchOnMount: true`. Decide and document in the WorkSession.

## Done when

- `providers.tsx` defaults updated; reference-data queries use the aggressive cache.
- No stale-after-write regression (verified per the design note).

## Related

- Verified by [[POS-0010 Cache behavior test]].
- Depends on correct invalidation, see [[POS-0011 Paginated list plumbing]].
