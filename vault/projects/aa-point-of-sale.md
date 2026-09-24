---
type: Project
status: Active
created: 2026-09-19
updated: 2026-09-20
tags:
  - pos
  - erp
  - nextjs
  - pocketbase
  - offline
---
# AA Point of Sale

## Outcome

Maintain and extend **AA Point of Sale**, an offline-first point-of-sale and light ERP
system for retail/distribution businesses. It records purchases, sales, and returns;
tracks items, parties (customers/suppliers), bookers, areas, and sections; records
payments and expenses; and produces sales, profit, stock, payment, ledger, and
difference reports. It runs entirely on one Windows machine with no external services.

## Scope

In scope:

- The Next.js frontend in `frontend/` (all UI, routing, and PocketBase access).
- The PocketBase backend in `backend/` (SQLite data, collections, view queries, migrations, auth).
- Desktop packaging via Tauri (`frontend/src-tauri/`) and the prebuilt server in `standalone/`.
- Windows batch launchers at the repository root and under `backend/`.

Out of scope (not implemented in this repository):

- Cloud/multi-tenant deployment, payments gateways, or third-party integrations.
- A separate application server; the frontend talks to PocketBase directly over HTTP.

## Success criteria

- An operator can install, run, and use the app end-to-end on a clean Windows machine.
- Sales, purchase, return, payment, expense, and difference flows compute correct totals and stock movement.
- Report and ledger views in PocketBase stay consistent with the frontend's expectations.
- A fresh contributor or agent can answer "how/what/where" questions from this knowledgebase without reading source.
- The knowledgebase validates cleanly: `kb.py validate vault` and `scripts/kb_check.py`.

## Current state

- Working application. Frontend builds (`.next` present) and PocketBase **0.22.55** ships with a populated database (`backend/pb_data/data.db`).
- 41 routes are compiled in the app router (dashboard, cash memo, invoices, management, reports, auth, invoice view) — see [[Route Map]].
- 11 base collections and 15 view collections are live — see [[Data Model]]. (`payments_summary` was added 2026-09-20.)
- **Performance program in progress** — see the task list below and [[Checkpoint — AA Point of Sale — 2026-09-20]]. Backend data layer is optimized and measured (18 indexes, window-function `ledger_party`, `payments_summary` view; party ledger >180 s → ~4.4 s), the React Query cache is fixed and its config/behaviour verified (POS-0010), and the pagination helper is verified against the live API (POS-0012). **POS-0015/0016/0017/0025 are done and browser-verified**: deep server expands are removed from the report pages (including the Daily Sale / Outstanding / Product Sale trio) with names resolved client-side from cached reference collections, the cash memo payments list is paginated with `payments_summary`-backed totals, and the invoice entry pages no longer fetch the whole `invoice_view` (the selector is paged + server-searchable). The capstone regression suite ([[POS-0018 Regression-test performance suite]]) passes 7/7 with before/after captured: `transactions_report` payload −70%, `payments_view` −75%, party ledger 180 s+ → **0.95 s**, opening the Sale invoice page 26 s → **~1 s**. The server was upgraded to **PocketBase 0.22.55** (POS-0019/0020) with the whole suite still green and roughly halved request times. Remaining in the program: POS-0021 (materialize hot views), POS-0024 (decision records) and the deferred POS-0022/0023. Before/after numbers: [[Performance Baseline]].
- Known drift: `standalone/` is a prebuilt artifact not regenerated from this source (different `BUILD_ID`, a `server.js` tracing root pointing at another checkout, and a `package.json` predating the Tauri work). The "extra report pages" part of the originally reported drift is **resolved** — the source has `dailysale`/`outstanding`/`productsale` too — see [[Issue — Standalone Build Drift]].
- The Ledgers report change previously flagged as uncommitted is no longer in the working tree (it was committed in `4ac911c`) — see [[Review the uncommitted Ledgers report change]].

## Architecture at a glance

The browser/desktop UI talks directly to PocketBase's REST API; report and ledger logic
lives inside SQLite view collections, not in application code.

```mermaid
flowchart TD
  UI["Frontend — Next.js App Router"] -->|REST /api/collections| PB["Backend — PocketBase 0.22.55"]
  PB --> DB[("SQLite pb_data/data.db")]
  UI --> BI["Business logic in view SQL"]
  BI --> DB
  Tauri["Desktop & Deployment (Tauri + standalone)"] --> UI
```


Text alternative: the Next.js frontend is the only client; it calls PocketBase over HTTP.
PocketBase owns the SQLite database, including the report/ledger views whose SQL this
knowledgebase documents. Tauri and the `standalone/` server host the same frontend.

## Subsystems

- [[Frontend — Next.js Application]] — UI, routing, auth guard, PocketBase client.
- [[Backend — PocketBase Data Service]] — collections, view SQL, migrations, auth.
- [[Desktop & Deployment]] — Tauri packaging and the standalone server launcher.

## Related projects

- [[TrailBase Backend]] — a separate backend for the *same domain* built on TrailBase instead of
  PocketBase, with its own schema, auth and API shape. It does not replace the stack below and its specs
  are still in flux; see [[Backend — TrailBase Server]] for what exists today.

## References

- [[Route Map]] — every app route and what it does.
- [[Data Model]] — collections, fields, and relationships.
- [[Reports & Ledgers]] — what each report/ledger view computes and its SQL.
- [[Build & Run Scripts]] — install, run, build, and update entry points.
- [[Glossary]] — project vocabulary (booker, scheme, party, area, section, ...).
- [[Knowledgebase Guide]] — how this vault is organized and how to keep it current.

## Tasks

- [ ] [[Add automated tests for report SQL views]] — Backlog
- [ ] [[Reconcile the standalone build with source]] — Ready
- [ ] [[Review the uncommitted Ledgers report change]] — Ready
- [ ] [[Verify the static export path for Tauri and RUN SERVE]] — Backlog

### Performance optimization program (2026-09-20)

- [x] [[POS-0005 Baseline performance metrics]] — Done
- [x] [[POS-0006 Backup database and repo snapshot]] — Done
- [x] [[POS-0007 Add indexes via migration]] — Done
- [x] [[POS-0008 Index verification test]] — Done
- [x] [[POS-0009 Fix React Query cache config]] — Done
- [x] [[POS-0010 Cache behavior test]] — Done
- [x] [[POS-0011 Paginated list plumbing]] — Done
- [x] [[POS-0012 Pagination test]] — Done
- [x] [[POS-0013 SQL aggregation views]] — Done
- [x] [[POS-0014 SQL aggregation equivalence test]] — Done
- [x] [[POS-0015 Trim expands + adopt pagination in report pages]] — Done
- [x] [[POS-0016 Report pages render test]] — Done (all 7 routes verified in-browser)
- [x] [[POS-0017 Invoice entry pages: paginate + trim expands]] — Done (selector paged; expands dropped)
- [x] [[POS-0018 Regression-test performance suite]] — Done (7/7 suites PASS; before/after measured)
- [x] [[POS-0019 Upgrade PocketBase v0.22.9 → v0.22.55]] — Done (binary swapped; suite green)
- [x] [[POS-0020 PocketBase v0.22.55 regression test]] — Done (auth + CRUD + all 15 views + app pages)
- [ ] [[POS-0021 Materialize hot report views into tables]] — Ready
- [ ] [[POS-0022 Upgrade PocketBase to v0.40.4]] — Backlog (deferred major migration)
- [ ] [[POS-0023 PocketBase v0.40.4 migration test]] — Backlog
- [ ] [[POS-0024 Record performance optimization decisions]] — Ready
- [x] [[POS-0025 Optimize + verify the Daily Sale, Outstanding, and Product Sale reports]] — Done (trim + browser-verified)
- [x] [[POS-0026 Add an Apply button to report filters]] — Done (reports fetch only on Apply)

## Task dependency and progress

Task frontmatter is authoritative; this diagram is derived from `blocked_by` (or its `depends_on` alias).

```mermaid
flowchart LR
  T1["POS-0003 · Add automated tests for report SQL views · Backlog"]
  T2["POS-0001 · Reconcile the standalone build with source · Ready"]
  T3["POS-0002 · Review the uncommitted Ledgers report change · Ready"]
  T4["POS-0004 · Verify the static export path for Tauri and RUN SERVE · Backlog"]

  subgraph PERF["Performance optimization program"]
    P5["POS-0005 · Baseline metrics · Done"]
    P6["POS-0006 · Backup DB + repo · Done"]
    P7["POS-0007 · Add indexes migration · Done"]
    P8["POS-0008 · Index verification test · Done"]
    P9["POS-0009 · Fix React Query cache · Done"]
    P10["POS-0010 · Cache behavior test · Done"]
    P11["POS-0011 · usePagedList plumbing · Done"]
    P12["POS-0012 · Pagination test · Done"]
    P13["POS-0013 · SQL aggregation views · Done"]
    P14["POS-0014 · SQL equivalence test · Done"]
    P15["POS-0015 · Trim expands + paginate reports · Done"]
    P16["POS-0016 · Report render test · Done"]
    P17["POS-0017 · Invoice pages paginate+trim · Done"]
    P18["POS-0018 · Performance regression suite · Done"]
    P19["POS-0019 · PB v0.22.55 upgrade · Done"]
    P20["POS-0020 · PB v0.22.55 regression test · Done"]
    P21["POS-0021 · Materialize hot views · Ready ← NEXT"]
    P22["POS-0022 · PB v0.40.4 migration · Backlog"]
    P23["POS-0023 · PB v0.40.4 test · Backlog"]
    P24["POS-0024 · Record perf decisions · Ready"]
    P25["POS-0025 · Extra reports trim + verify · Done"]
    P26["POS-0026 · Apply button on report filters · Done"]
  end

  P5 --> P7
  P6 --> P7
  P7 --> P8
  P5 --> P9
  P9 --> P10
  P9 --> P11
  P11 --> P12
  P11 --> P25
  P11 --> P26
  P5 --> P13
  P6 --> P13
  P13 --> P14
  P11 --> P15
  P13 --> P15
  P15 --> P16
  P11 --> P17
  P15 --> P18
  P17 --> P18
  P6 --> P19
  P18 --> P19
  P19 --> P20
  P13 --> P21
  P18 --> P21
  P20 --> P22
  P22 --> P23
  P18 --> P24
  P20 --> P24
```


## Decisions

- [[Decision — Use PocketBase and Next.js]]
- [[Decision — Local Offline Desktop Deployment]]

## Issues

- [[Issue — Standalone Build Drift]]

## Current checkpoint

- [[Checkpoint — AA Point of Sale — 2026-09-20]] (performance plan; supersedes [[Checkpoint — AA Point of Sale — 2026-09-19]])
