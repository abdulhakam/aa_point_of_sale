---
title: "Direct SQLite v1 importer (TUI) that preserves created/updated"
type: task
status: done
priority: medium
created: 2026-10-06
updated: 2026-10-06
tags: [migration, import, trailbase, pocketbase, sqlite, tui, created-updated, done]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[v1-direct-import-tool]]", "[[guest-depot-created-is-import-time]]", "[[import-from-v1-drops-invoice-maker]]", "[[tb-0026-attribute-imported-invoice-maker-to-logged-in-user]]", "[[money-is-2dp-everywhere]]", "[[trailbase-client-side-migration-plugin]]"]
---

# Direct SQLite v1 importer (TUI) that preserves created/updated

**Done and verified 2026-10-06.** A standalone Node TUI, `trailbase/tools/import-v1-tui.mjs`, imports
a PocketBase `data.db` **directly into `traildepot/data/main.db`** instead of through the record API.

## Why

The record API stamps its own timestamps, so the browser import left every row's `created` and
`updated` at the import time ([[guest-depot-created-is-import-time]]), and it needed a logged-in
operator to attribute `invoice_maker` ([[tb-0026-attribute-imported-invoice-maker-to-logged-in-user]]).
Writing SQLite directly preserves the source timestamps, needs no session (the tool reads `_user`
from the destination and attributes to the first user by default — any user selectable), and is an
order of magnitude faster (~1,900 rec/s vs ~168 rec/s).

## Work

- [x] Write `trailbase/tools/import-v1-tui.mjs` — zero dependencies (`node:sqlite` + raw ANSI TUI).
- [x] Preserve `created`/`updated` from the source row.
- [x] Resolve relationships: `categories`→`companies`, `party_companies`, `order_booker_companies`,
      `invoices_return_reference`, enums, booleans, 2 dp amounts.
- [x] Attribute `invoice_maker` to a selected `_user` (first by default; `--user` by index/email/
      username/hex).
- [x] TUI: progress bar, records/speed/elapsed/errors, per-collection table, log, stop; `--plain`
      fallback.
- [x] Register the TrailBase SQL functions a plain connection lacks (`is_uuid_v7`, `uuid_v7`,
      `is_uuid`/`uuid_v4`, `is_email`, variadic `jsonschema`).
- [x] Test on a depot copy: wipe + full import, then verify.

## Evidence (a copy of the production depot, 2026-10-06)

- 60,245 source records → 60,245 created, **0 failures**, in **31.3 s** with wipe.
- Every collection: dest count == source count, and earliest `created` equal.
- `created` and `updated` multiset-equal to source for all eleven collections (0 mismatches).
- `party_companies` 13 / `order_booker_companies` 5 (= source JSON pairs); 23,413/23,413 transactions
  and 26,526/26,526 payments resolve; 206 items with a company (= source).
- 8,927/8,927 invoices attributed to the first `_user` (= source attributed count).

## Evidence (the live depot, end to end, 2026-10-07)

Full reset → import → restart → check, on the real `traildepot`:

1. `clear_db.bat` reset the depot (server stopped first); the three wasm components were restored
   into `traildepot\wasm\`, then `trail --depot=traildepot user change-password` initialised the
   schema and the admin user without starting the server.
2. `node trailbase/tools/import-v1-tui.mjs` (no `--wipe`; the depot was already fresh) →
   **60,245 created, 0 failures, 2 m 59 s**.
3. Server restarted with `trail --depot=traildepot run`.
4. Checks:

   | check | result |
   |---|---|
   | per-collection counts | all equal source (`parties` 943 = 942 + the seeded `Difference`) |
   | `created`/`updated` min..max, invoices/transactions/payments/items | **identical** to source |
   | `party_companies` / `order_booker_companies` | 13 / 5 (= source JSON pairs) |
   | transactions / payments resolvable | 23,413 / 26,526 = all |
   | `invoice_maker` | 8,927 / 8,927, all to the first `_user`, 0 dangling |
   | `inv_doc` | 8,927 rows for 8,927 live invoices |
   | HTTP `POST /api/auth/v1/login` + `/api/records/v1/invoices` | 200; `created`/`updated`/`invoice_maker` served intact |
   | app pages `/dashboard`, `/reports`, `/invoices` | 200 |
   | `/reports/payments`, `salesreport`, `dailysale`, `stockreport` | 200, **rows returned**, no "No data" |

**The live run took 2 m 59 s** (~336 rec/s) where the copy took 31 s: the copy was read from the OS
page cache on the same disk, while the live run wrote a fresh WAL. Correctness is identical; the
speed figure depends on the machine and the destination's state.

## `--wipe` made seed-safe (2026-10-07)

The first live run exposed a footgun: `--wipe` cleared `parties`, which includes the one
`Difference` counterparty the schema seeds (`U1790400000__invoice_lifecycle_and_difference_party.sql`,
idempotent by name), so a wiped re-import lost the row a difference needs and the `verify` table
flagged `parties 942 / 943`.

Fixed: `wipe()` now **re-seeds** the `Difference` party when it is absent, and `verify()` excludes
schema-seeded rows from its count comparison. Re-verified on a depot copy — a full `--wipe` import
gives 60,245 created, 0 failures, and `verify` all-ok including `parties source 942 / dest 942`
(the depot still holds 943). `--wipe` is therefore the way to re-import into an existing depot
(it preserves `_user`, unlike `clear_db.bat`, which resets the schema and the admin user).

## Not done (recorded, not hidden)

- It does not import the vaulter-lite `documents` store or the job queues.
- Source is the PocketBase **file**; the HTTP source remains the plugin / `import-from-v1.mjs`.

## Related

- [[v1-direct-import-tool]] — operating reference.
- [[trailbase-migration]] — the workstream.
