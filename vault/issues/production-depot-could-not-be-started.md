---
title: "The production depot could not be started — three defects, all in the generated copy"
type: issue
status: open
severity: high
created: 2026-09-29
updated: 2026-09-29
tags: [trailbase, depot, migrations, deploy, windows, line-endings]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[trailbase-stale-depot-skips-migration]]", "[[build-and-run]]", "[[tb-0028-guest-transactional-screens-and-mobile]]", "[[snapshot-persistence-hits-the-20s-deadline]]"]
---

# The production depot could not be started — three defects, all in the generated copy

Found 2026-09-29 while starting the server for [[tb-0028-guest-transactional-screens-and-mobile]].
`trail run` refused to start against the 60,245-record `trailbase/traildepot`, in three steps.
None of the three is in the tracked source; all three are in the **generated** depot, which
`clear_db.bat` owns and git-ignored, so `git restore` cannot repair them — the depot survived the
2026-09-29 worktree mass deletion only because git never tracked it.

## 1. `traildepot/config.textproto` was missing — hard stop

```
trail --depot=traildepot run
Error: Connection(Sql(Other(Error { kind: MissingVersion(Migration { name: "create_base_tables", ... } }))))
```

The symptom names a *migration*, which sends you looking at `migrations/`. The real cause is one
level up: the depot root had **no `config.textproto` and no `metadata.textproto`** (only `.gitignore`
and the directories). Without a config the server finds no database, so no migration version resolves
and refinery reports the first *applied* migration it cannot see.

**Fix** — restore the two files from source. This is safe and does **not** touch the data:

```powershell
Copy-Item trailbase/config.textproto   trailbase/traildepot/config.textproto   -Force
Copy-Item trailbase/metadata.textproto trailbase/traildepot/metadata.textproto -Force
```

**Do not** reach for `clear_db.bat` to "reset" the depot: it deletes `traildepot\data` first, which
is the production import.

## 2. `traildepot/migrations/main/U1790208000__create_base_tables.sql` was missing — hard stop

After the config was restored the same `MissingVersion` error remained, naming the same migration.
The file was simply **absent from the depot copy** — the source has seven migration files, the depot
had six. A `robocopy migrations traildepot\migrations /MIR` restored it and the server started.

The detection that matters: a hash comparison that iterates over the files *present in the depot*
cannot see a missing file. Compare the two directories both ways.

## 3. All six applied migrations are reported as "different than filesystem one"

```
WARN trailbase_refinery::traits::divergent] applied migration V1790208000__create_base_tables is
     different than filesystem one U1790208000__create_base_tables => skipping
```

The server now starts, but refinery skips every app migration because the recorded checksum differs
from the file. The SQL is byte-identical (verified by hash and by a full-text diff), so the recorded
checksums were computed over a **different line-ending** version of these files: the depot was
scaffolded from a CRLF checkout (`core.autocrlf=true` on this machine) and the depot's copies were
later replaced by LF copies.

One file made this fatal rather than silent: `U1790300500__invoice_document_sync.sql` had CRLF in the
working tree while the depot copy was LF, so its *hash* differed. It is a schema-changing migration,
and unlike a plain divergence the mismatch is not even a warning here — normalising it to LF (77
bytes fewer: 1,627 CRs) made the hashes agree again.

**Root cause of the drift: `core.autocrlf=true` on this machine.** Git rewrites LF to CRLF in the
working tree, so a file edited on Windows can differ from the copy TrailBase applied, byte for byte,
with no visible content change. It already produced a second symptom the same day — copying
`trailbase/metadata.textproto` into the depot showed up in `git status` as modified with *no* diff,
purely line endings. The prevention is a `.gitattributes` marking `trailbase/migrations/**/*.sql` as
`text eol=lf`; until that exists, a hash comparison (not a diff) is the only reliable check.

**Consequence to remember:** the depot's migration bookkeeping is no longer trustworthy as a change
detector. It cannot tell a real schema change from a line-ending change. A future migration that is
genuinely edited will be *skipped silently* on this depot — the classic
[[trailbase-stale-depot-skips-migration]], now with a second disguise. The only reliable check is a
hash/content diff between `trailbase/migrations/` and `trailbase/traildepot/migrations/`.

## The safe deploy path, now that clear_db is off the table

`--runtime-root-fs=traildepot\runtime` points at the **generated copy**, not at
`trailbase/runtime/` ([[trailbase-guest-wasm-runtime-defaults]]). So an app edit needs the source
synced across and the server restarted. Neither step requires a database rebuild:

```powershell
robocopy trailbase\runtime   trailbase\traildepot\runtime   /MIR /NFL /NDL /NJH /NJS /NP
robocopy trailbase\migrations trailbase\traildepot\migrations /MIR /NFL /NDL /NJH /NJS /NP
# then restart:
trail --depot=traildepot run --address=127.0.0.1:4000 --runtime-threads=4 --runtime-root-fs=traildepot\runtime
```

**The restart is not optional for library files.** `route.ts` is re-evaluated on every request, but
`app/lib/*.js` is loaded once per QuickJS context and cached on `globalThis.__AA_MODS__`
([[runtime-js-single-host]]). A new export in an existing module is *not* picked up by a sync alone —
the screen fails with `not a function` or `cannot read property 'X' of undefined` until the process
restarts. Template (`app/views/*.html`) and static asset edits do hot-reload
([[trailbase-guest-template-cache-wasi-mtime]]).

`RUN.BAT` cannot be used to start this depot: it re-runs `clear_db.bat` whenever
`traildepot\config.textproto` is missing, which is exactly the state the depot was in, and
`clear_db.bat` wipes `traildepot\data`.

## Related

- [[build-and-run]] — the deploy path above is recorded there as the supported flow.
- [[tb-0028-guest-transactional-screens-and-mobile]] — the work this was found in.
