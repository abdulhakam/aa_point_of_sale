---
title: A stale depot keeps the old schema because refinery skips a changed migration
type: issue
status: known-limitation
severity: high
created: 2026-09-26
tags: [trailbase, migrations, refinery, gotcha, depot]
related_to: ["[[trailbase]]", "[[build-and-run]]"]
---

# A stale depot keeps the old schema because refinery skips a changed migration

## What happens

`trailbase/migrations/main/` holds a single migration,
`U1790208000__create_base_tables.sql`. If that file's content changes — as it did when the schema
was rewritten for integer enums and again when the table set changed — an **existing**
`traildepot/data/` does **not** get the new schema.

Refinery (the migration runner TrailBase uses) records a checksum for each applied migration and
**silently skips** a migration whose checksum no longer matches. It does not error, and it does not
re-run. So the server starts happily against the *old* schema.

## Why it is dangerous

- **The failure is silent.** "Migration applied successfully" is not printed, and nothing warns.
  The symptom appears later as a mysterious API or column error against a schema nobody believes
  is current.
- It specifically defeats the "re-scaffold by re-running `RUN.BAT`" instinct, because `RUN.BAT`
  only bootstraps when `%DEPOT%\data` does not exist.
- It makes a bad first impression on a fresh developer: the documented first run and the
  documented schema disagree, and the only clue is in the FAQ of one README.

## The rule

> **If you previously ran an earlier scaffold of this depot, delete `traildepot/data/` before
> starting the server.**

`trailbase/README.md` states this explicitly, in bold, and the delete is safe because the depot
holds no production data — the real data is still in PocketBase ([[backend]]) until
[[pos-0027-migrate-production-data-to-trailbase]].

```powershell
Remove-Item -Recurse -Force trailbase\traildepot\data
trailbase\RUN.BAT          # recreates the depot, applies the migration, sets the fixed password
```

Deleting `data/` also resets the admin password to the `RUN.BAT` default
(`admin@localhost` / `administrator-0ne`), because the bootstrap path runs again
([[build-and-run]]).

## The longer-term fix

Once there is real data (after the migration, or once the depot is used in earnest), "delete the
depot" stops being available and this becomes a genuine operational hazard. At that point the
migration discipline has to change to what refinery expects:

- Never edit an applied migration. Add a new, higher-numbered one instead
  (`U<epoch>__describe_the_change.sql`).
- Treat a checksum change in an applied migration as a bug, not a convenience — which is exactly
  the property that makes the current setup safe during scaffolding and unsafe afterwards.

There is also a schema-drift risk even with correct discipline: a dump of the live schema should be
compared against the migration files rather than trusted. Nothing in the repository does that
today.

## Evidence

- `trailbase/README.md` — "**If you previously ran the earlier scaffold, delete `traildepot/data/`
  first.** The table set and the migration contents changed, and refinery silently *skips* a
  migration whose checksum no longer matches, so a stale depot would keep the old schema."
- `trailbase/RUN.BAT` — the bootstrap branch is guarded by `if exist "%DEPOT%\data" goto
  :start_server`, so an existing depot is never re-initialised.
- `trailbase/migrations/main/` — exactly one migration, i.e. there has been no
  opportunity to exercise an additive migration yet.
- The prior vault recorded the same finding as `issues/trailbase-stale-depot-skips-migration.md`;
  see [[previous-vault-recovery]].
