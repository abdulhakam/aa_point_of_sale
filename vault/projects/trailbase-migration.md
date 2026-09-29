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

Step 1 is **done and verified (2026-09-29)**: the guest import plugin was run through the browser
UI at `/plugins/import-from-v1/` — 60,245 / 60,245 records, 0 failures, per collection
`read == created` — and per-table money and quantity sums match PocketBase exactly
([[reports-parity-and-e2e-2026-09-29]], [[clean-slate-benchmark-cycle]]). The depot currently holds
that data. An earlier revision of this note said the depot had been reset and no data was loaded;
that was stale. Step 2 is roughly half done: the read-heavy and
management surfaces exist on the guest, but the transactional screens are unbuilt and the UI is
not yet the legacy look. Step 3 is not started.

## Sequence

```text
[x] 1. Design and validate the TrailBase schema          -> 17 tables, 17 record APIs
[x] 2. Decide where report arithmetic lives              -> JavaScript, under app/compute/
[x] 3. Build the guest read screens                       -> dashboard, 10 reports, 4 ledgers
[x] 4. Build the guest management screens                 -> 7 entities
[x] 5. Prove the numbers match the old views              -> guest smoke 76/76, differential 14/14
[x] 6. Adopt the guest-WASM app platform                  -> runtime-js host (Phase 0 + app host port)
[x] 6a. Flatten the layout, drop the guests spike        -> [[tb-0024-flatten-new-system-layout]]
[ ] 7. Direct-shift the legacy UI onto the guest          -> [[tb-0023-direct-shift-legacy-ui-to-guest]]
[ ] 7a. Invoice / payment / inventory screens + mobile   -> [[tb-0028-guest-transactional-screens-and-mobile]] (done 2026-09-29)
[ ] 8. Build invoices / cash memos / printing on the guest -> [[tb-0021-invoices-cashmemos-printing]]
[x] 8a. Invoice lifecycle, spreadsheet grid, standalone document -> [[guest-invoice-lifecycle]] (done 2026-09-29)
[x] 9. Verify and finish the guest v1 (PocketBase) import  -> done 2026-09-29, 60,245/60,245, sums match
[ ] 10. Decide the cutover shape                          -> [[pos-0028-decide-cutover-plan]]
[ ] 11. Repoint or retire the legacy Next.js client       -> [[tb-0012-wire-nextjs-frontend-to-trailbase]]
[ ] 12. Recover the dropped-view endpoints on the legacy side
      -> [[tb-0013-rework-report-screens-without-views]]
[ ] 13. Migrate the production data
      -> [[pos-0027-migrate-production-data-to-trailbase]]
[ ] 14. Gate the component split on a parity oracle    -> rebuild the differential FIRST
[ ] 15. Manifest-driven routing + JSON data DAG          -> [[manifest-driven-routing-and-data-dag]]
[ ] 16. Three generic artifacts: composer + separate     -> [[component-split-and-sql-materialised-tables]]
[ ] 17. Trigger-maintained Tier 2 materialised tables   -> resolves open decision 2 and tb-0015
```

Step 10 gates 11 and 13: how much of the legacy UI must be rebuilt depends on whether it is
repointed at TrailBase or retired in favour of the guest.

**Step 7a is a demonstration slice, not step 7 or step 8.** On 2026-09-29 the guest gained
`/invoices` (sale + purchase entry), `/payments` (invoice-linked and standalone DA) and
`/inventory` (live stock, item edit), plus a mobile layout for every page. Printing, the cash memo,
return/difference invoices and expenses are still out — they are step 8
([[tb-0021-invoices-cashmemos-printing]]) — and the guest UI is still not the legacy look, which is
step 7. See [[mobile-layout-is-additive-to-the-legacy-look]] for the one decision it did settle.

**Step 16 is now measured and decided (2026-09-28).** The all-reports sweep priced the
cross-component handoff at **+71% (median) on like-for-like acquisition, slower in 14/14 reports**,
so the request path is **composed into one component** and separate components are reserved for
off-request work. The apparent −31% end-to-end win came from skipping normalisation the guest still
has to perform, not from the boundary. See [[component-split-and-sql-materialised-tables]].

**Step 14 gates 15–17.** The component split deletes `compute/reports.js`, `compute/views.js` and
`app/lib/reports.js` — which are the *only* implementation known to match legacy — while the parity
differential is already gone ([[guest-parity-differential-not-reproducible]]). A golden-output
corpus and an N-way differ must exist before that deletion, or the refactor is unverifiable.

## Report performance (2026-09-28)

**Fresh-import baseline, re-measured 2026-09-28** on a depot rebuilt from the production copy
(60,245 records, 0 import errors), `--runtime-threads=4`, cold = first view of a filter.
Reproduce with `trailbase/tools/report-bench.mjs "auth_token=<jwt>"`:

| report | cold | warm | payload |
|---|---|---|---|
| difference | 35 ms | 69 ms | 35 KB |
| dailysale | 63 ms | 102 ms | 165 KB |
| stockreport | 383 ms | 78 ms | 47 KB |
| payments | 2,344 ms | 171 ms | 310 KB |
| ledgers/area | 8,907 ms | 93 ms | 136 KB |
| salesreport | 9,900 ms | 83 ms | 306 KB |
| ledgers/booker | 15,510 ms | — | 5 KB |
| **itemsales** | **20,024 ms → 500** | 20,051 ms | deadline |
| **profit** | 500 | 20,021 ms | deadline |
| **paymentsbycompany** | 20,029 ms → 500 | 500 | deadline |
| **ledgers/general** | 20,038 ms → 500 | 500 | deadline |

Four reports at the deadline, matching the previously recorded cliff. A single
`POST /reports/refresh?full=1` that rebuilds **all** views also exceeds it (20.03 s → 500), so the
snapshot must be built **lazily per report** — individual report builds do fit
(11.0 s stockreport, 7.2 s dailysale).

Two new findings came out of this run:

- [[persisted-snapshot-can-be-stamped-current-while-empty]] — a **new defect**. After the import
  every report rendered "No data" while the guest had all 60,245 rows. The persisted snapshot is
  stamped with the whole-database fingerprint even when the views inside it are empty, and
  `?full=1` cannot recover because `invalidate()` is in-memory only. Needs an out-of-band
  `DELETE FROM mview/mview_meta/pagecache` plus a restart.
- The import itself is verified end-to-end: 60,245 / 60,245, 0 failed, per-collection read ==
  created, and the link counts (5 booker, 13 party) plus the 8,927 dropped `invoice_maker` match
  the recorded reference exactly.

**Next (cold path):** `itemsales`, `profit`, `paymentsbycompany` and `ledgers/general` cannot finish
inside one guest call at all. Moving that computation into SQL
([[component-split-and-sql-materialised-tables]]) is the required next step
([[guest-report-performance-options]]).

The guest reports are numerically correct but the **cold** path (first view of a filter) is slow.
Shipped so far: a fingerprint-keyed **materialised view snapshot** shared through SQLite
([[snapshot-persistence-hits-the-20s-deadline]]), a **rendered-page cache** for repeat views
([[rendered-page-cache]]), and a **render row cap** (1,000 rows/page, `?all=1` for the full page,
[[report-render-row-cap]]). Baseline + comparison: [[report-performance-baseline]].

**Next (cold path):** `itemsales`, `profit`, `ledgers/general` and `paymentsbycompany` stay ~20 s
cold *even at 1,000 rendered rows* — their cost is the JS computation over every row, not the render.
Moving that computation into SQL (runtime `.sql`) or a native compute path is the required next
step ([[guest-report-performance-options]]).

## Open decisions (2026-09-28)

The questions that are actually blocking, each with the note that holds the options. Nothing here is
being worked around silently.

| # | Question | Options on the table | Note |
|---|---|---|---|
| 1 | **Cutover shape** — is the legacy Next.js UI repointed at TrailBase, or retired for the guest? Gates sequence 11 and 13. `critical`, no `due`, 8 unticked boxes | not written down; needs a decision first | [[pos-0028-decide-cutover-plan]] |
| 2 | ~~**Report cold path**~~ — **decided 2026-09-28.** SQL aggregation won: report results move into trigger-maintained materialised tables, which also satisfies `reports.no_precomputation` because Tier 2 cannot disagree with its base table | chosen: SQL aggregation + trigger maintenance | [[component-split-and-sql-materialised-tables]] |
| 3 | **Date defaults on report routes** — three named options, none chosen | declared, code, or per-request | [[report-routes-ignore-date-defaults]] |
| 4 | **General Ledger opening balances** are not persisted anywhere, so the ledger cannot reproduce a historical balance | carry forward, compute, or persist | [[guest-frontend-feature-parity-gaps]] §4 |
| 5 | **The 14/14 parity gate is gone** and nothing replaced it. Re-baseline against a fresh import, mark it historical, or rebuild a differential | three options, option 1 recommended | [[guest-parity-differential-not-reproducible]] |
| 6 | **The host's `jobs` surface** — delete `jobs.rs` and drop the documented `ahscripts/jobs` authoring path, or wire it and root-cause discovery | two options | [[trailbase-host-jobs-module-never-called]] |
| 7 | ~~**Integer cents for money**~~ — **split into two stages 2026-09-28.** SQL now owns the rounding site using the same `printf('%.2f')` legacy used, so float parity is achievable and comparable line for line. The `INTEGER` cents migration follows only after the float path is verified and finalised, as a separately-verified change. `qty` and `box_size_qty` stay `REAL` — they are legitimately fractional | stage 1: `REAL` + `printf` (parity); stage 2: `INTEGER` cents (exact) | [[component-split-and-sql-materialised-tables]], [[tb-0015-integer-cents-for-money]] |
| 8 | **Licensing — now two separate findings.** (a) The `trailbase-wasm` **dependency** declares `OSL-3.0`, not a permissive licence, and vendors no `LICENSE` file — this was assumed to be MIT and is not. (b) The **host crate's own upstream** publishes no LICENSE, as its README has always warned. The component split makes both blocking, because splitting means distributing | confirm upstream terms, or add a LICENSE | [[trailbase-wasm-osl-3-0-licence]], [[trailbase-host-upstream-crate-license-unresolved]] |
| 9 | **Leftover host endpoints** — `/count/{table}` (unauthenticated, SQL injection), the `/api` 200 mock, 404-for-everything, `/getscripts` | delete vs gate | [[tb-0025-host-endpoint-hygiene]] |

Two vault hygiene issues surfaced alongside: `tb-0020` is `status: done` with three unticked boxes
(KV cache eviction, materialised views, a background refresh job), and **no task in the vault has a
`due` field at all**.

## What has already been decided

| Decision | Note |
|---|---|
| Drop SQL views; aggregate in the client | [[trailbase-drop-sql-views]] |
| Enumerations are integer codes + FK | [[trailbase-encode-enums-as-integer-codes]] |
| Multi-valued relations become link tables | [[trailbase-link-tables-over-json]] |
| Split the host into generic components; SQL owns report arithmetic; money as integer cents | [[component-split-and-sql-materialised-tables]] |
| Manifest-driven routing with a JSON data DAG replaces `route.ts`; QuickJS coordinates, never calculates | [[manifest-driven-routing-and-data-dag]] |
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
| Compiled artifacts are generic capabilities; all app/data logic stays in runtime files | [[compiled-artifacts-are-generic-capabilities]] |
| Rendered report pages are cached by the live data fingerprint | [[rendered-page-cache]] |
| Report pages cap rendered rows (1,000; `?all=1` for the full page) | [[report-render-row-cap]] |

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
  ([[guest-ui-is-a-direct-shift-of-legacy]]); the guest's `trailbase/runtime/` is now the app.
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
| [[tb-0021-invoices-cashmemos-printing]] | invoices / cash memos / printing — entry, payments, lifecycle and grid done 2026-09-29; printing, cash memo and expenses not built |
| [[tb-0022-move-reports-to-sql]] | move report arithmetic into runtime SQL files — in progress |
| [[tb-0023-direct-shift-legacy-ui-to-guest]] | make the guest UI match legacy, screen for screen |
| [[guest-invoice-lifecycle]] | invoice lifecycle, spreadsheet grid, standalone document — done 2026-09-29 |
| [[tb-0028-guest-transactional-screens-and-mobile]] | invoice / payment / inventory screens + mobile layout — done 2026-09-29 |
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
- `trailbase/host/README.md` — the app-host inventory and check commands.
