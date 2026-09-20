---
type: Task
status: Backlog
ticket: POS-0022
priority: P3
belongs_to:
  - "[[AA Point of Sale]]"
related_to:
  - "[[Backend — PocketBase Data Service]]"
  - "[[POS-0019 Upgrade PocketBase v0.22.9 → v0.22.55]]"
affects:
  - "[[Backend — PocketBase Data Service]]"
  - "[[Frontend — Next.js Application]]"
blocked_by:
  - "[[POS-0020 PocketBase v0.22.55 regression test]]"
created: 2026-09-20
updated: 2026-09-20
tags:
  - upgrade
  - pocketbase
  - major-migration
  - deferred
---

# POS-0022 Upgrade PocketBase to v0.40.4

## Goal

Track the deferred jump from v0.22.x to the true latest **v0.40.4** as its own tested
migration — **not** part of the current optimization pass (user decision).

## Why it's separate / breaking

v0.23+ (and through v0.40) changed, among other things:
- **JS migrations API**: `new Dao(db)` / `new SchemaField({...})` → the `$app` /
  `collection.fields` model; our 18 files in `backend/pb_migrations/` must be rewritten or
  superseded by a fresh schema snapshot.
- **View collections**: `options.query` → `viewQuery`; `collection.schema` →
  `collection.fields`.
- **JS SDK**: server 0.23+ needs a newer SDK; current `0.20.1` must move to ~0.26+/0.28,
  with auth/realtime/record-shape changes to audit in `AuthContext.js` and callers.

## Plan (when scheduled)

1. Branch; snapshot schema (`pocketbase migrate collections` / export) as a new baseline.
2. Rewrite/port migrations to the new API or replace with the snapshot.
3. Bump `frontend/package.json` `pocketbase` to the matching SDK; fix auth/realtime calls.
4. Migrate on a **copy** of the DB; run the full regression suite
   ([[POS-0018 Regression-test performance suite]] +
   [[POS-0020 PocketBase v0.22.55 regression test]]-style smoke).
5. Roll out only after green; keep the v0.22.55 backup for rollback.

## Done when

- A scheduled date is set and the migration is executed with tests passing (see
  [[POS-0023 PocketBase v0.40.4 migration test]]).

## Notes

- Use the `tasks` scheduler to book the actual migration window when the user is ready.

## Related

- Verified by [[POS-0023 PocketBase v0.40.4 migration test]].
- Builds on the stable v0.22.55 baseline from [[POS-0019 Upgrade PocketBase v0.22.9 → v0.22.55]].
