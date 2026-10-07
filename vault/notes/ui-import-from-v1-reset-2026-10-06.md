---
$schema: "./notes.schema.json"
title: "Browser UI import on a freshly reset depot (2026-10-06)"
type: note
status: active
created: 2026-10-06
tags: [import, migration, trailbase, guest, invoice-maker, verification]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[reports-parity-and-e2e-2026-09-29]]", "[[tb-0026-attribute-imported-invoice-maker-to-logged-in-user]]", "[[trailbase-client-side-migration-plugin]]", "[[fresh-import-and-whole-database-digest-2026-10-04]]", "[[build-and-run]]"]
---

# Browser UI import on a freshly reset depot (2026-10-06)

A re-run of the migration **through the actual browser UI** — `/plugins/import-from-v1/` on the guest,
driven with real clicks, not the headless wrapper — to confirm the human-accessible path still works
end to end on a depot reset from scratch. This is the browser-path counterpart to
[[reports-parity-and-e2e-2026-09-29]] and the live proof that [[tb-0026-attribute-imported-invoice-maker-to-logged-in-user]]
lands in the real path, not just in code.

## Method

1. **Source:** `legacyforparity/backend/pocketbase.exe serve --dir pb_data --http 127.0.0.1:8090`
   (PocketBase 0.22.9). `pb_data/data.db` is the oracle (17.9 MB); every business collection is
   world-readable, so the plugin reads it with no PocketBase credentials.
2. **Destination reset:** `trailbase\clear_db.bat` (wipes `traildepot\data` and the generated app),
   then the wasm components restored from `trailbase\target\wasm32-wasip2\release\` into
   `traildepot\wasm\`, then `trail user change-password admin@localhost …` to seed the admin user.
3. **Server:** `trail --depot=traildepot run --address=127.0.0.1:4000 --runtime-root-fs=traildepot\runtime`
   ([[build-and-run]] § *TrailBase — the system that runs*).
4. **Browser:** logged in at `/login` (admin@localhost), opened `/plugins/import-from-v1/`, entered
   the destination password, left the PocketBase fields blank, left *Clear existing data* and *Dry run*
   unchecked, pressed **Start import**. No server-side helper was involved — the plugin is
   browser-side by design ([[trailbase-client-side-migration-plugin]]).

The run finished with **status `done`** and the flash `Import done.` The captured page is
[[import-from-v1-ui-2026-10-06.png]].

## Result — 60,245 / 60,245, 0 failed

Per collection, `read == created` and `failed == 0` throughout (the plugin's own summary):

| collection | read | created | links | failed |
|---|---|---|---|---|
| sections | 10 | 10 | — | 0 |
| categories → companies | 15 | 15 | — | 0 |
| areas | 59 | 59 | — | 0 |
| parties | 942 | 942 | 13 | 0 |
| order_bookers | 4 | 4 | 5 | 0 |
| items | 207 | 207 | — | 0 |
| expenses | 88 | 88 | — | 0 |
| invoices | 8,927 | 8,927 | — | 0 |
| invoices_return_reference | 54 | 54 | — | 0 |
| transactions | 23,413 | 23,413 | — | 0 |
| payments | 26,526 | 26,526 | — | 0 |
| **total** | **60,245** | **60,245** | **18** | **0** |

Direct counts read from the depot, once the server had stopped writing, agree
(`traildepot/data/main.db`): invoices 8,927, transactions 23,413, payments 26,526, expenses 88,
items 207, sections 10, areas 59, companies 15, parties **943**, order_bookers 4,
invoices_return_reference 54, `party_companies` 13, `order_booker_companies` 5. Parties is 943, not
942, because the schema seeds one `Difference` counterparty — the same one-row difference recorded in
[[fresh-import-and-whole-database-digest-2026-10-04]]. There is no `categories` table: migration
`U1790300400` retires it and `items.category` points at `companies`.

## The `invoice_maker` attribution — verified, not dropped

This was the open verification on [[tb-0026-attribute-imported-invoice-maker-to-logged-in-user]], and
it passes:

- `SELECT COUNT(*) FROM invoices WHERE "invoice_maker" IS NOT NULL` = **8,927** of 8,927.
- Every value resolves against `_user` — **0 dangling** — to `admin@localhost`, the operator who ran
  the import.

So the historical maker reference is no longer lost, and the column now means **"imported by"** for
these rows, not "created by". [[reports-parity-and-e2e-2026-09-29]] previously recorded the reference
as dropped; that note is corrected in place.

## One documentation drift this surfaced

`runtime/app/plugins/import-from-v1/meta.md` still says the plugin *"Drops `invoices.invoice_maker`"*
and reports how many were lost. That described the plugin **before** `tb-0026`; the page's own
`index.html` now attributes to the operator and logs `attributedMakers`. The prose is stale, not the
behaviour.

## Related

- [[reports-parity-and-e2e-2026-09-29]] — the first browser-UI import, on which the counts above agree.
- [[tb-0026-attribute-imported-invoice-maker-to-logged-in-user]] — the attribution this run verifies.
- [[fresh-import-and-whole-database-digest-2026-10-04]] — the whole-database digest method and the seeded-row caveat.
- [[build-and-run]] — `clear_db.bat`, the wasm restore and the server invocation used here.
