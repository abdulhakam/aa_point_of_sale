---
type: Subsystem
status: Active
created: 2026-09-19
updated: 2026-09-19
belongs_to:
  - "[[AA Point of Sale]]"
related_to:
  - "[[Frontend — Next.js Application]]"
  - "[[Data Model]]"
  - "[[Reports & Ledgers]]"
tags:
  - backend
  - pocketbase
  - sqlite
---

# Backend — PocketBase Data Service

## Purpose

PocketBase is the entire server side of the system: HTTP API, authentication, SQLite
storage, and — importantly — most of the **business/report logic**, implemented as SQL
view collections.

## Responsibilities

- Store all business data in `backend/pb_data/data.db` (SQLite).
- Expose REST endpoints per collection (`/api/collections/<name>/records`).
- Authenticate users (`users` auth collection) and authorise collection rules.
- Compute derived data (invoice totals, transaction net/profit, stock, ledgers, reports)
  inside SQLite views rather than in client code.
- Evolve schema through versioned migrations in `backend/pb_migrations/`.

## Runtime

- Engine: **PocketBase 0.22.9** (`backend/pocketbase.exe`), single self-contained binary.
- Data directory: `backend/pb_data/` (live database); `backend/p_data/` is the seed/working
  copy copied by `FIRST_RUN.BAT`.
- Default port: `8090` (the frontend's `NEXT_PUBLIC_PB_URL` default).
- Admin UI available at `/ _` (PocketBase admin) for schema inspection.

## Interfaces

- HTTP REST to the frontend; JSON records with `expand` for relations.
- View collections are read-only (no create/update/delete rules).
- Migrations apply automatically on `pocketbase serve`.

## Collection inventory

- Base (writable, 11): `areas`, `categories`, `expenses`, `invoices`,
  `invoices_return_reference`, `items`, `order_bookers`, `parties`, `payments`,
  `sections`, `transactions`.
- Auth (1): `users`.
- Views (13, read-only): `counts_for_row_numbers`, `invoice_view`, `items_difference_report`,
  `items_report`, `ledger_area`, `ledger_booker`, `ledger_journal`, `ledger_party`,
  `net_price`, `payments_invoices_report`, `payments_view`, `transaction_view`,
  `transactions_report`.

Field-level detail and relationships live in [[Data Model]]; the SQL each view runs is in
[[Reports & Ledgers]].

## Key files

- `backend/pocketbase.exe` — engine.
- `backend/pb_data/data.db` — live SQLite database.
- `backend/pb_migrations/*.js` — 18 schema migrations (timestamp-prefixed).
- `backend/DEV.BAT`, `RUN NEXTJS.BAT`, `RUN SERVE.BAT`, `TAURI *.BAT` — launchers.

## Constraints and caveats

- The migration set is append-only history; several migrations share the timestamp
  `1714479961` and some view definitions are re-created wholesale rather than altered.
- Report correctness depends on the view SQL; changing a base collection's fields can
  silently break a view that `SELECT`s them.
- There is no separate application layer to hold business rules, so "where is X computed?"
  almost always means "in a view in `pb_data` / migrations".

## Related

- [[Data Model]] — full schema.
- [[Reports & Ledgers]] — report/ledger SQL and semantics.
