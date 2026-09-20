---
type: Task
status: Done
ticket: POS-0006
priority: P0
belongs_to:
  - "[[AA Point of Sale]]"
related_to:
  - "[[Backend — PocketBase Data Service]]"
affects:
  - "[[Backend — PocketBase Data Service]]"
created: 2026-09-20
updated: 2026-09-20
tags:
  - backup
  - safety
  - prerequisite
---

# POS-0006 Backup database and repo snapshot

## Goal

Guarantee a safe rollback point before any migration or binary change.

## Done when

- `backend/pb_data/data.db` and `logs.db` are copied to a timestamped backup (e.g.
  `backend/pb_data/backups/YYYYMMDD-HHMM/`) and verified to open read-only.
- `git status` is clean or current changes are intentionally committed/stashed.
- The backup location and restore steps are recorded in the WorkSession.

## Notes

- This is the gate for every subsequent task. Do not run migrations or swap the
  PocketBase binary before this is Done.

## Work log

- 2026-09-20 — Created `backend/pb_data/backups/20260920-1232/` (data.db 11,182,080 B,
  logs.db 57,126,912 B, types.d.ts) before any migration.
- 2026-09-20 — Verified the backup opens read-only with identical row counts
  (transactions 23,413 / payments 26,526 / invoices 8,927).
- 2026-09-20 — Confirmed `/backend/pb_data` is already in `.gitignore`, so backups are
  not committed. Working tree intentionally left with pre-existing unrelated changes
  (documented in the Checkpoint), which are not part of this work.

## Verification

- `python scripts/inspect_db.py backend/pb_data/backups/20260920-1232/data.db` returns
  the same row counts as the live DB; backup restore path = copy the two .db files back.

## Related

- Blocks all migration/upgrade tasks ([[POS-0007 Add indexes via migration]],
  [[POS-0019 Upgrade PocketBase v0.22.9 → v0.22.55]], [[POS-0022 Upgrade PocketBase to v0.40.4]]).
