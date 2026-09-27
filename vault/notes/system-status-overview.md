---
title: System status overview
type: note
status: active
created: 2026-09-26
tags: [meta, status, summary, risk]
related_to: ["[[aa-point-of-sale]]", "[[trailbase-migration]]"]
---

# System status overview

One screen: what exists, what is verified, what is not, and what could go wrong.

## State of the four systems

| System | Directory | State | Verified how |
|---|---|---|---|
| [[trailbase]] | `trailbase/` | New / experimental | Migration applies clean to an empty depot; 17/17 record APIs resolve; behaviour exercised over HTTP on a seeded depot on `v0.33.15` and re-verified on `v0.33.22` |
| [[frontend-ssr]] | `frontend-ssr/` | New / experimental | `npm run smoke` → `== 55/55 checks passed ==` against a throw-away depot, including hand-computed report totals |
| [[backend]] | `backend/` | **Legacy / production** | Holds the production data; 23 migrations; PocketBase 0.22.55 |
| [[frontend]] | `frontend/` | **Legacy / production** | The application staff use daily, including invoicing and printing |

Nothing routes production traffic to the new pair. The two stacks are independent.

## Coverage

| Capability | Legacy | SSR |
|---|---|---|
| Master data (7 entities) | ✅ | ✅ |
| Dashboard | ✅ | ✅ |
| Reports (11) | ✅ | ✅ (10 — `areawise` omitted) |
| Ledgers (4) | ✅ | ✅ |
| Invoice entry (4 types + orders) | ✅ | ❌ |
| Invoice printing + queue | ✅ | ❌ |
| Cash memo (vouchers, DA entry, expenses) | ✅ | ❌ |
| Storybook | ✅ | — |
| Server-rendered, works without JS | ❌ | ✅ |
| Access control on the API | ❌ (world-readable) | ✅ (authenticated) |

## Verified specifics worth trusting

- `traildepot/data/` was deleted after validation, so the first real run is the documented clean
  first run.
- FK and unique violations return stable, assertable strings
  (`400 db constraint: fk`, `400 db constraint: unique`).
- The partial unique index on `barcode` behaves: two blank barcodes are accepted, the second
  duplicate non-empty one is refused.
- Anonymous calls are answered `403` on all 17 record APIs.
- `trail --depot=./traildepot schema invoices` reports `invoices.type` as
  `{"type":["null","integer"]}`, i.e. the nullable-integer enum shape is really what is exposed.
- Report arithmetic matches the preserved view SQL on the smoke seed — the six pinned values are
  in [[reports-and-ledgers]].
- TrailBase guest-WASM Phase 0 (S1–S8) all pass on `v0.33.22`: runtime `eval` works, `app/` is
  readable through `--runtime-root-fs`, a single component serves requests in parallel, guest
  `fetch` reaches itself, and `UPDATE … RETURNING` claims atomically. Evidence in
  [[trailbase-guest-wasm-spike-results]].
- The guest app-host serves the same reports as the Node app: the adapted smoke suite passes
  **71/71** (same seed and pinned totals) and the differential harness matches **14/14**
  report/ledger pages; the app's own login, management CRUD, fingerprint-based incremental
  refresh, a KV report cache, and a durable, idempotent job queue with a worker fan-out work
  ([[guest-app-host-port]]).

## Open risks

| Risk | Why it matters | Where |
|---|---|---|
| No production data migrated | The new pair has never seen real volumes or real edge-case rows | [[pos-0027-migrate-production-data-to-trailbase]] |
| Cutover shape undecided | Determines whether the legacy Next.js UI is repointed or retired; blocks two other tasks | [[pos-0028-decide-cutover-plan]] |
| Invoicing/printing have no new-side equivalent | The new pair cannot replace the product, only part of it; designed but unbuilt | [[frontend-ssr-feature-parity-gaps]], [[tb-0021-invoices-cashmemos-printing]] |
| Dropped views break legacy screens | `pocketbase-types.ts` and several report screens depend on view endpoints that do not exist on TrailBase | [[tb-0013-rework-report-screens-without-views]] |
| Id/encoding asymmetry | Reads give base64, relation writes need canonical UUID text — a silent `400` waiting to happen | [[api-contract-trailbase]] |
| A live PocketBase data dir is committed | `backend/p_data/data.db` + WAL files are tracked; a real DB can be pushed by accident | [[pocketbase-data-dirs-in-git]] |
| Stale depot silently keeps an old schema | Refinery skips a migration whose checksum changed | [[trailbase-stale-depot-skips-migration]] |
| Two SQL artefacts referenced by a wrong path | The READMEs' `../full_database_schema.sql` does not resolve, so the preserved view SQL looks missing | [[stale-schema-sql-paths]] |
| Money is `REAL` | Float drift masked everywhere by `printf("%.2f")`; cheap to fix while the DB is empty | [[tb-0015-integer-cents-for-money]] |
| "Company" means two different tables | `items.category` is labelled "Company" but there is now a real `companies` table | [[tb-0014-point-company-fields-at-companies]] |
| Business identity differs between stacks | Legacy prints `SAMPLE TRADERS` + address + phone; SSR has only `APP_NAME` | [[environment]] |
| `CACHE_TTL_SECONDS` tunes nothing | A config knob that looks live but is never read | [[environment]] |
| Prior knowledge base removed from the tree | Its content is only in git; claims in it are partly superseded | [[previous-vault-recovery]] |
| Guest-WASM platform built and verified | All frontend-ssr surfaces run on the guest (smoke 71/71, differential 14/14); invoices/cash-memos/printing remain unbuilt | [[guest-app-host-port]] |
| Guest latency is multiples of Node's | ~20–30 ms baseline vs ~3–7 ms; a cold profit report took 18.7 s (within 1.3 s of the 20 s guest deadline); large payloads serialise across the JS↔Rust boundary | [[guest-vs-node-performance]], [[guest-report-performance-options]] |
| Guest reports compute in JS, not SQL | As data grows the cold build approaches the 20 s deadline; the fix is SQL aggregation + a Rust render, keeping the SQL and templates as runtime files under `app/` | [[guest-report-performance-options]], [[report-logic-stays-runtime-file-based]] |
| The dispatcher is re-transpiled every request | swc runs per request on `_app/route.ts`; every route pays it and it grows with the file | [[dispatcher-transpiled-per-request]] |
| Invoice entry design has open flaws | In-progress invoices in reports, lock lifecycle, non-idempotent line writes, totals races, invalidation storms | [[invoice-entry-freshness-and-writes]] |
| runtime-js `ahscripts/jobs` discovery is broken | Mitigated for this app: the minute `Job` calls the reconcile route directly; a project-authored scheduled job still would not run | [[trailbase-runtime-js-scheduler-not-running-jobs]] |
| Invoice numbers are client `count+1` (by design) | Concurrent creation of the same type on two devices can duplicate the number/id; the new side preserves the scheme and can allocate server-side | [[legacy-invoice-numbering-is-racy]] |

## Decisions already settled (do not re-open without cause)

[[trailbase-drop-sql-views]] · [[trailbase-encode-enums-as-integer-codes]] ·
[[trailbase-link-tables-over-json]] · [[trailbase-pocketbase-data-compatibility]] ·
[[trailbase-declarative-page-host]] · [[trailbase-incremental-report-refresh]] ·
[[trailbase-client-side-migration-plugin]] · [[keep-legacy-stack-in-production]] ·
[[offline-local-deployment]] · [[trailbase-guest-wasm-runtime-defaults]]

## Health of this vault

Run the tools listed in [[vault-guide]]. As of creation:

- 7 collections, 78 documents (plus the root `README.md`), all with frontmatter.
- Every document links to at least one index ([[aa-point-of-sale]], `README.md`, or this note).
- No document carries `archived: true`; nothing here is read-only.

## Related

- [[aa-point-of-sale]] — the programme and its constraints.
- [[trailbase-migration]] — the sequence of remaining work.
- [[route-map]] — what each system exposes today.
