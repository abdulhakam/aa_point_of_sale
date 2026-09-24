---
type: Issue
status: Open
created: 2026-09-24
updated: 2026-09-24
belongs_to:
  - "[[TrailBase Backend]]"
related_to:
  - "[[Backend — TrailBase Server]]"
affects:
  - "[[TrailBase Backend]]"
tags:
  - trailbase
  - migrations
  - risk
---

# Issue — A stale TrailBase depot silently keeps an old schema

## Summary

TrailBase applies migrations with refinery, which records each applied migration's **checksum**. If a
migration file is later edited, the checksum no longer matches, and the divergent migration is
**skipped with a `WARN`** rather than failing. So an existing `traildepot/data/` keeps the old tables
while the server starts normally — the schema change appears to have done nothing.

The mirror image is also true: deleting an already-applied migration file aborts startup with
`migration V…__name is missing from the filesystem`.

## Evidence (observed 2026-09-24, `trail v0.33.15`)

- Editing the migration while a populated `data/` existed:
  `WARN trailbase_refinery::traits::divergent] applied migration V1__initial is different than filesystem one U1__test => skipping U1__test`
  — startup continued with the old schema.
- Deleting an applied migration file:
  `Migration error for 'main' DB (asnyc): migration V1790209001__probe is missing from the filesystem` → startup failed.

## Impact

- A schema redesign (like [[TB-0001 Redesign the TrailBase schema]]) can be silently ineffective on any
  machine that already has a `data/` directory, and the only signal is one `WARN` line in the startup
  log. Everything downstream then fails in confusing ways.
- Conversely, removing or renaming a committed migration breaks other people's depots on startup.

## Mitigation

- `traildepot/data/` is git-ignored and never shared, so treat it as disposable. After any migration
  change, delete it and let the server recreate it from scratch — this is documented in the README as
  the first-run instruction.
- Treat the migration set as append-only once a depot exists outside your machine: add a new migration
  instead of editing an applied one.
- The warning lives in the startup log; a deployment script that only checks the exit code will not see it.

## Options

1. Keep the "delete `data/` on schema change" rule (current, adequate while there is no production data).
2. Add a checksum guard to the run path (`trail --depot=… schema <api>` plus a log scan) once real data
   starts arriving with [[TB-0003 Migrate PocketBase data into the TrailBase schema]].
3. Adopt append-only migrations and stop editing applied files.

## Related

- [[Backend — TrailBase Server]] — how the depot is laid out.
- [[TB-0001 Redesign the TrailBase schema]] — where this was hit.
