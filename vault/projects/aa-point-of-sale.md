---
title: AA Point of Sale
type: project
status: active
created: 2026-09-26
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

## The four systems, and which one is live

| System | Directory | State | Role today |
|---|---|---|---|
| [[trailbase]] | `trailbase/` | **New / experimental** | TrailBase SQLite server: 17-table schema + record APIs |
| [[frontend-ssr]] | `frontend-ssr/` | **New / experimental** | Express + MiniJinja SSR dashboard / reports / management |
| [[backend]] | `backend/` | **Legacy / production** | PocketBase 0.22.55 — holds the production data |
| [[frontend]] | `frontend/` | **Legacy / production** | Next.js 14 POS — what staff use |

```text
PRODUCTION (live)                      IN PROGRESS (replacement)
┌───────────────────┐                  ┌───────────────────┐
│ frontend/         │  PocketBase SDK  │ frontend-ssr/     │  REST + JWT
│ Next.js 14 +      │ ───────────────▶ │ Express +         │ ───────────────▶ ┌────────────┐
│ Mantine           │                  │ MiniJinja         │                  │ trailbase/ │
└───────────────────┘                  └───────────────────┘                  │ 17 tables  │
        (the whole product:            (dashboard, reports,                   │ record APIs│
         invoices, printing,            management only)                      └────────────┘
         cash memo, reports)                          ▲
                                                      │ no production data yet;
┌───────────────────┐                                 │ no legacy client yet
│ backend/          │  ◀── the data to migrate ───────┘
│ PocketBase 0.22.55│
└───────────────────┘
```

The two stacks do **not** share a database. They are parallel implementations of the same
domain, which is why [[data-model]] documents the value translation between them.

## Where the project stands

**Done and verified**

- TrailBase schema: 17 `STRICT` tables, 17 `record_apis`, seeded enumeration vocabularies,
  indexes chosen from access paths, `updated` triggers, all in one migration that applies
  clean to an empty depot.
- TrailBase behaviour exercised over HTTP against a seeded depot: expands, `filter[…]`
  operators, FK rejection (`POST parties {"type":9}` → `400 db constraint: fk`), partial
  unique index on `barcode`, duplicate link-pair rejection, `0`/`1` booleans.
- `frontend-ssr`: dashboard, 14 reports + 4 ledgers, 7 management entities, a declarative
  page host, a plugin hub with one bundled plugin, and `npm run smoke` at 55/55.
- `frontend-ssr` report arithmetic cross-checked against the preserved PocketBase view SQL
  with hand-computed amounts — see [[reports-and-ledgers]].

**Not done**

- No production data has been migrated from PocketBase to TrailBase.
- The legacy Next.js app still reads and writes PocketBase; nothing points it at TrailBase.
- Invoicing, cash memo, expenses and printing have no SSR equivalent yet.
- Report screens that depended on the dropped SQL views have not been reworked on the
  legacy side (they were reimplemented on the SSR side instead).

**Open decisions** — see [[pos-0028-decide-cutover-plan]] for the one that gates everything
else: whether the legacy Next.js UI is repointed at TrailBase, or retired in favour of
expanding [[frontend-ssr]].

## Why the rewrite

The motivation is performance and correctness of data access, not a taste for new
frameworks. Concretely:

- The old backend expressed report arithmetic as SQL views, and the client fetched whole
  views — thousands to tens of thousands of rows for one screen (the `useAPI.ts` comments
  cite "a 9k-26k row view"). Three later migrations attack this from the SQL side
  (`add_performance_indexes`, `ledger_party` as a window function, `payments_summary`
  pre-aggregated) — see [[backend]] and [[performance-and-caching]].
- TrailBase cannot expose most of those views at all, so the rewrite had to decide where the
  arithmetic lives. It now lives in JavaScript, once, shared byte-for-byte between Node and
  the browser (`frontend-ssr/compute/`) — see [[trailbase-drop-sql-views]].
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

## Related

- [[trailbase-migration]] — the active workstream (the new pair).
- [[system-status-overview]] — a one-screen status and risk view.
- [[data-model]], [[api-contract-trailbase]], [[route-map]], [[reports-and-ledgers]],
  [[build-and-run]], [[environment]], [[performance-and-caching]] — the reference set.
