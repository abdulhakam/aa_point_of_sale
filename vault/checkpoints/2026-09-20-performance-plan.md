---
type: Checkpoint
status: Current
belongs_to:
  - "[[AA Point of Sale]]"
work_session:
  - "[[Work Session — Performance Optimization Plan — 2026-09-20]]"
works_on:
  - "[[POS-0005 Baseline performance metrics]]"
  - "[[POS-0006 Backup database and repo snapshot]]"
created: 2026-09-20
updated: 2026-09-20
tags:
  - checkpoint
  - performance
  - planning
---

# Checkpoint — AA Point of Sale — 2026-09-20

## Objective

Plan the invoice/report performance optimization and PocketBase upgrade as tracked,
granular tasks with test companions and an efficient dependency-ordered sequence.

## Active tasks

- [[POS-0005 Baseline performance metrics]] — Ready (start here)
- [[POS-0006 Backup database and repo snapshot]] — Ready (gate for all migrations/upgrades)

## Completed since previous checkpoint

- Verified live scale and root causes (23k transactions / 26k payments / 8.9k invoices; no
  secondary indexes; `ledger_party` correlated-subquery O(n²); `staleTime` 0.5 s;
  `getFullList` + deep expands everywhere).
- Confirmed PocketBase release lines; user chose **v0.22.55 drop-in**, deferring v0.40.4.
- Authored 20 granular Tasks (POS-0005..POS-0024) incl. a test companion per change, a
  WorkSession, and updated the Project task index + Mermaid dependency graph.
- Added read-only inspection helpers `scripts/inspect_db.py` and `scripts/inspect_views.py`
  (plus `scripts/views_dump.txt` snapshot of all view SQL).

## Current verified state

- No application source changed; only `vault/**` and `scripts/inspect_*.py` added.
- PocketBase server 0.22.9, JS SDK 0.20.1 (unchanged).
- Execution order: baseline → backup → indexes → cache → pagination plumbing → SQL
  aggregation → trim expands/report adoption → invoice pages → regression suite → PB
  v0.22.55 upgrade → (optional) materialize views → (deferred) PB v0.40.4.

## Decisions and assumptions

- PocketBase upgrade target = v0.22.55 (drop-in); v0.40.4 = separate tested migration
  ([[POS-0022 Upgrade PocketBase to v0.40.4]] / [[POS-0023 PocketBase v0.40.4 migration test]]).
- Every change has a related test task; tests validate numerical equivalence before any
  report page is rewired.
- All DB schema changes go through `backend/pb_migrations`, never direct DB edits.

## Blockers and unresolved questions

- The [[POS-0009 Fix React Query cache config]] change must resolve the `refetchOnMount:false` + bare
  `invalidateQueries()` staleness risk (documented in that task).
- [[POS-0021 Materialize hot report views into tables]] materialization is conditional on
  [[POS-0018 Regression-test performance suite]] results.

## Exact next action

Start [[POS-0005 Baseline performance metrics]], then
[[POS-0006 Backup database and repo snapshot]].

## Resume procedure

1. Read [[AA Point of Sale]] (task index + dependency graph).
2. Read this session: [[Work Session — Performance Optimization Plan — 2026-09-20]].
3. Begin POS-0005; follow the dependency order above.
