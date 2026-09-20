---
type: Task
status: Ready
ticket: POS-0008
priority: P1
belongs_to:
  - "[[AA Point of Sale]]"
related_to:
  - "[[POS-0007 Add indexes via migration]]"
  - "[[Data Model]]"
affects:
  - "[[Backend — PocketBase Data Service]]"
blocked_by:
  - "[[POS-0007 Add indexes via migration]]"
created: 2026-09-20
updated: 2026-09-20
tags:
  - testing
  - indexes
  - performance
---

# POS-0008 Index verification test

## Goal

Automated check that the performance indexes exist and are used by the hot queries.

## Done when

- A test (extend `scripts/inspect_db.py` or add `scripts/tests/test_indexes.py`) asserts:
  - each expected index from [[POS-0007 Add indexes via migration]] is present in `sqlite_master`, and
  - `EXPLAIN QUERY PLAN` for a representative join on `transactions(invoice)` and a filter
    on `payments(party, paid, type)` reports `SEARCH ... USING INDEX` (not a bare `SCAN`).
- Test passes against the migrated DB copy and is documented in the WorkSession.

## Related

- Test companion to [[POS-0007 Add indexes via migration]].
- Rolled into [[POS-0018 Regression-test performance suite]].
