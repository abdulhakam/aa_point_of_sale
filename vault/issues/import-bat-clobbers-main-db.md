---
title: "import.bat overwrote main.db with an echo line (unescaped > in cmd)"
type: issue
status: active
created: 2026-10-10
updated: 2026-10-10
tags: [migration, import, bat, cmd, depot, defect, corrupt]
related_to: ["[[v1-direct-import-tool]]", "[[control-panel]]", "[[pos-0030-control-panel-gui-importer]]", "[[trailbase-migration]]"]
---

# import.bat overwrote main.db with an echo line (unescaped `>` in cmd)

**Verified 2026-10-10.** Imports failed with `open destination: file is not a
database` because the destination `traildepot\data\main.db` had been **replaced
by a line of text**, not a database. The defect was in `import.bat`, not in any
importer.

## Root cause

`import.bat` line 42 (before the fix) read:

```bat
echo Importing "%SOURCE%" -> "%DEST%"  ^(invoice_maker -^> %ADMIN_USER%, wiping business tables^) ...
```

The **first** `->` is un-escaped. `cmd` parses `> "%DEST%"` as a **stdout
redirect**, so the `echo` writes its text *into* `%DEST%`
(`traildepot\data\main.db`), truncating the database **before** the importer
runs. Every `import.bat` invocation destroyed the depot DB and then failed.
(The later `-^>` was escaped; only the first one was missed.)

## Evidence

- `traildepot\data\main.db` was **122 bytes**, not a SQLite file:
  ```
  49 6D 70 6F 72 74 69 6E 67 20 22 ...   = "Importing \"..."
  ```
  decoded exactly to
  `Importing "..\legacyforparity\backend\pb_data\data.db" -  (invoice_maker -> admin@localhost, wiping business tables) .....`
- Any opener reports `file is not a database` — reproduced with the Go control
  panel's CLI: `cannot start: open destination: file is not a database`.

## Fix

Escape the redirection (use `-^>`), which is what line 42 now does:

```bat
echo Importing "%SOURCE%" -^> "%DEST%"  ^(...) ...
```

A repo-wide scan of `*.bat` `echo` lines for an un-escaped `>` found this one
line only; the other wrappers are clean.

## Restore performed (2026-10-10)

1. Backed up the clobbered file to
   `traildepot\data\main.db.corrupt-log-2026-10-10` (evidence).
2. Removed it (and `-wal`/`-shm`), synced `migrations\` into the depot, and
   re-initialised the schema with
   `trail --depot=traildepot user change-password admin@localhost administrator-0ne`
   (new `main.db` = 4,096 bytes, valid).
3. Re-imported with the Go control panel (`controlpanel.exe --cli --wipe`):
   **all 11 collections verified, 0 failures, 792 s.**

## Lesson

A `>` inside an `echo` is a redirection, not text. Any `echo` that prints a `>`
must write `-^>` (or avoid `>`). The failure mode is severe and silent: the
target is truncated, and the *importer* is blamed for a file the *shell*
destroyed.
