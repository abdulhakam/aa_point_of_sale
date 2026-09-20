---
type: Task
status: Done
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

## Work log

- 2026-09-20 — Confirmed the [[POS-0006 Backup database and repo snapshot]] backup exists
  (`backend/pb_data/backups/20260920-1232/`).
- 2026-09-20 — Downloaded `pocketbase_0.22.55_windows_amd64.zip` from the GitHub release and
  verified its SHA-256 against `checksums.txt`
  (`418a835053fc908356b48582c195c0b5821b5cca6cf4669ee3ba7a3bfc0492db`).
- 2026-09-20 — Backed up the old binary to the session scratchpad, replaced
  `backend/pocketbase.exe`, ran `pocketbase migrate up --dir pb_data` — which applied one
  **built-in** PocketBase system migration (`1718706525_add_login_alert_column.go`); all project
  `.js` migrations were already recorded.
- Note: used the pinned release download (not `pocketbase update`, which would have jumped to
  the breaking v0.40.x line).

## Verification

- `backend/pocketbase.exe -v` → `pocketbase.exe version 0.22.55`.
- `/api/health` → 200; `_collections` still 27 (11 base + 1 auth + 15 views); all project
  migrations present in `_migrations`.
- `python scripts/tests/run_all.py` → **7/7 suites PASS** on the upgraded server.
- [[POS-0020 PocketBase v0.22.55 regression test]] → PASS (auth, CRUD, all 15 views, app pages).
- Bonus: request times roughly halved — e.g. `ledger_party` 0.95 s → **0.47 s**, the Sale page's
  API work 2.01 s → **1.23 s**.
