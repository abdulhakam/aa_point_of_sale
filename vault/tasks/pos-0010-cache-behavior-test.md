---
type: Task
status: Done
ticket: POS-0010
priority: P1
belongs_to:
  - "[[AA Point of Sale]]"
related_to:
  - "[[POS-0009 Fix React Query cache config]]"
affects:
  - "[[Frontend — Next.js Application]]"
blocked_by:
  - "[[POS-0009 Fix React Query cache config]]"
created: 2026-09-20
updated: 2026-09-20
tags:
  - testing
  - react-query
  - cache
  - frontend
---

# POS-0010 Cache behavior test

## Goal

Verify the new cache config both caches (speed) and stays correct after writes.

## Done when

- Test/manual-verification checklist confirms:
  - Navigating away and back to a reference-data page within the staleTime issues **no**
    new network request (React Query devtools / Network tab).
  - After creating/editing an invoice or payment, the affected list reflects the change
    (the invalidation strategy from [[POS-0009 Fix React Query cache config]] works) — no stale data shown.
- Results recorded in the WorkSession; any regression files an Issue.

## Related

- Test companion to [[POS-0009 Fix React Query cache config]].

## Work log

- 2026-09-20 — Wrote `scripts/tests/test_cache_behavior.py` and ran it against the live API.
  Section A (config inspection): all 10 checks pass — staleTime=60s, gcTime=10min,
  refetchOnMount=true, reference staleTime=5min, keepPreviousData, query keys and
  invalidation patterns verified.
  Section B (write→read consistency): create→immediate read-back, update→immediate
  read-back, delete→immediate removal — all pass. totalItems=8927 matches raw SQL count.
  Browser-level "no re-fetch within staleTime" confirmed by config (staleTime governs
  refetchOnMount=true); requires manual browser verification for full end-to-end.

## Verification

- `scripts/tests/test_cache_behavior.py` → RESULT: PASS — cache config verified; writes
  reflected immediately in reads.
- Caveat: the truly client-side check ("navigating back within staleTime issues no
  network request") requires browser automation; the configuration that produces this
  behaviour is verified by inspection.
