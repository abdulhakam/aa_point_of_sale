---
title: AA Point of Sale
type: project
status: active
created: 2026-09-26
updated: 2026-09-27
tags: [pos, erp, trade-and-distribution, programme]
related_to: ["[[trailbase-migration]]"]
---

# AA Point of Sale

A trade & distribution management system for a distribution business: master data
(sections → areas → parties, companies, item companies, order bookers, items), a purchase /
sale / return / difference invoice cycle, payments in both directions, cash-memo vouchers,
ledgers, and around a dozen operational reports. Two specifications live one directory above
the workspace: `trade-and-distribution-management-system-specification.html` and
`project_stack_agnostic_spec.html`.

## The systems, and which one is live

> **Corrected 2026-10-03.** The two `Legacy / production` rows below previously read `backend/` and
> `frontend/`, and the diagram showed the legacy pair as the live product. `c167d311` deleted both
> from git on 2026-09-29; they are now `legacyforparity/` — frozen and untracked. The guest is the
> only live application. See [[cutover-is-guest-only]].

| System | Directory | State | Role today |
|---|---|---|---|
| [[trailbase]] | `trailbase/` | **New / experimental** | TrailBase SQLite server: 17-table schema + record APIs |
| [[runtime-js-guest-platform]] | `trailbase/` | **New / the product** | TrailBase guest-WASM app host: dashboard, reports, management, invoicing |
| [[backend]] | `legacyforparity/backend/` | **Legacy / frozen** | PocketBase 0.22.55 — runnable parity oracle, never edited, no git copy |
| [[frontend]] | `legacyforparity/standalone/` | **Legacy / frozen** | compiled Next.js 14 bundle — **no source**, runnable parity oracle only |

```text
LIVE (the product)                        FROZEN (parity oracle only, untracked)
┌───────────────────┐                  ┌──────────────────────────────┐
│ trailbase/        │                  │ legacyforparity/standalone/  │
│ guest-WASM:       │                  │  compiled Next.js 14 bundle  │
│ Rust + QuickJS +  │                  │  no src/, no build, no edit  │
│ minijinja         │                  ├──────────────────────────────┤
└───────────────────┘                  │ legacyforparity/backend/     │
        ▲                              │  PocketBase 0.22.55          │
        │ production data IS loaded    │  pb_migrations/ + p*_data/  │
        │ (60,245 records, 2026-09-29) └──────────────────────────────┘
        │                                       ▲
        └─────────── imported from ─────────────┘
```

The legacy pair and the new one do **not** share a database — they never did. [[data-model]]
documents the value translation between them, and that translation is what
`import-from-v1` performs. The intermediate Node `frontend-ssr` experiment was removed on 2026-09-27
([[guest-ui-is-a-direct-shift-of-legacy]]).

## Where the project stands

**Done and verified**

- TrailBase schema: 17 `STRICT` tables, 17 `record_apis`, seeded enumeration vocabularies,
  indexes chosen from access paths, `updated` triggers. That is **one** migration
  (`U1790208000__create_base_tables`); three more have since been added for the job queue
  (`U1790300000`), 2 dp money rounding (`U1790300100`) and invoice entry (`U1790300200`), and they
  apply clean on an empty depot too.
- TrailBase behaviour exercised over HTTP against a seeded depot: expands, `filter[…]`
  operators, FK rejection (`POST parties {"type":9}` → `400 db constraint: fk`), partial
  unique index on `barcode`, duplicate link-pair rejection, `0`/`1` booleans.
- The guest frontend: dashboard, 10 reports + 4 ledgers, 7 management entities, a declarative
  page host, a plugin hub, login, fingerprint refresh, KV report cache and a durable job
  queue; `trailbase/tools/guest-smoke.mjs` at 71/71.
- Guest report arithmetic cross-checked against the preserved PocketBase view SQL
  with hand-computed amounts — see [[reports-and-ledgers]].

**Not done**

- **Production data IS loaded.** The `import-from-v1` plugin was run through the **browser UI** at
  `/plugins/import-from-v1/` on 2026-09-29 — **60,245 / 60,245 records, 0 failures** — and per
  collection `read == created`. Per-table money and quantity sums were then compared directly in
  SQL against `legacyforparity/backend/p_data/data.db` and **all match**; payments agree to the cent (recieving
  25,907,041.11, sending 22,657,296.66). Verified again 2026-09-29 against the live depot on
  `:4000`: 8,927 invoices, 23,413 transactions, 26,526 payments, 88 expenses.
  See [[reports-parity-and-e2e-2026-09-29]]. An earlier revision of this note said the depot had
  been reset and no data was loaded; that was stale.
  Outstanding: the guest's `created` is the import timestamp, not the business date
  ([[guest-depot-created-is-import-time]]), and 8,927 `invoice_maker` references are dropped
  ([[import-from-v1-drops-invoice-maker]]).
- ⚠️ **The legacy app is gone, not merely unrepointed.** `frontend/` was deleted from git on
  2026-09-29; `legacyforparity/standalone/` is a compiled bundle with no `src/`. There is nothing
  left to point at TrailBase ([[cutover-is-guest-only]]).
- The guest UI is not yet visually identical to the legacy UI
  ([[tb-0023-direct-shift-legacy-ui-to-guest]]).

**Open decisions** — the one that gated everything else is
**closed**: [[cutover-is-guest-only]] records shape B, guest only, decided 2026-10-03. Shape A
(repointing the legacy UI) was never available, because its source was deleted before the question
was answered.

## Why the rewrite

The motivation is performance and correctness of data access, not a taste for new
frameworks. Concretely:

- The old backend expressed report arithmetic as SQL views, and the client fetched whole
  views — thousands to tens of thousands of rows for one screen (the `useAPI.ts` comments
  cite "a 9k-26k row view"). Three later migrations attack this from the SQL side
  (`add_performance_indexes`, `ledger_party` as a window function, `payments_summary`
  pre-aggregated) — see [[backend]] and [[performance-and-caching]].
- TrailBase cannot expose most of those views at all, so the rewrite had to decide where the
  arithmetic lives. It lives in JavaScript, evaluated at runtime under `app/compute/` on the
  guest — see [[trailbase-drop-sql-views]].
- The PocketBase collections were world-accessible (`rules: ""`). TrailBase requires
  authentication for everything.
- Enumerations were text (`sale`, `customer`, …) with `''` meaning unset. TrailBase makes
  them integer codes with a foreign key into a vocabulary table — see
  [[trailbase-encode-enums-as-integer-codes]].

## Constraints that shape the design

- **The business runs on the guest stack.** ⚠️ **Corrected 2026-10-03.** This constraint previously
  read "The business runs on the legacy stack today. Production data lives in PocketBase and staff
  use the Next.js app, so nothing may be broken in place … See
  [[keep-legacy-stack-in-production]]." That ended on 2026-09-29 when the legacy source was deleted
  from git. What remains in force:
  - The production data is **imported into the guest depot** (60,245 records), so the guest is the
    system of record going forward.
  - `legacyforparity/` is **never edited** — it is the parity oracle, not a rollback target
    ([[cutover-is-guest-only]], superseding [[keep-legacy-stack-in-production]]).
  - The oracle has **no git copy**, so treating it as disposable is now the wrong instinct.
- **Offline/local deployment is a requirement** — the deployment target is a local machine,
  which is why both backends are single-file SQLite servers and the frontends are
  self-hosted. See [[offline-local-deployment]].
- **Inherited numerics must not drift.** The new report engine has to reproduce the old view
  SQL's output for the same rows, quirks included, so that numbers can be compared during
  migration. [[reports-and-ledgers]] lists those quirks explicitly.
- **The new UI is a direct shift of the legacy UI**, same look, so the cutover needs no
  retraining. See [[guest-ui-is-a-direct-shift-of-legacy]].

## Related

- [[trailbase-migration]] — the active workstream (the new pair).
- [[system-status-overview]] — a one-screen status and risk view.
- [[data-model]], [[api-contract-trailbase]], [[route-map]], [[reports-and-ledgers]],
  [[build-and-run]], [[environment]], [[performance-and-caching]] — the reference set.
- [[legacy-ui-reference-captures]] — the captured legacy UI.
