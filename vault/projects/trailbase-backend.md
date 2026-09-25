---
type: Project
status: Active
created: 2026-09-24
updated: 2026-09-24
related_to:
  - "[[AA Point of Sale]]"
tags:
  - trailbase
  - backend
  - sqlite
  - pos
  - alternative-backend
---

# TrailBase Backend

## Outcome

A backend for the same point-of-sale domain as [[AA Point of Sale]], built on
[TrailBase](https://trailbase.io) instead of PocketBase: a single Rust binary over SQLite that exposes
typed REST record APIs, its own auth and its own admin dashboard. It exists in `trailbase/` alongside the
PocketBase backend and does not replace it yet.

This is a **separate project, not a port**. It borrows the domain — sections, areas, categories,
companies, parties, order bookers, items, invoices, transactions, payments, expenses and their reports —
but its schema, its API shape and its operational model are deliberately different, and they are expected
to change drastically soon. The durable output so far is the measurement and decision record, not a frozen
schema.

## Scope

In scope:

- `trailbase/traildepot/` — the schema migration and the server/record-API configuration.
- TrailBase's record APIs, auth, access rules and admin dashboard as the system's interface.
- The measurements that establish which TrailBase features can carry which requirements.

Out of scope:

- The existing Next.js/PocketBase product, which stays in `frontend/` and `backend/` under
  [[AA Point of Sale]].
- Treating the current 17-table set or the four recorded decisions as final. The specs are being
  restated; expect the table list, the API surface and possibly the stack to move.

## Success criteria

- The schema is the most efficient shape SQLite allows for this workload: `STRICT` tables, integer-coded
  enumerations, no JSON columns, no views, indexes on the real access paths.
- The database is self-defining: legal enum values and their labels are rows, not a client-side map, and
  a client can discover the schema and vocabulary from the API alone.
- Every domain constraint that can be enforced in the database is enforced there, with an intelligible
  error, rather than in client code.
- The system is honest about what it cannot do: every TrailBase limitation hit is recorded with a
  reproduction instead of being worked around silently.
- A fresh session can resume from the knowledgebase — checkpoint, decisions and issues — without reading
  source.
- The knowledgebase validates cleanly: `python scripts/kb_check.py vault`.

## Current state

- Schema and API complete and verified end-to-end on `trail v0.33.15`: 17 `STRICT` tables (3 vocabulary,
  8 master data, 2 link tables, 4 transaction tables), 27 indexes (one a partial unique index on
  `barcode`), an `updated` trigger per table, 17 record APIs, no views, no JSON columns.
- Enumerations are integer codes with foreign keys into `party_types` / `invoice_types` / `payment_types`;
  codes are 0-based, so `0` means customer / purchase / sending and must never be treated as "empty".
- `traildepot/data/` is absent, so the depot is in a clean first-run state; validation happened on throw-away
  depots that were removed afterwards.
- Verified in detail under [[TB-0001 Redesign the TrailBase schema]]: migration from an empty depot, all 17
  APIs resolving, the server booting, 403 for unauthenticated requests, and the enum / link / barcode
  failure paths returning `db constraint` errors while `expand` inlines labels.
- Two TrailBase limitations shape the design and are recorded as issues:
  [[Issue — TrailBase rejects scalar JSON-schema columns]] (why enums are codes + foreign keys rather than
  declared enum schemas) and [[Issue — TrailBase view type-inference limits]] (why there are no views).
- A **server-rendered frontend** for the dashboard, reports and management now exists in
  `frontend-ssr/`: an Express app that renders MiniJinja templates from the filesystem and computes
  every report itself on worker threads, using TrailBase only for CRUD and auth. See
  [[Frontend — TrailBase Server-Rendered App]] and
  [[TB-0004 Build the server-rendered TrailBase frontend]]; `npm run smoke` passes 55/55.
- **Domain clarified 2026-09-25:** `items.category` and `companies` are different things. `category` is
  vestigial (kept for later use) and `company` takes over everything the old system used `category` for
  — [[Decision — Company replaces category in the TrailBase model]]. Nothing yet links an item to a
  company, so the client still reads `items.category`; [[TB-0006 Give items a company and use it in reports]]
  covers the gap.
- First run is now correct: `trailbase/RUN.BAT` creates a fresh depot with the CLI (known admin
  password, no init race) and binds `127.0.0.1:4000` explicitly. TrailBase's IPv6-only default bind is
  recorded as [[Issue — TrailBase binds IPv6 loopback by default]] — it had made the dashboard URL and
  the frontend's `TRAILBASE_URL` both unreachable.
- The earlier React/Vite TrailBase scaffold remains deleted from the working tree (and present in git
  history) as `frontend-tb/`; it targets the *older* schema (`products`, `companies2parties`,
  `partiesEnumType`, `TEXT` enums) and is a structural reference only. The new app deliberately lives
  at a different path so the two never share files.

## Architecture at a glance

One TrailBase process owns a SQLite file and serves typed record APIs, its own auth and an admin
dashboard; the domain vocabulary lives in the database, and report arithmetic lives in the client.

```mermaid
flowchart TD
  UI["Client (to be chosen)"] -->|"REST /api/records/v1/*"| TB["Backend — TrailBase Server"]
  UI -->|"REST /api/auth/v1/*"| TB
  TB --> DB[("SQLite traildepot/data/main.db")]
  VOC["Vocabulary tables (integer codes + labels)"] --> DB
  DB --> AGG["Client-side report aggregation"]
```

Text alternative: a client authenticates against the TrailBase server and reads or writes base tables
through record APIs. The database holds both the data and the enumeration vocabularies, so no client-side
code→label map exists. Reports are computed by the client from indexed base tables, because the database
cannot expose the PocketBase-style report views.

## Subsystems

- [[Backend — TrailBase Server]] — depot layout, record APIs, auth, configuration, and the gotchas.
- [[Frontend — TrailBase Server-Rendered App]] — the dashboard/reports/management client, its report
  engine and its verification.

## References

- [[Data Model]] — the PocketBase model the domain (not the schema) comes from.
- [[Reports & Ledgers]] — what each report computes; the reference for re-implementing them client-side.
- [[Glossary]] — domain vocabulary (booker, scheme, party, area, section, ...).

## Decisions

- [[Decision — Encode enumerations as integer codes with vocabulary tables]]
- [[Decision — Drop SQL views; aggregate reports client-side]]
- [[Decision — Model multi-valued relations as link tables]]
- [[Decision — Keep PocketBase-compatible data shapes]]
- [[Decision — Company replaces category in the TrailBase model]]

## Issues

- [[Issue — TrailBase rejects scalar JSON-schema columns]]
- [[Issue — TrailBase view type-inference limits]]
- [[Issue — A stale TrailBase depot silently keeps an old schema]]
- [[Issue — TrailBase binds IPv6 loopback by default]]

## Tasks

- [x] [[TB-0001 Redesign the TrailBase schema]] — Done
- [x] [[TB-0004 Build the server-rendered TrailBase frontend]] — Done (55/55 smoke checks)
- [x] [[TB-0005 Fix the first-run admin password and the backend bind]] — Done (9/9 + browser-verified)
- [ ] [[TB-0006 Give items a company and use it in reports]] — Backlog (held: needs the item→company link confirmed)
- [ ] [[TB-0002 Wire a frontend to the TrailBase server]] — Backlog (held pending re-specification)
- [ ] [[TB-0003 Migrate PocketBase data into the TrailBase schema]] — Backlog (held pending re-specification)

## Task dependency and progress

Task frontmatter is authoritative. Dotted edges below are **annotations, not `blocked_by` dependencies**:
no hard dependency is outstanding, and the two open tasks are held because the system's specs are being
restated, not because a task blocks them.

```mermaid
flowchart TD
  T1["TB-0001 · Redesign the TrailBase schema · Done"]
  T4["TB-0004 · Build the server-rendered frontend · Done"]
  T5["TB-0005 · First-run password + bind · Done"]
  T6["TB-0006 · Items get a company · Backlog"]
  T2["TB-0002 · Wire a frontend to the TrailBase server · Backlog"]
  T3["TB-0003 · Migrate PocketBase data into the TrailBase schema · Backlog"]
  T1 --> T4
  T4 --> T5
  T4 --> T6
  T1 -.->|"held: specs to be restated"| T2
  T1 -.->|"held: specs to be restated"| T3
```

Text alternative: the redesign (TB-0001) is complete; the server-rendered frontend (TB-0004) was built
on it, its first-run/bind defects were fixed (TB-0005), and the company/category clarification left one
open client-side follow-on (TB-0006) that needs the item→company link settled first. Wiring the
*Next.js* client and migrating real data remain parked until the TrailBase specification is settled.

## Current checkpoint

- [[Checkpoint — TrailBase First Run — 2026-09-25]] (supersedes [[Checkpoint — TrailBase Frontend — 2026-09-24]])
