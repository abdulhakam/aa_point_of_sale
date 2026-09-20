---
type: Task
status: Ready
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
