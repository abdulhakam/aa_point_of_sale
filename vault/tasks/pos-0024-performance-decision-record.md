---
type: Task
status: Ready
ticket: POS-0024
priority: P2
belongs_to:
  - "[[AA Point of Sale]]"
related_to:
  - "[[AA Point of Sale]]"
affects:
  - "[[Frontend — Next.js Application]]"
  - "[[Backend — PocketBase Data Service]]"
blocked_by:
  - "[[POS-0018 Regression-test performance suite]]"
  - "[[POS-0020 PocketBase v0.22.55 regression test]]"
created: 2026-09-20
updated: 2026-09-20
tags:
  - documentation
  - decision
  - performance
---

# POS-0024 Record performance optimization decisions

## Goal

Capture the durable Decisions made during this work so the vault stays authoritative.

## Done when

- A Decision note records: the cache-invalidation strategy chosen in
  [[POS-0009 Fix React Query cache config]], the v0.22.55-vs-v0.40.4 upgrade split, and (if
  taken) the materialization approach from [[POS-0021 Materialize hot report views into tables]].
- [[Data Model]] and [[Reports & Ledgers]] are updated for any new views/tables/indexes.
- The Project [[AA Point of Sale]] current-state section is refreshed.

## Related

- Final documentation step for the whole optimization effort.
