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

> **Corrected 2026-10-03.** This table previously listed `[[backend]]` and `[[frontend]]` as
> `Legacy / production` at `backend/` and `frontend/`, and the sentence below it said "Nothing routes
> production traffic to the new pair. The two stacks are independent." Both were true on 2026-09-27
> and neither is now: `c167d311` deleted both directories from git. See [[cutover-is-guest-only]].

| System | Directory | State | Verified how |
| --- | --- | --- | --- |
| [[trailbase]] | `trailbase/` | New / experimental | Migration applies clean to an empty depot; 17/17 record APIs resolve; behaviour exercised over HTTP on a seeded depot on `v0.33.15` and re-verified on `v0.33.22` |
| [[runtime-js-guest-platform]] | `trailbase/` | New / experimental | Guest smoke and differential (see [[build-and-run]] for the current count) on a throw-away depot; management CRUD, fingerprint refresh, job queue and invoice entry verified (`trailbase/tools/`) |
| [[backend]] | `legacyforparity/backend/` | **Legacy / production** | 23 migrations; PocketBase 0.22.55; **what the shop runs on**. Untracked, no git copy |
| [[frontend]] | `legacyforparity/standalone/` | **Legacy / production** | A **compiled** Next.js bundle — **no `src/`**, no build, no edit. Source survives only in git history at `c167d311^` |

**The two stacks coexist and are independent**, as they were. The legacy pair is production and
runs from `legacyforparity/`; the guest is the replacement under construction. What changed on
2026-09-29 is not that the legacy stopped being used, but that it **lost its source** — so it can be
run but not repaired, and shape A became impossible. The intermediate Node
`frontend-ssr` experiment was removed on 2026-09-27
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
| Invoice printing + queue | ✅ | 🟡 A5 receipt + A4 copy, print-job queue; no printer driver |
| Cash memo (vouchers, DA entry, expenses) | ✅ | ✅ |
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
- The guest app-host serves the same reports as the legacy-preserved arithmetic: the smoke suite passes in full (same seed and pinned totals; the figure is printed at runtime — see [[smoke-count-is-not-a-hard-coded-number]]) and the differential matched **14/14** report/ledger pages; the app's own login, management CRUD, fingerprint-based incremental refresh, a KV report cache, and a durable, idempotent job queue with a worker fan-out work ([[guest-app-host-port]], [[tb-0028-guest-transactional-screens-and-mobile]]).
- A first **invoice-entry slice** runs on the guest and passes `trailbase/tools/invoice-check.mjs`: context endpoint with ETag/304, server-side invoice numbering, an edit lease, idempotent create and line add, and complete ([[tb-0021-invoices-cashmemos-printing]]).
- **All four invoice types are now verified, not just sale.** Return (2) and difference (3) — made creatable by the 2026-10-08 legacy-hub restyle ([[invoice-hub-offers-four-types]]) — are driven end to end by `tools/invoice-check.mjs` (16 added checks: each type numbers in its own `count+1` sequence, a negative return quantity is stored verbatim, a party-less difference works, prices are 2 dp). A pre-existing red check (it asserted a persisted `completed` the withdrawn lifecycle no longer writes) was corrected in the same change ([[invoice-type-write-verification-2026-10-09]]).
- The guest is now **operable end to end on a phone**: `/invoices` (sale + purchase entry), `/payments` (invoice-linked and standalone DA) and `/inventory` (live stock, item edit), with every page given a `≤768px` layout. Totals on the new screens were checked against the legacy formula on the production depot — an invoice of 180 900.00 over 36 lines, and recieving 25 907 041.11 / sending 22 657 296.66, which are the figures the import recorded ([[tb-0028-guest-transactional-screens-and-mobile]], [[mobile-layout-is-additive-to-the-legacy-look]]).
- Money is **2 dp everywhere** — report data, guest writes, and a backfill migration ([[money-is-2dp-everywhere]]).
- Every guest page and filter was driven in a real browser on 2026-10-01: all 58 routes render, no dead nav links, and every declared filter on every report narrows the result correctly. The sweep also found that the Payment Type select never comes back `selected` ([[payment-type-select-never-comes-back-selected]]) and that a name handed to an id filter returns 500 ([[id-filter-given-a-name-returns-500]]). Full matrix and method in [[browser-page-and-filter-sweep-2026-10-01]].
- **The 2026-10-01 result above no longer holds for the reports — and was wrong because of a defect, now removed.** A second sweep on 2026-10-02 found every report, every ledger and `/invoices` rendering zero rows for every date range including all-time, because the whole imported ledger was filed as `draft` and filtered out. The lifecycle is withdrawn — [[no-draft-invoices-published-on-save]] — the status column is dropped, and the reports now return the ledger: `payments` 26,526 rows for 1 Jan → 2 Oct 2026 with `Payable Amount 6,950,631.20`, which is the figure recorded on 2026-10-01. See [[imported-invoices-are-all-drafts-so-every-report-is-empty]] and [[browser-journey-sweep-2026-10-02]].
- The app is now **one manifest, one definition, one SQL engine** ([[one-manifest-is-the-page-definition]]). `REPORT_PAGES` is deleted; `/reports/<key>` and `/p/<slug>` read the same `meta.json` and the same server-side render, so they cannot disagree — and they had, on a money figure. `/p` answers in 465 KB instead of 8,242 KB, and `page.js` is deleted: client JavaScript is 378 lines in one file.
- **Every calculation runs in SQL.** The 577-line JavaScript report engine is gone, with the `useJs` escape hatch and all JS-vs-SQL comparison. `verify-spool-reports.mjs` is a self-consistency gate whose standard is absolute — a total is EXACT (the integer paisa sum of its own rows), SOUND (equals `{op, terms}` over the SQL's other totals) or CORROBORATED — not "matches the old implementation". Comparison against the legacy production system is deferred to the end of the migration, by decision.
- The host exposes a **`sql` library** to the guest with a statement guard: `DROP`, `ATTACH`, `DETACH`, `PRAGMA`, `VACUUM` and `REINDEX` are refused on every statement of every query, with the keyword named. `GET /count/{table}` is authenticated, and `GET /` redirects by auth state — both answered by the host, so they hold in either routing mode.
- Routing mode is the app's choice: `app/config/app.config.json` selects `crawler` (per-URL route folders only, no catch-all) or `dispatcher` (a catch-all for dynamic paths), default `dispatcher` ([[runtime-js-minimal-file-authoring-contract]]).
- `trailbase/runtime/` is the **source** of the app and `traildepot/runtime/` is the generated copy the server loads; `RUN.BAT` now syncs it on every start, because it used to sync only when the depot was created and an edit was silently not served.

## Open risks

| Risk | Why it matters | Where |
| --- | --- | --- |
| **Every guest print is A4 landscape** | **Fixed 2026-10-09.** The bare `@page size` rules in `app.css` were document-scoped, so the last (A4 landscape) won for every page — the A5 receipt, vouchers and even a no-`data-paper` page printed landscape. Replaced with named pages (`@page a5`/`@page a4`) selected by `page` on `<body>`; every page now defaults portrait (A5 receipt, A4 report) and the operator picks Landscape in the print dialog. Verified on the running dev server | [[every-guest-page-prints-a4-landscape]] |
| **Reports filter on the business date, verified** | **Fixed 2026-10-02.** Nine statements filtered on `created` — insert time — so on the imported ledger "September sales" was empty because everything was typed in on 1 October. Every window used during verification happened to include that date, which is why it hid. The suite passes in full | [[reports-filter-on-created-not-the-business-date]] |
| **8,648 of 26,526 payments carry no `payment_date`** | An import defect, not a code one: they fall back to the import timestamp, so the sales report only answers windows that include 1 Oct 2026. Belongs with the v1 import | [[reports-filter-on-created-not-the-business-date]] |
| Every report page now answers in 91–504 ms warm | The ledger being restored did **not** make them slow — measured, not assumed. An earlier "12.2 s" figure for `paymentsbycompany` was the **cold JSON API**, not the page; the page is 126 ms. Two SQL changes took a cold load down 20% | [[paymentsbycompany-performance-2026-10-02]] |
| Invoices are published on save and editable afterwards | **Accepted 2026-10-02.** The draft phase and append-only rule are both withdrawn, with ORDERS gone. A report you already ran can change under you, and there is no edit trail yet | [[no-draft-invoices-published-on-save]] |
| TrailBase subscriptions return 403 | No realtime push exists, so every "latest data" requirement is met by ETag polling, not a stream | [[trailbase-subscribe-endpoint-forbidden]] |
| Cutover shape undecided | **RESOLVED 2026-10-03 — guest only.** The legacy Next.js UI was deleted from git on 2026-09-29, so "repoint it" was never available; shape B is recorded as the decision | [[cutover-is-guest-only]] |
| **The production stack cannot be repaired** | **NEW 2026-10-03.** The shop runs on `legacyforparity/`, whose source was deleted from git on 2026-09-29. A bug in the running POS cannot be fixed in the running POS — only lived with, or fixed forward in the guest. There is also no git copy of `legacyforparity/`, so it is simultaneously the only copy of itself | [[cutover-is-guest-only]], [[pocketbase-data-dirs-in-git]] |
| Dropped views break legacy screens | **MOOT 2026-10-03** — there are no legacy screens left to break; `pocketbase-types.ts` was deleted with `frontend/` | [[tb-0013-rework-report-screens-without-views]] |
| The money screens are all present, but the product is not finished | Every screen the parity-gap list named as missing now answers 200, and a sweep of all 58 routes found no dead links. What remains is that the guest UI is **not yet the legacy look** | [[tb-0023-guest-feature-parity]] |
| Four reports used to fail the 20 s deadline | **STALE 2026-10-01.** `profit`, `itemsales`, `paymentsbycompany` and `ledgers/general` all return 200 in 100–165 ms on the production depot. The SQL spool and the server render are what fixed it. An uncapped `payments` (26,108 rows, 10 MB) is 2.8 s warm, 7.5 s cold — slow, but inside the deadline | [[heavy-report-blocks-runtime-threads]] |
| The production depot could not be started | **RESOLVED 2026-10-01.** The generated depot was missing its config and one migration | [[production-depot-could-not-be-started]] |
| The persisted snapshot can be stamped current while holding empty views, and `?full=1` cannot recover it | **REPRODUCED LIVE 2026-10-01.** `persistViews` stamps the fingerprint with no guard on an empty view, and a `full` refresh re-hydrates from the empty snapshot instead of rebuilding. Reports are SQL over base tables now, so the reads survive it — but the recovery path is dead | [[persisted-snapshot-can-be-stamped-current-while-empty]] |
| Incremental rebuild can miss a change | The fingerprint probes `COUNT(*)` and `MAX(updated)`; `invoices.updated` has only **two** distinct values, so a create and a delete that cancel in count would leave the views stale | [[guest-depot-created-is-import-time]] |
| Dropped views break legacy screens | **MOOT 2026-10-03** — there are no legacy screens left to break; `pocketbase-types.ts` was deleted with `frontend/` | [[tb-0013-rework-report-screens-without-views]] |
| Id/encoding asymmetry | Reads give base64, relation writes need canonical UUID text — a silent `400` waiting to happen | [[api-contract-trailbase]] |
| Stale depot silently keeps an old schema | Refinery skips a migration whose checksum changed | [[trailbase-stale-depot-skips-migration]] |
| Two SQL artefacts referenced by a wrong path | The READMEs' `../full_database_schema.sql` does not resolve, so the preserved view SQL looks missing | [[stale-schema-sql-paths]] |
| Money is `REAL` | Float drift masked everywhere by `printf("%.2f")`; cheap to fix while the DB is empty | [[tb-0015-integer-cents-for-money]] |
| "Company" means two different tables | `items.category` is labelled "Company" but there is now a real `companies` table | [[tb-0014-point-company-fields-at-companies]] |
| Business identity differs between stacks | Mostly resolved: the guest reads `runtime/app/config/business.json` (legacy name/address/phone); the `config.textproto` application name is still `AA Point of Sale` and is what the header shows | [[environment]] |
| Prior knowledge base removed from the tree | Its content is only in git; claims in it are partly superseded | [[previous-vault-recovery]] |
| Guest latency is multiples of the legacy stack's | ~20–30 ms baseline; a cold profit report came close to the 20 s guest deadline; large payloads serialise across the JS↔Rust boundary | [[guest-vs-node-performance]], [[guest-report-performance-options]] |
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
[[cutover-is-guest-only]] (spends its "until a cutover is explicitly decided" clause) ·
[[offline-local-deployment]] · [[trailbase-guest-wasm-runtime-defaults]] ·
[[parity-is-functional-not-visual]] · [[guest-ui-is-a-direct-shift-of-legacy]] · [[compiled-artifacts-are-generic-capabilities]] ·
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
