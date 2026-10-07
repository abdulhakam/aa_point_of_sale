---
title: "Direct SQLite v1 import tool"
type: reference
status: active
system: both
created: 2026-10-06
tags: [migration, import, trailbase, pocketbase, sqlite, tui, node, created-updated]
related_to: ["[[data-model]]", "[[import-from-v1-drops-invoice-maker]]", "[[guest-depot-created-is-import-time]]", "[[trailbase-client-side-migration-plugin]]", "[[pos-0029-rebuild-v1-import-on-guest]]", "[[money-is-2dp-everywhere]]", "[[tb-0035-direct-sqlite-v1-importer]]"]
---

# Direct SQLite v1 import tool

`trailbase/tools/import-v1-tui.mjs` is a standalone, zero-dependency Node TUI that imports a
PocketBase (v1) SQLite database **straight into the TrailBase depot file** (`traildepot/data/main.db`),
bypassing the record API. It is the file-to-file counterpart of the browser plugin
([[trailbase-client-side-migration-plugin]]) and the headless wrapper
(`trailbase/tools/import-from-v1.mjs`, which runs the plugin's own code over HTTP).

## Why it exists

The API path cannot preserve two things, both because the server stamps them:

- **`created` / `updated`** — the record API sets its own timestamps, so every imported row carried
  the import time ([[guest-depot-created-is-import-time]]). The direct writer copies the source
  row's own `created` and `updated` verbatim.
- **`invoice_maker` without a session** — attribution no longer needs a logged-in operator. The
  tool reads `_user` from the destination and attributes to a selected user.

It is also much faster: 60,245 rows in **≈31 s** (~1,900 rec/s) including a full wipe, against
~168 rec/s for the browser/API path ([[ui-import-from-v1-reset-2026-10-06]]).

## Running it

```sh
node trailbase/tools/import-v1-tui.mjs \
  --source legacyforparity/backend/pb_data/data.db \
  --dest   trailbase/traildepot/data/main.db \
  [--user <index|email|username|hex-id>] [--wipe] [--dry-run] [--limit N] [--yes] [--plain]
```

- `--user` picks the `_user` row `invoice_maker` is attributed to (default: the **first** user, ordered
  by `created`). It also accepts an id, so "any user" is selectable. In the TUI the list is
  arrow-selectable, first row selected.
- `--wipe` clears the business tables (dependency order) plus transient `invoice_lock`,
  `invoice_create_key`, `invoice_line_op` and `pagecache`, then restores the schema-seeded
  `Difference` party; `inv_doc` is cascaded by deleting `invoices`.
- `--dry-run` reads and maps without writing; `--limit N` caps rows per collection (testing);
  `--yes` skips the setup screen; `--plain` prints plain lines (non-TTY / logs).
- A plain summary and a per-collection **verification** (dest count == source count, and earliest
  `created` equal) print at the end. Exit status is non-zero on any failure.

**Stop the TrailBase server first.** The tool takes a write lock on `main.db`; a running server is
the only source of `SQLITE_BUSY`. It sets `busy_timeout=15000` and `foreign_keys=ON`.

### Wrappers: `devreset.bat` and `import.bat`

Two `.bat` wrappers in `trailbase/` turn a from-scratch reload into one command each:

- **`trailbase\devreset.bat`** — runs `clear_db.bat` (which wipes `traildepot\` and re-copies the
  checked-in sources) **and then re-places the prebuilt guest-wasm components** into
  `traildepot\wasm\`, so no `cargo build` is needed. It prefers the last build output in
  `target\wasm32-wasip2\release\`; if that is gone it stashes the components already deployed in
  `traildepot\wasm\` before the wipe and restores them. It warns if neither exists.
- **`trailbase\import.bat`** — runs this tool against the v1 `data.db` with
  `--user admin@localhost --wipe --yes` (extra args are forwarded). It initialises `traildepot\data\main.db`
  and the admin user first if the depot does not exist yet (the same bootstrap `RUN.BAT` uses), so it
  works on a freshly `devreset` depot. `--wipe` makes it destructive to existing business rows in that
  depot — see the warning at the top of the file.

Flow: `devreset.bat` → `import.bat` → `RUN.BAT`. The two wrappers exist for offline/data-testing
reloads of the production depot copy.

## What it does that the API path cannot

| | API plugin | direct tool |
|---|---|---|
| destination | HTTP record API | `main.db` (SQLite) |
| `created`/`updated` | import time | **source value** |
| `invoice_maker` | needs logged-in operator (`/session`) | any `_user`, first by default |
| speed | ~168 rec/s | ~1,900 rec/s |
| source | PocketBase over HTTP | PocketBase `data.db` file |

## Relationship mapping (same contract as the plugin)

- legacy `categories` **is** the company list → written into `companies` (`categories` no longer
  exists; `items.category` FKs to `companies`);
- `parties.company` / `order_bookers.company` JSON arrays → `party_companies` /
  `order_booker_companies` rows (`INSERT OR IGNORE` on the UNIQUE pair);
- `invoices_return_reference.original_invoices` → `invoices`;
- enum text → integer codes; `true`/`false` → `1`/`0`; amount columns (`amount`, `discount_rs`)
  rounded to whole paisas ([[money-is-2dp-everywhere]]), while unit prices/costs/percentages stay
  raw;
- destination ids are UUIDv7 with the timestamp seeded from the source `created`, so id ordering
  follows source chronology.

The schema's `CHECK (is_uuid_v7(id))` and `DEFAULT (uuid_v7())` need TrailBase's own SQL functions,
which do not exist in a plain SQLite connection; the tool registers `is_uuid_v7`, `uuid_v7`,
`uuid_4`/`is_uuid`, `is_email` and a variadic `jsonschema` stub so DDL validation and inserts resolve.

## Verified

On a **copy** of the production depot (`traildepot/data/main.db`, 60,245 source records), 2026-10-06:

- all 60,245 rows created, **0 failures**; per-collection counts and earliest `created` match the
  source (`import … verify` output);
- `created` **and** `updated` are multiset-equal to the source for every collection
  (`sections` … `payments`, 0 mismatches);
- links: `party_companies` 13, `order_booker_companies` 5 — equal to the source JSON pairs
  ([[data-model]]);
- relations resolve: 23,413/23,413 transactions, 26,526/26,526 payments, 206/207 items with a
  company (matching the source's 206 non-empty);
- `invoice_maker`: 8,927/8,927 attributed to the first `_user`, matching the source's 8,927
  attributed rows ([[tb-0026-attribute-imported-invoice-maker-to-logged-in-user]]).

**Live end to end 2026-10-07**: `clear_db.bat` reset the real depot, the tool imported with the
server stopped (**60,245 created, 0 failures, 2 m 59 s**), the server was restarted, and every check
above held — plus 8,927 `inv_doc` rows, HTTP-served `created`/`updated`/`invoice_maker` intact, and
`/reports/{payments,salesreport,dailysale,stockreport}` returning rows with no "No data"
([[tb-0035-direct-sqlite-v1-importer]]).

> **`--wipe` is seed-safe.** It clears the business tables and then restores the rows the schema
> seeds — today the single `Difference` counterparty party (`U1790400000`), without which a
> difference cannot be entered. The final `verify` table excludes those seeded rows from the count
> comparison, so `parties` reads `source 942 / dest 942` even though the depot holds 943. Use
> `--wipe` to re-import into an existing depot (it preserves `_user`, unlike `clear_db.bat`); use
> `clear_db.bat` for a full schema+app reset.

## Not done

- It is a **copy**, not a merge: it does not dedupe against existing rows. Use `--wipe` for a clean
  load.
- It reads the PocketBase **file**, not a running PocketBase HTTP server (use the existing plugin /
  `import-from-v1.mjs` for that).
- `documents` (vaulter-lite file store) and the job queues are not imported.

## Related

- [[tb-0035-direct-sqlite-v1-importer]] — the task and its evidence.
- [[guest-depot-created-is-import-time]] — the defect this resolves for the direct path.
- [[import-from-v1-drops-invoice-maker]] — the attribution pitfall, unchanged.
- [[data-model]] — tables, codes, value translation.
