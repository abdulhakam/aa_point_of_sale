---
type: Task
status: Backlog
ticket: POS-0023
priority: P3
belongs_to:
  - "[[AA Point of Sale]]"
related_to:
  - "[[POS-0022 Upgrade PocketBase to v0.40.4]]"
affects:
  - "[[Backend — PocketBase Data Service]]"
  - "[[Frontend — Next.js Application]]"
blocked_by:
  - "[[POS-0022 Upgrade PocketBase to v0.40.4]]"
created: 2026-09-20
updated: 2026-09-20
tags:
  - testing
  - pocketbase
  - major-migration
---

# POS-0023 PocketBase v0.40.4 migration test

## Goal

Full verification that the deferred major upgrade ([[POS-0022 Upgrade PocketBase to v0.40.4]]) is safe before rollout.

## Done when

- On a migrated DB copy: all migrations apply, all 13 view collections return correct data,
  auth works with the new SDK, and every frontend data call (`getFullList`/`getList`/
  `getOne`/`authWithPassword`) functions.
- The consolidated regression suite ([[POS-0018 Regression-test performance suite]]) plus the
  smoke list from [[POS-0020 PocketBase v0.22.55 regression test]] pass on the new version.
- A go/no-go decision is recorded; rollback path to v0.22.55 is confirmed working.

## Related

- Test companion to [[POS-0022 Upgrade PocketBase to v0.40.4]].
