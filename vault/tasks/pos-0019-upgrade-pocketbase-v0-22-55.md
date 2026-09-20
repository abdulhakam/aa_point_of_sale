---
type: Task
status: Ready
ticket: POS-0019
priority: P1
belongs_to:
  - "[[AA Point of Sale]]"
related_to:
  - "[[Backend — PocketBase Data Service]]"
affects:
  - "[[Backend — PocketBase Data Service]]"
blocked_by:
  - "[[POS-0006 Backup database and repo snapshot]]"
  - "[[POS-0018 Regression-test performance suite]]"
created: 2026-09-20
updated: 2026-09-20
tags:
  - upgrade
  - pocketbase
  - deployment
---

# POS-0019 Upgrade PocketBase v0.22.9 → v0.22.55

## Goal

Move the server to the latest **v0.22.x** patch (0.22.55, Aug 2026) — a drop-in binary
upgrade that brings 46 releases of SQLite/perf/security fixes with **no** code or
migration rewrite.

## Why this target (user decision)

- v0.22.55 keeps the existing JS-migration API (`new Dao(db)`, `SchemaField`,
  `collection.options.query`) and the JS SDK 0.20.1 API (`authWithPassword`, `getFullList`,
  `getList`) — all current code works unchanged.
- The jump to **v0.40.4** is a *breaking* major migration (new `$app` JS API, new fields
  API, SDK ~0.26+, auth/realtime changes) and is handled separately in [[POS-0022 Upgrade PocketBase to v0.40.4]].

## Steps

1. Confirm [[POS-0006 Backup database and repo snapshot]] backup exists.
2. Download `pocketbase_0.22.55_windows_amd64.zip` (GitHub releases).
3. Stop the running server; back up `backend/pocketbase.exe`.
4. Replace with the 0.22.55 binary (or run `./pocketbase update`).
5. Run `pocketbase migrate up` (applies [[POS-0007 Add indexes via migration]] index migration if not yet applied).
6. Start `pocketbase serve` and verify it boots and serves `_collections`/views.

## Done when

- Server reports `pocketbase.exe version 0.22.55` and serves the app.
- Existing collections, views, and auth work (verified in [[POS-0020 PocketBase v0.22.55 regression test]]).

## Related

- Verified by [[POS-0020 PocketBase v0.22.55 regression test]].
- Precedes the deferred [[POS-0022 Upgrade PocketBase to v0.40.4]].
