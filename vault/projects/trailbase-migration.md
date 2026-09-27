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
[ ] 11. Build the guest-WASM app platform (supersedes parts of 8/9)
      -> [[trailbase-guest-wasm-runtime-defaults]]; Phase 0 spikes done ([[tb-0016-guest-wasm-phase0-spikes]])
[ ] 12. Build invoices / cash memos / printing on the guest
      -> [[tb-0021-invoices-cashmemos-printing]]; design [[invoice-entry-freshness-and-writes]]
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
| The app platform is TrailBase guest-WASM, business JS evaluated at runtime | [[trailbase-guest-wasm-runtime-defaults]] |
| The app host is the runtime-js QuickJS component; rendering is folded in | [[runtime-js-single-host]] |
| Guest reads by SQL ordered `-id` and sorts with `compareText` for cross-engine determinism | [[deterministic-sort-and-sql-reads-in-guest]] |
| Guest writes go through `db.execute`; ids URL-safe base64, BLOBs via `unhex(hex)` | [[guest-writes-via-sql]] |
| Jobs run in-process on a durable, leased, idempotent SQLite queue | [[jobs-in-process-durable-queue]] |
| Guest data refresh is fingerprint-based and incremental | [[guest-fingerprint-refresh]] |
| Report results are cached in the KV store | [[guest-report-result-cache]] |
| Convert the base views to SQL; keep the report-level derivations in JS | [[convert-base-views-not-derivations]] |
| Guest has an outbound HTTP bridge; the app's own `/login` sets the cookies | [[guest-outbound-http-and-login]] |

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
| [[tb-0016-guest-wasm-phase0-spikes]] | Phase 0 guest-WASM spikes — done, evidence recorded |
| [[tb-0017-adopt-trail-runtime-js]] | adopt the QuickJS runtime-JS host as the platform engine |
| [[tb-0018-port-app-host-on-runtime-js]] | port the app host (reports 14/14 parity; management/invoices left) |
| [[tb-0019-guest-jobs-queue]] | durable in-process job queue — done |
| [[tb-0020-guest-fingerprint-refresh]] | fingerprint-based incremental data refresh — done |
| [[tb-0021-invoices-cashmemos-printing]] | invoices / cash memos / printing — designed, not built |
| [[tb-0022-move-reports-to-sql]] | move report arithmetic into runtime SQL files — in progress |
| [[pos-0027-migrate-production-data-to-trailbase]] | the actual data migration |
| [[pos-0028-decide-cutover-plan]] | repoint-the-client vs retire-the-client |

## Reference material

- [[data-model]] — tables, codes, value translation.
- [[api-contract-trailbase]] — every endpoint shape and the id/encoding rules.
- [[reports-and-ledgers]] — the arithmetic and its inherited quirks.
- [[build-and-run]] — starting any of the four systems.
- [[trailbase-guest-wasm-spike-results]] — Phase 0 spike evidence for the guest-WASM platform.
- [[trail-runtime-js-reference]] — the existing Rust+QuickJS runtime-JS guest to build on.
- [[guest-app-host-port]] — the app-host port and the 14/14 report parity result.
- [[guest-vs-node-performance]] — measured latency, guest vs Node, on the same depot.
- [[invoice-entry-freshness-and-writes]] — the invoice/cash-memo freshness and write design (proposed).
- [[guest-report-performance-options]] — ranked options to speed report generation.
- [[report-logic-stays-runtime-file-based]] — why moving arithmetic to SQL keeps the no-build goal.
- [[dispatcher-transpiled-per-request]] — the per-request transpile that shapes the guest baseline.
- [[trailbase-runtime-js-scheduler-not-running-jobs]] — why there is no background job poller.
- `trailbase/README.md` — the long-form evidence, including the validation table.
- `frontend-ssr/README.md` — the screen inventory and the smoke-test assertions.
