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

| System | Directory | State | Role today |
|---|---|---|---|
| [[trailbase]] | `trailbase/` | **New / experimental** | TrailBase SQLite server: 17-table schema + record APIs |
| [[runtime-js-guest-platform]] | `trailbase/` | **New / experimental** | TrailBase guest-WASM app host: the new frontend (dashboard, reports, management) |
| [[backend]] | `backend/` | **Legacy / production** | PocketBase 0.22.55 — holds the production data |
| [[frontend]] | `frontend/` | **Legacy / production** | Next.js 14 POS — what staff use |

```text
PRODUCTION (live)                      IN PROGRESS (replacement)
┌───────────────────┐                  ┌───────────────────┐
│ frontend/         │  PocketBase SDK  │ trailbase/        │
│ Next.js 14 +      │ ───────────────▶ │ guest-WASM:       │ ───────────────▶ ┌────────────┐
│ Mantine           │                  │ Rust + QuickJS +  │                  │ trailbase/ │
└───────────────────┘                  │ minijinja         │                  │ 17 tables  │
        (the whole product:            └───────────────────┘                  │ record APIs│
         invoices, printing,                          ▲                        └────────────┘
          cash memo, reports)                          │ production data IS loaded
┌───────────────────┐                                 │ (60,245 records, 2026-09-29);
│ backend/          │  ◀── the data to re-import ─────┘ no legacy client yet
│ backend/          │  ◀── the data to re-import ─────┘
│ PocketBase 0.22.55│
└───────────────────┘
```

The two stacks do **not** share a database. They are parallel implementations of the same
domain, which is why [[data-model]] documents the value translation between them. The
intermediate Node `frontend-ssr` experiment was removed on 2026-09-27
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
  SQL against `backend/p_data/data.db` and **all match**; payments agree to the cent (recieving
  25,907,041.11, sending 22,657,296.66). Verified again 2026-09-29 against the live depot on
  `:4000`: 8,927 invoices, 23,413 transactions, 26,526 payments, 88 expenses.
  See [[reports-parity-and-e2e-2026-09-29]]. An earlier revision of this note said the depot had
  been reset and no data was loaded; that was stale.
  Outstanding: the guest's `created` is the import timestamp, not the business date
  ([[guest-depot-created-is-import-time]]), and 8,927 `invoice_maker` references are dropped
  ([[import-from-v1-drops-invoice-maker]]).
- The legacy Next.js app still reads and writes PocketBase; nothing points it at TrailBase.
- Invoicing, cash memo, expenses and printing have no guest equivalent yet
  ([[guest-frontend-feature-parity-gaps]]).
- The guest UI is not yet visually identical to the legacy UI
  ([[tb-0023-direct-shift-legacy-ui-to-guest]]).

**Open decisions** — see [[pos-0028-decide-cutover-plan]] for the one that gates everything
else: whether the legacy Next.js UI is repointed at TrailBase, or retired in favour of the
guest frontend rebuilt as a direct shift of it
([[guest-ui-is-a-direct-shift-of-legacy]]).

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

- **The business runs on the legacy stack today.** Production data lives in PocketBase and
  staff use the Next.js app, so nothing may be broken in place: the migration must be
  additive until a cutover is decided. See [[keep-legacy-stack-in-production]].
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
