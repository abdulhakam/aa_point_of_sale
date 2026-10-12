---
$schema: "./notes.schema.json"
title: Git history rewrite 2026-10-12
type: note
status: active
created: 2026-10-12
tags: [git, history, privacy, documentation]
related_to: ["[[trailbase-migration]]", "[[environment]]", "[[build-and-run]]"]
---

# Git history rewrite 2026-10-12

On 2026-10-12 the repository history was rewritten with `git filter-repo` to shrink it and
to scrub business data. This note records exactly what was removed so a later session does
not re-derive it.

## Why

`git count-objects -vH` reported ~286 MB of loose objects + ~260 MB in 36 packs, plus an
88 MB garbage pack. Tracked history held ~371 MB of databases and compiled binaries that
the working tree no longer needs, and stale dangling objects added ~914 MB more.

## What was purged from every revision

Heavy files (big binaries and the PocketBase data directory):

- `backend/pocketbase.exe`
- `backend/p_data/` — the PocketBase data directory. **Note the historical spelling is
  `p_data`, not `pb_data`**; the live working copy under `legacyforparity/backend/` is
  `pb_data/`.
- `backend/pb_data_bench/`
- `standalone/node_modules/@swc/core-win32-x64-msvc/swc.win32-x64-msvc.node`
- `standalone/node_modules/@esbuild/win32-x64/esbuild.exe`
- `standalone/node_modules/sharp/build/Release/libvips-42.dll`
- `standalone/node_modules/sharp/build/Release/libglib-2.0-0.dll`

Captured evidence bundles that rendered the business identity (privacy):

- `.kilo/route-snapshot-baseline.txt`
- `vault/attachments/legacy-ui/`
- `vault/attachments/ui-capture/`
- `vault/attachments/ui-capture-2026-10-09/`
- `vault/attachments/ui-parity-run-2026-10-09/`
- `vault/attachments/ui-parity-run-2026-10-10/`
- `vault/attachments/ui-parity-run-2026-10-11/`
- `vault/attachments/ui-parity-run-2026-10-11-postfix/`

## What was scrubbed (replaced, files kept)

Every occurrence in history of the business identity was replaced with neutral
placeholders by `--replace-text`:

| Removed | Replaced with |
|---|---|
| the business name | `SAMPLE TRADERS` |
| the business address | `123 Sample Street, Sample City` |
| the business phone | `000-0000000` |

(The literal values are deliberately not repeated here — writing them down would put the
scrubbed data straight back into history, which is exactly what this rewrite removed.)

This covered `trailbase/runtime/app/config/business.json` and the default business
constants in `trailbase/runtime/app/lib/*.js`, plus prose in `docs/` and `vault/`.

## Result

- Pack size after the rewrite: **~29.45 MiB** (from ~546 MB of objects).
- a case-insensitive `git grep` for the business name across every revision returns nothing.
- `links.mjs` still reports 0 broken / 0 ambiguous wikilinks.

## Consequences

- Every commit hash changed. The `origin` remote was removed by `git filter-repo` and
  re-added by hand; the branch must be **force-pushed** (`git push --force-with-lease`) for
  any clone to see the new history. A backup bundle was taken before the rewrite.
- `.gitignore` now blocks databases (`*.db`, `pb_data/`, `p_data/`), compiled binaries
  (`*.exe`, `*.dll`, `*.node`, `*.lib`, …) and `/.kilo/route-snapshot-baseline.txt` so the
  same classes of file cannot re-enter history.

## See also

- [[build-and-run]] — the `.bat` scripts, now reachable through the single `aa.bat` launcher
  at the repository root.
- [[environment]] — where the business identity used to be configured.
