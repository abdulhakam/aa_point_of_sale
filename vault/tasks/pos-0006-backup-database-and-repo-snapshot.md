---
type: Task
status: Ready
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

## Related

- Blocks all migration/upgrade tasks ([[POS-0007 Add indexes via migration]],
  [[POS-0019 Upgrade PocketBase v0.22.9 → v0.22.55]], [[POS-0022 Upgrade PocketBase to v0.40.4]]).
