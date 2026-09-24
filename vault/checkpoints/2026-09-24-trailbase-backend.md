---
type: Checkpoint
status: Current
belongs_to:
  - "[[TrailBase Backend]]"
work_session:
  - "[[Work Session — TrailBase Schema Redesign — 2026-09-24]]"
works_on:
  - "[[TB-0001 Redesign the TrailBase schema]]"
created: 2026-09-24
updated: 2026-09-24
tags:
  - trailbase
  - checkpoint
---

# Checkpoint — TrailBase Backend — 2026-09-24

## Objective

Leave the TrailBase schema redesign finished, verified and resumable, and record the measurements that
shaped it so the next session does not rediscover TrailBase's limits the hard way.

## Active tasks

- [[TB-0001 Redesign the TrailBase schema]] — **Done** (this session).
- [[TB-0002 Wire a frontend to the TrailBase server]] — Backlog, **held** pending re-specification.
- [[TB-0003 Migrate PocketBase data into the TrailBase schema]] — Backlog, **held** pending
  re-specification.

## Completed since previous checkpoint

- New schema written and validated: 17 `STRICT` tables, integer-coded enums with vocabulary tables,
  link tables instead of JSON arrays, no views.
- Views migration deleted; report SQL confirmed preserved in `full_database_schema.sql` and
  `../dltbl/views_from_pb/`.
- `config.textproto` rewritten: 17 record APIs, `expand` allow-lists, `SCHEMA` granted, vocabularies
  `READ, UPDATE` only.
- TrailBase's custom JSON-schema feature tested to destruction; the scalar limitation recorded as an
  Issue with a reproduction table.
- README rewritten as the design + findings + frontend-impact record.
- Knowledgebase extended: this project, a subsystem, four decisions, three issues, three tasks, the
  WorkSession, this checkpoint.

## Current verified state

- `trailbase/traildepot/migrations/main/U1790208000__create_base_tables.sql` is the whole schema.
- `traildepot/data/` does **not** exist: the depot is in a clean first-run state, so nothing needs to be
  deleted before `RUN.BAT`.
- The migration applies to an empty depot, all 17 record APIs resolve, the server boots
  (`Listening on http://[::1]:4000`), and unauthenticated requests return **403**.
- Enum validation, link uniqueness, the partial unique barcode index and `expand` inlining were each
  exercised over HTTP with the expected results (full table under
  [[TB-0001 Redesign the TrailBase schema]] `## Verification`).
- Installed server is `trail v0.33.15-0-g2b867e5a`; nothing was verified against a newer version.

## Files and artifacts changed

- `trailbase/traildepot/migrations/main/U1790208000__create_base_tables.sql` — rewritten.
- `trailbase/traildepot/migrations/main/U1790208120__create_views.sql` — deleted.
- `trailbase/traildepot/config.textproto` — rewritten.
- `trailbase/README.md` — rewritten.
- `trailbase/traildepot/metadata.textproto`, `trailbase/traildepot/.gitignore` — rewritten by TrailBase
  at startup; the `static/` line was restored by hand.
- Vault: `projects/trailbase-backend.md`, `subsystems/trailbase-server.md`, four files under
  `decisions/`, three under `issues/`, three under `tasks/`, this file and the WorkSession.
- Untouched but related: `frontend-tb/` (deleted from the working tree, still in git) targets the older
  scaffold and must not be mistaken for a current client.

## Decisions and assumptions that affect next steps

- Enums are integer codes + vocabulary foreign keys; the JSON-schema route was measured and rejected —
  [[Decision — Encode enumerations as integer codes with vocabulary tables]].
- No views; the client aggregates — [[Decision — Drop SQL views; aggregate reports client-side]].
- Link tables over JSON arrays — [[Decision — Model multi-valued relations as link tables]].
- PocketBase-compatible timestamps, `''` date sentinels, `0/1` booleans, `REAL` money —
  [[Decision — Keep PocketBase-compatible data shapes]]. All four are cheap to change *now* precisely
  because the database is empty; that window closes with [[TB-0003 Migrate PocketBase data into the TrailBase schema]].
- **Assumption to re-check:** that the owner wants this TrailBase system to keep the current table set
  at all. The stated expectation is that its specs and structure change drastically soon, so treat the
  17-table list as a working draft, and the four decisions as the durable part.

## Blockers and unresolved questions

- None blocking. Unresolved: is `REAL` money acceptable, or should it become integer cents before any
  data is loaded? Is `parties`↔`companies` really many-to-many?
- Both recorded TrailBase limitations are version-specific (`v0.33.15`) and should be re-probed after an
  upgrade, especially the scalar JSON-schema behaviour, which would restore a self-describing enum.

## Exact next action

No code action is scheduled. The next step is a **re-specification session with the owner**: state what
the TrailBase system is meant to be before [[TB-0002 Wire a frontend to the TrailBase server]] or
[[TB-0003 Migrate PocketBase data into the TrailBase schema]] is started. If work resumes without that
spec, start from `trailbase/README.md`.

## Verification still required

- Nothing for the completed redesign; its verification is recorded and reproducible from
  `trailbase/README.md`.
- `python scripts/kb_check.py vault` after this knowledgebase change (it passed at 100/100 before, and
  this session added 13 notes).

## Resume procedure

1. Read [[TrailBase Backend]] (outcome, current state, task index).
2. Read this checkpoint.
3. Read [[Work Session — TrailBase Schema Redesign — 2026-09-24]] for the activity log and the order
   things were measured in.
4. Read `trailbase/README.md` for the schema, the findings and the frontend-impact list.
5. Read the decision and issue notes above before changing any of the four recorded choices.
6. Continue from `Exact next action` unless reality has already invalidated it.
