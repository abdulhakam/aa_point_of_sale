---
title: System status overview
type: note
status: active
created: 2026-09-26
updated: 2026-09-27
tags: [meta, status, summary, risk]
related_to: ["[[aa-point-of-sale]]", "[[trailbase-migration]]"]
---
# System status overview

One screen: what exists, what is verified, what is not, and what could go wrong.

## State of the systems

| System | Directory | State | Verified how |
| --- | --- | --- | --- |
| [[trailbase]] | `trailbase/` | New / experimental | Migration applies clean to an empty depot; 17/17 record APIs resolve; behaviour exercised over HTTP on a seeded depot on `v0.33.15` and re-verified on `v0.33.22` |
| [[runtime-js-guest-platform]] | `trailbase/` | New / experimental | Guest smoke **71/71** and differential **14/14** on a throw-away depot; management CRUD, fingerprint refresh, job queue and a first invoice-entry slice verified (`trailbase/tools/`) |
| [[backend]] | `backend/` | **Legacy / production** | Holds the production data; 23 migrations; PocketBase 0.22.55 |
| [[frontend]] | `frontend/` | **Legacy / production** | The application staff use daily, including invoicing and printing |

Nothing routes production traffic to the new pair. The two stacks are independent. The
intermediate Node `frontend-ssr` experiment was removed on 2026-09-27
([[guest-ui-is-a-direct-shift-of-legacy]]).

## Coverage

| Capability | Legacy | Guest |
| --- | --- | --- |
| Master data (7 entities) | ✅ | ✅ |
| Dashboard | ✅ | ✅ |
| Reports (11) | ✅ | ✅ (10 — `areawise` omitted) |
| Ledgers (4) | ✅ | ✅ |
| Invoice entry (4 types + orders) | ✅ | 🟡 sale + purchase only, screens live |
| Payments (invoice-linked + standalone DA) | ✅ | 🟡 invoice-linked + DA, no vouchers/returns |
| Inventory (live stock, item edit) | ✅ | ✅ |
| Invoice printing + queue | ✅ | ❌ |
| Cash memo (vouchers, DA entry, expenses) | ✅ | ❌ |
| Storybook | ✅ | — |
| Server-rendered, works without JS | ❌ | ✅ |
| Usable on a phone (≤768px) | ❌ | ✅ |
| Access control on the API | ❌ (world-readable) | ✅ (authenticated) |

## Verified specifics worth trusting

- `traildepot/data/` was deleted after validation, so the first real run is the documented clean first run.
- FK and unique violations return stable, assertable strings (`400 db constraint: fk`, `400 db constraint: unique`).
- The partial unique index on `barcode` behaves: two blank barcodes are accepted, the second duplicate non-empty one is refused.
- Anonymous calls are answered `403` on all 17 record APIs.
- `trail --depot=./traildepot schema invoices` reports `invoices.type` as `{"type":["null","integer"]}`, i.e. the nullable-integer enum shape is really what is exposed.
- Report arithmetic matches the preserved view SQL on the smoke seed — the six pinned values are in [[reports-and-ledgers]].
- TrailBase guest-WASM Phase 0 (S1–S8) all pass on `v0.33.22`: runtime `eval` works, `app/` is readable through `--runtime-root-fs`, a single component serves requests in parallel, guest `fetch` reaches itself, and `UPDATE … RETURNING` claims atomically. Evidence in [[trailbase-guest-wasm-spike-results]].
- The guest app-host serves the same reports as the legacy-preserved arithmetic: the smoke suite passes **76/76** (same seed and pinned totals) and the differential matched **14/14** report/ledger pages; the app's own login, management CRUD, fingerprint-based incremental refresh, a KV report cache, and a durable, idempotent job queue with a worker fan-out work ([[guest-app-host-port]], [[tb-0028-guest-transactional-screens-and-mobile]]).
- A first **invoice-entry slice** runs on the guest and passes `trailbase/tools/invoice-check.mjs`: context endpoint with ETag/304, server-side invoice numbering, an edit lease, idempotent create and line add, and complete ([[tb-0021-invoices-cashmemos-printing]]).
- The guest is now **operable end to end on a phone**: `/invoices` (sale + purchase entry), `/payments` (invoice-linked and standalone DA) and `/inventory` (live stock, item edit), with every page given a `≤768px` layout. Totals on the new screens were checked against the legacy formula on the production depot — an invoice of 180 900.00 over 36 lines, and recieving 25 907 041.11 / sending 22 657 296.66, which are the figures the import recorded ([[tb-0028-guest-transactional-screens-and-mobile]], [[mobile-layout-is-additive-to-the-legacy-look]]).
- Money is **2 dp everywhere** — report data, guest writes, and a backfill migration ([[money-is-2dp-everywhere]]).

## Open risks

| Risk | Why it matters | Where |
| --- | --- | --- |
| No parity oracle for the new work | The 14/14 differential cannot be re-run, so report changes are unverified against legacy behaviour; the money screens about to be built have no regression net either | [[guest-parity-differential-not-reproducible]] |
| The 14/14 report differential cannot be re-run | The flagship parity result has no harness left, so later changes to the views are unverified against legacy behaviour | [[guest-parity-differential-not-reproducible]] |
| TrailBase subscriptions return 403 | No realtime push exists, so every "latest data" requirement is met by ETag polling, not a stream | [[trailbase-subscribe-endpoint-forbidden]] |
| The guest's `/count/{table}` is unauthenticated | Row counts of every table are reachable without login, and a non-integer result panics the guest | [[trailbase-host-count-endpoint-sql-injection]] |
| Cutover shape undecided | Determines whether the legacy Next.js UI is repointed or retired; blocks two other tasks | [[pos-0028-decide-cutover-plan]] |
| Invoicing/printing have no new-side equivalent | Invoice entry and payments are on the guest; **printing, the cash memo and expenses are still unbuilt**, so the new pair still cannot replace the whole product | [[guest-frontend-feature-parity-gaps]], [[tb-0021-invoices-cashmemos-printing]] |
| The guest UI is not yet the legacy look | Parity is visual as well as behavioural; the guest must be restyled to match | [[guest-ui-is-a-direct-shift-of-legacy]], [[tb-0023-direct-shift-legacy-ui-to-guest]] |
| Four reports still fail the 20 s deadline, and a heavy one starves the other requests | `profit`, `itemsales`, `paymentsbycompany` and `ledgers/general` fail cold; while one runs, unrelated requests fail in ~200 ms | [[heavy-report-blocks-runtime-threads]] |
| The production depot could not be started | The generated depot was missing its config and one migration; all six applied migrations now mismatch their checksums and are silently skipped | [[production-depot-could-not-be-started]] |
| Dropped views break legacy screens | `pocketbase-types.ts` and several report screens depend on view endpoints that do not exist on TrailBase | [[tb-0013-rework-report-screens-without-views]] |
| Id/encoding asymmetry | Reads give base64, relation writes need canonical UUID text — a silent `400` waiting to happen | [[api-contract-trailbase]] |
| A live PocketBase data dir is committed | `backend/p_data/data.db` + WAL files are tracked; a real DB can be pushed by accident | [[pocketbase-data-dirs-in-git]] |
| Stale depot silently keeps an old schema | Refinery skips a migration whose checksum changed | [[trailbase-stale-depot-skips-migration]] |
| Two SQL artefacts referenced by a wrong path | The READMEs' `../full_database_schema.sql` does not resolve, so the preserved view SQL looks missing | [[stale-schema-sql-paths]] |
| Money is `REAL` | Float drift masked everywhere by `printf("%.2f")`; cheap to fix while the DB is empty | [[tb-0015-integer-cents-for-money]] |
| "Company" means two different tables | `items.category` is labelled "Company" but there is now a real `companies` table | [[tb-0014-point-company-fields-at-companies]] |
| Business identity differs between stacks | Mostly resolved: the guest reads `runtime/app/config/business.json` (legacy name/address/phone); the `config.textproto` application name is still `AA Point of Sale` and is what the header shows | [[environment]] |
| Prior knowledge base removed from the tree | Its content is only in git; claims in it are partly superseded | [[previous-vault-recovery]] |
| Guest latency is multiples of the legacy stack's | ~20–30 ms baseline; a cold profit report came close to the 20 s guest deadline; large payloads serialise across the JS↔Rust boundary | [[guest-vs-node-performance]], [[guest-report-performance-options]] |
| Guest reports compute in JS, not SQL | As data grows the cold build approaches the 20 s deadline; the fix is SQL aggregation + a Rust render, keeping the SQL and templates as runtime files under `app/` | [[guest-report-performance-options]], [[report-logic-stays-runtime-file-based]] |
| The dispatcher is re-transpiled every request | swc runs per request on `_app/route.ts`; every route pays it and it grows with the file | [[dispatcher-transpiled-per-request]] |
| Invoice entry design has open flaws | In-progress invoices in reports, lock lifecycle, non-idempotent line writes, totals races, invalidation storms | [[invoice-entry-freshness-and-writes]] |
| runtime-js `ahscripts/jobs` discovery is broken | Mitigated for this app: the minute `Job` calls the reconcile route directly; a project-authored scheduled job still would not run | [[trailbase-runtime-js-scheduler-not-running-jobs]] |
| Invoice numbers are client `count+1` (by design) | Concurrent creation of the same type on two devices can duplicate the number/id; the new side preserves the scheme and can allocate server-side | [[legacy-invoice-numbering-is-racy]] |
| The guest v1 import is unverified | The production-data migration rests on a plugin that has not been run end-to-end, and it still drops `invoices.invoice_maker` | [[pos-0029-rebuild-v1-import-on-guest]] |

## Decisions already settled (do not re-open without cause)

[[trailbase-drop-sql-views]] · [[trailbase-encode-enums-as-integer-codes]] ·
[[trailbase-link-tables-over-json]] · [[trailbase-pocketbase-data-compatibility]] ·
[[trailbase-declarative-page-host]] · [[trailbase-incremental-report-refresh]] ·
[[trailbase-client-side-migration-plugin]] · [[keep-legacy-stack-in-production]] ·
[[offline-local-deployment]] · [[trailbase-guest-wasm-runtime-defaults]] ·
[[guest-ui-is-a-direct-shift-of-legacy]] · [[compiled-artifacts-are-generic-capabilities]] ·
[[rendered-page-cache]]

## Health of this vault

Run the tools listed in [[vault-guide]].

- The `credentials/` collection holds **plaintext** production and experimental secrets; the
  repository has a remote, so treat them as compromised if it is ever pushed (see
  `credentials/README.md`). The collection is git-ignored and local-only.
- Document counts and link health: run `stats.mjs --write-report` and `links.mjs` (see
  [[vault-guide]]); the derived numbers live in `.vault/reports/`.

## Related

- [[aa-point-of-sale]] — the programme and its constraints.
- [[trailbase-migration]] — the sequence of remaining work.
- [[route-map]] — what each system exposes today.
- [[legacy-ui-reference-captures]] — the captured legacy UI for the parity work.
