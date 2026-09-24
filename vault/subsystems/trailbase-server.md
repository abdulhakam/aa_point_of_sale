---
type: Subsystem
status: Active
created: 2026-09-24
updated: 2026-09-24
belongs_to:
  - "[[TrailBase Backend]]"
related_to:
  - "[[Backend — PocketBase Data Service]]"
  - "[[Decision — Use PocketBase and Next.js]]"
tags:
  - trailbase
  - backend
  - sqlite
  - api
---

# Backend — TrailBase Server

## What it is

A [TrailBase](https://trailbase.io) server (`trail v0.33.22`, validated on `v0.33.15` first) exposing the point-of-sale data as
typed REST record APIs over SQLite. It is the counterpart to [[Backend — PocketBase Data Service]] for
the same business domain, built in `trailbase/` — a different system with its own schema, its own auth
and its own API shape, not a drop-in replacement of PocketBase.

## Where it lives

```text
trailbase/
  README.md                      # design record, integration gotchas, validation log
  RUN.BAT                        # start the server + open the admin dashboard
  traildepot/
    config.textproto             # server/auth settings + record_api declarations
    migrations/main/
      U1790208000__create_base_tables.sql
    data/ backups/ secrets/ ...  # runtime state, git-ignored
```

## Interface

- **Record APIs** at `/api/records/v1/<name>` — one per table, 17 of them. `POST` (create, single or
  array), `GET /<id>`, `PATCH /<id>`, `DELETE /<id>`, `GET ?<params>` (list), `GET /schema`.
- **List parameters**: `?filter[col][$eq|$ne|$gt|$gte|$lt|$lte|$is|$like|$re]=…`, `?limit=`,
  `?cursor=`, `?offset=`, `?count=true`, `?order=+/-col`, `?expand=<allow-listed foreign key>`.
  Listing hard limit is 1024. This is **not** PocketBase's `filter: 'a = "b" && c = 1'` syntax.
- **Auth** is TrailBase's own (`/api/auth/v1/login`, `/register`, …): email required, optional username,
  8-char minimum password, no anonymous or OTP sign-in, 1 h access token + 30 d refresh token. Admin
  dashboard at `/_/admin/`. An unauthenticated request is answered with **403**, not 401.
- **Relations**: reads return url-safe base64 ids and URL paths use that base64 form, but **writing a
  relation value requires canonical UUID text**. The asymmetry is the first thing a client hits.
- **`SCHEMA` permission is granted** to authenticated users, so `/schema` and
  `trail --depot=./traildepot schema <api>` work for client codegen.

## Data

17 `STRICT` tables, no views: three vocabulary tables (`party_types`, `invoice_types`,
`payment_types`), eight master-data tables, two link tables, four transaction tables. Enumerations are
integer codes with foreign keys — see [[Decision — Encode enumerations as integer codes with vocabulary tables]].
Reports are aggregated by the client — see [[Decision — Drop SQL views; aggregate reports client-side]].
Timestamps keep PocketBase's `'%Y-%m-%d %H:%M:%fZ'` text format — see
[[Decision — Keep PocketBase-compatible data shapes]].

## Configuration

`traildepot/config.textproto` holds the non-secret configuration: application name, `site_url`,
`enable_record_transactions` (atomic invoice + transactions in one request), request size limit, auth
TTL/policy, and the `record_apis` list (ACLs, `expand` allow-lists). Secrets go in
`traildepot/secrets/secrets.textproto` (git-ignored). The config is validated at startup: an unknown
`expand`/`excluded_columns` entry, or a column whose `CHECK (jsonschema(…))` names an unregistered
schema, prevents the server from booting.

## How to run

```sh
trail --depot=./traildepot run          # or RUN.BAT
trail --depot=./traildepot schema items # export a record API's JSON schema
```

First run creates the depot, applies the migration and prints a generated admin credential.

## Constraints and gotchas

- Only `STRICT` tables are exposable, and only with a single `INTEGER` or UUID primary key.
- `expand` is one hop, opt-in, allow-listed, and cannot reach the hidden `_user` table.
- A changed migration file is **skipped**, not reapplied, when a `data/` directory already exists —
  see [[Issue — A stale TrailBase depot silently keeps an old schema]].
- Scalar JSON-schema columns cannot be written through the API —
  see [[Issue — TrailBase rejects scalar JSON-schema columns]].
- View type inference is too strict for the PocketBase report views —
  see [[Issue — TrailBase view type-inference limits]].
- `0` is a meaningful enum code (`0` = customer / purchase / sending), so null checks must be explicit.

## Related

- [[TrailBase Backend]] — the project this belongs to.
- [[Decision — Use PocketBase and Next.js]] — the stack this one is an alternative to.
- [[Data Model]] — the PocketBase data model, which the domain (not the schema) is borrowed from.
