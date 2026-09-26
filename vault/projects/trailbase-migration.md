---
title: TrailBase migration
type: project
status: active
created: 2026-09-26
tags: [pos, trailbase, migration, workstream]
belongs_to: "[[aa-point-of-sale]]"
related_to: ["[[trailbase]]", "[[frontend-ssr]]"]
---

# TrailBase migration

The active workstream: replace the PocketBase backend ([[backend]]) and the Next.js client
([[frontend]]) with TrailBase ([[trailbase]]) and the server-rendered frontend
([[frontend-ssr]]).

## Definition of done

1. Production data lives in a TrailBase depot, migrated with ids and enum codes translated
   ([[pos-0027-migrate-production-data-to-trailbase]]).
2. A UI that staff accept covers the whole working day — invoices, printing and cash memo
   included.
3. The legacy PocketBase server is no longer written to, and a rollback path is documented.

Steps 1 and 3 are not started. Step 2 is roughly half done.

## Sequence

```text
[x] 1. Design and validate the TrailBase schema          -> 17 tables, 17 record APIs
[x] 2. Decide where report arithmetic lives              -> JavaScript, shared compute/
[x] 3. Build the SSR frontend for the read-heavy screens  -> dashboard, 14 reports, 4 ledgers
[x] 4. Build the SSR management screens                  -> 7 entities
[x] 5. Prove the numbers match the old views             -> npm run smoke: 55/55
[ ] 6. Recover the dropped-view endpoints on the legacy side
      -> [[tb-0013-rework-report-screens-without-views]]
[ ] 7. Decide the cutover shape
      -> [[pos-0028-decide-cutover-plan]]
[ ] 8. Repoint or retire the legacy Next.js client
      -> [[tb-0012-wire-nextjs-frontend-to-trailbase]]
[ ] 9. Migrate the production data
      -> [[pos-0027-migrate-production-data-to-trailbase]]
[ ] 10. Close the parity gaps the cutover decision exposes
      -> [[frontend-ssr-feature-parity-gaps]]
```

Step 7 gates 8 and 9: how much of the legacy UI must be rebuilt depends on whether it is
repointed at TrailBase or retired.

## What has already been decided

| Decision | Note |
|---|---|
| Drop SQL views; aggregate in the client | [[trailbase-drop-sql-views]] |
| Enumerations are integer codes + FK | [[trailbase-encode-enums-as-integer-codes]] |
| Multi-valued relations become link tables | [[trailbase-link-tables-over-json]] |
| Keep the PocketBase timestamp format | [[trailbase-pocketbase-data-compatibility]] |
| Pages are declarative manifests | [[trailbase-declarative-page-host]] |
| Reports refresh incrementally from a warm snapshot | [[trailbase-incremental-report-refresh]] |
| Data migration is a browser-side plugin | [[trailbase-client-side-migration-plugin]] |
| The legacy stack stays live until parity | [[keep-legacy-stack-in-production]] |

## Known friction in the migration

- **Views are gone, so view-shaped endpoints are gone.** `transaction_view`, `invoice_view`,
  `items_report`, `ledger_*`, `payments_view`, `net_price` and `outstanding_summary` have no
  TrailBase equivalent; their arithmetic moved into `frontend-ssr/compute/`. Any client that
  read them directly must change. [[tb-0013-rework-report-screens-without-views]].
- **Ids change shape.** PocketBase's 15-character `'r…'` ids become UUIDv7. Anything that
  stored an id outside the database — printed invoices, QR payloads — needs remapping, or
  the migration must insert with `uuid_parse()` and keep the old ids. Migration writes take
  canonical UUID text; reads and URL paths use url-safe base64. That asymmetry is a real
  footgun; see [[api-contract-trailbase]].
- **Naming is unresolved.** `items.category` renders as "Company" in both frontends, and
  there is now a real `companies` table. [[tb-0014-point-company-fields-at-companies]].
- **Money is `REAL`.** Kept for PocketBase compatibility, but every old view wrapped amounts
  in `printf("%.2f")` to hide float drift. Moving to integer cents is mechanical while the
  database is still empty — [[tb-0015-integer-cents-for-money]].
- **The old scaffold's frontend is in git but not in the tree.** `frontend-tb/` was written
  against the *earlier* TrailBase scaffold (names `products`, `companies2parties`,
  `partiesEnumType`, TEXT enums) and is deleted from the working tree but still in history;
  it needs renaming before it could talk to this schema. See [[previous-vault-recovery]] for
  how to get at deleted files.
- **Two wrong path references.** `trailbase/README.md` and `frontend-ssr/README.md` cite
  `../full_database_schema.sql` / `../dltbl/…`, which resolve to a directory that does not
  contain them. See [[stale-schema-sql-paths]].

## Open tasks

| Task | What |
|---|---|
| [[tb-0012-wire-nextjs-frontend-to-trailbase]] | repoint or replace the legacy client's data layer |
| [[tb-0013-rework-report-screens-without-views]] | fix the legacy screens that read dropped views |
| [[tb-0014-point-company-fields-at-companies]] | resolve the "Company" naming collision |
| [[tb-0015-integer-cents-for-money]] | move money to integer cents while it is cheap |
| [[pos-0027-migrate-production-data-to-trailbase]] | the actual data migration |
| [[pos-0028-decide-cutover-plan]] | repoint-the-client vs retire-the-client |

## Reference material

- [[data-model]] — tables, codes, value translation.
- [[api-contract-trailbase]] — every endpoint shape and the id/encoding rules.
- [[reports-and-ledgers]] — the arithmetic and its inherited quirks.
- [[build-and-run]] — starting any of the four systems.
- `trailbase/README.md` — the long-form evidence, including the validation table.
- `frontend-ssr/README.md` — the screen inventory and the smoke-test assertions.
