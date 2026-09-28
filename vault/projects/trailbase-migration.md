---
title: TrailBase migration
type: project
status: active
created: 2026-09-26
updated: 2026-09-27
tags: [pos, trailbase, migration, workstream]
belongs_to: "[[aa-point-of-sale]]"
related_to: ["[[trailbase]]", "[[runtime-js-guest-platform]]"]
---

# TrailBase migration

The active workstream: replace the PocketBase backend ([[backend]]) and the Next.js client
([[frontend]]) with TrailBase ([[trailbase]]) and the guest-WASM frontend
([[runtime-js-guest-platform]]).

## Definition of done

1. Production data lives in a TrailBase depot, migrated with ids and enum codes translated
   ([[pos-0027-migrate-production-data-to-trailbase]]).
2. A UI that staff accept covers the whole working day — invoices, printing and cash memo
   included — and looks like the legacy UI ([[guest-ui-is-a-direct-shift-of-legacy]]).
3. The legacy PocketBase server is no longer written to, and a rollback path is documented.

Step 1 is not started (the guest import plugin exists but is unverified,
[[pos-0029-rebuild-v1-import-on-guest]]). Step 2 is roughly half done: the read-heavy and
management surfaces exist on the guest, but the transactional screens are unbuilt and the UI is
not yet the legacy look. Step 3 is not started.

## Sequence

```text
[x] 1. Design and validate the TrailBase schema          -> 17 tables, 17 record APIs
[x] 2. Decide where report arithmetic lives              -> JavaScript, under app/compute/
[x] 3. Build the guest read screens                       -> dashboard, 14 reports, 4 ledgers
[x] 4. Build the guest management screens                 -> 7 entities
[x] 5. Prove the numbers match the old views              -> guest smoke 71/71, differential 14/14
[x] 6. Adopt the guest-WASM app platform                  -> runtime-js host (Phase 0 + app host port)
[ ] 7. Direct-shift the legacy UI onto the guest          -> [[tb-0023-direct-shift-legacy-ui-to-guest]]
[ ] 8. Build invoices / cash memos / printing on the guest -> [[tb-0021-invoices-cashmemos-printing]]
[ ] 9. Verify and finish the guest v1 (PocketBase) import  -> [[pos-0029-rebuild-v1-import-on-guest]]
[ ] 10. Decide the cutover shape                          -> [[pos-0028-decide-cutover-plan]]
[ ] 11. Repoint or retire the legacy Next.js client       -> [[tb-0012-wire-nextjs-frontend-to-trailbase]]
[ ] 12. Recover the dropped-view endpoints on the legacy side
      -> [[tb-0013-rework-report-screens-without-views]]
[ ] 13. Migrate the production data
      -> [[pos-0027-migrate-production-data-to-trailbase]]
```

Step 10 gates 11 and 13: how much of the legacy UI must be rebuilt depends on whether it is
repointed at TrailBase or retired in favour of the guest.

## What has already been decided

| Decision | Note |
|---|---|
| Drop SQL views; aggregate in the client | [[trailbase-drop-sql-views]] |
| Enumerations are integer codes + FK | [[trailbase-encode-enums-as-integer-codes]] |
| Multi-valued relations become link tables | [[trailbase-link-tables-over-json]] |
| Keep the PocketBase timestamp format | [[trailbase-pocketbase-data-compatibility]] |
| Pages are declarative manifests | [[trailbase-declarative-page-host]] |
| Reports refresh incrementally from a warm snapshot | [[trailbase-incremental-report-refresh]] |
| Data migration is a browser-side plugin (to be rebuilt on the guest) | [[trailbase-client-side-migration-plugin]] |
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
| The guest UI is a direct shift of the legacy UI, not a redesign | [[guest-ui-is-a-direct-shift-of-legacy]] |

## Known friction in the migration

- **Views are gone, so view-shaped endpoints are gone.** `transaction_view`, `invoice_view`,
  `items_report`, `ledger_*`, `payments_view`, `net_price` and `outstanding_summary` have no
  TrailBase equivalent; their arithmetic moved into the guest's `app/compute/`. Any client that
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
- **Two wrong path references.** `trailbase/README.md` cites `../full_database_schema.sql` and
  the preserved-view SQL path points at a directory that does not contain it. See
  [[stale-schema-sql-paths]].
- **The old Node frontend is gone.** `frontend-ssr/` was deleted on 2026-09-27
  ([[guest-ui-is-a-direct-shift-of-legacy]]); the guest's `trailbase/src/runtime/` is now the app.
  Anything that pointed at `frontend-ssr/` is superseded — see [[previous-vault-recovery]] for
  history.

## Open tasks

| Task | What |
|---|---|
| [[tb-0012-wire-nextjs-frontend-to-trailbase]] | repoint or replace the legacy client's data layer |
| [[tb-0013-rework-report-screens-without-views]] | fix the legacy screens that read dropped views |
| [[tb-0014-point-company-fields-at-companies]] | resolve the "Company" naming collision |
| [[tb-0015-integer-cents-for-money]] | move money to integer cents while it is cheap |
| [[tb-0017-adopt-trail-runtime-js]] | adopt the QuickJS runtime-JS host as the platform engine |
| [[tb-0018-port-app-host-on-runtime-js]] | port the app host (reports 14/14 parity; management/invoices left) |
| [[tb-0019-guest-jobs-queue]] | durable in-process job queue — done |
| [[tb-0020-guest-fingerprint-refresh]] | fingerprint-based incremental data refresh — done |
| [[tb-0021-invoices-cashmemos-printing]] | invoices / cash memos / printing — designed, not built |
| [[tb-0022-move-reports-to-sql]] | move report arithmetic into runtime SQL files — in progress |
| [[tb-0023-direct-shift-legacy-ui-to-guest]] | make the guest UI match legacy, screen for screen |
| [[pos-0027-migrate-production-data-to-trailbase]] | the actual data migration |
| [[pos-0028-decide-cutover-plan]] | repoint-the-client vs retire-the-client |
| [[pos-0029-rebuild-v1-import-on-guest]] | verify and finish the guest v1 import |

## Reference material

- [[data-model]] — tables, codes, value translation.
- [[api-contract-trailbase]] — every endpoint shape and the id/encoding rules.
- [[reports-and-ledgers]] — the arithmetic and its inherited quirks.
- [[build-and-run]] — starting any of the systems.
- [[trailbase-guest-wasm-spike-results]] — Phase 0 spike evidence for the guest-WASM platform.
- [[trail-runtime-js-reference]] — the existing Rust+QuickJS runtime-JS guest to build on.
- [[guest-app-host-port]] — the app-host port and the 14/14 report parity result.
- [[guest-vs-node-performance]] — measured guest latency.
- [[invoice-entry-freshness-and-writes]] — the invoice/cash-memo freshness and write design (proposed).
- [[guest-report-performance-options]] — ranked options to speed report generation.
- [[report-logic-stays-runtime-file-based]] — why moving arithmetic to SQL keeps the no-build goal.
- [[dispatcher-transpiled-per-request]] — the per-request transpile that shapes the guest baseline.
- [[trailbase-runtime-js-scheduler-not-running-jobs]] — why there is no background job poller.
- [[legacy-ui-reference-captures]] — the captured legacy UI.
- `trailbase/README.md` — the long-form evidence, including the validation table.
- `trailbase/src/host/README.md` — the app-host inventory and check commands.
