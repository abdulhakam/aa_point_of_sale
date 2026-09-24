---
type: Task
status: Done
ticket: TB-0001
priority: P2
belongs_to:
  - "[[TrailBase Backend]]"
related_to:
  - "[[Backend — TrailBase Server]]"
affects:
  - "[[Backend — TrailBase Server]]"
created: 2026-09-24
updated: 2026-09-24
tags:
  - trailbase
  - schema
  - redesign
---

# TB-0001 Redesign the TrailBase schema

## Goal

Replace the first TrailBase scaffold with a schema that is efficient for SQLite, self-defining, and
uses TrailBase's own features instead of hand-rolled approximations — integer-coded enumerations, no
JSON columns, no views.

## Done when

- Enumerations are integer codes whose legal values and labels live in the database.
- No JSON columns and no views in the schema, and the report SQL that used to be views is preserved
  somewhere recoverable.
- The record APIs cover every table, declare their expandable foreign keys, and the config loads.
- The migration applies cleanly to an empty depot and the server boots with all record APIs resolving.
- Write-time validation rejects an invalid enum code and a duplicate link with an intelligible error.
- The README records what was measured, what the limits are, and every contract the frontend breaks.

## Context

The scaffold being replaced had 14 ported views (4 of which could not even be exposed), `TEXT` enums
guarded by `CHECK (x IN (...))`, and `parties.company` / `order_bookers.company` as JSON arrays. The
owner asked for the most efficient SQLite representation, an enum scheme with `0`/`1`/`2` stored values
whose meaning is declared in the schema, and maximum use of TrailBase's own features — including its
custom JSON-schema feature for validation and, if possible, UI metadata.

## Work log

1. Read the TrailBase source (`config.proto`, `schema/metadata.rs`, `extension/jsonschema.rs`,
   `records/create_record.rs`, `settings/json_schema.rs`) to establish what the custom-schema feature
   actually supports, then measured it on a scratch depot rather than trusting the docs.
2. Found that a scalar cannot be both integer-coded and JSON-schema-validated through the API; adopted
   integer codes with foreign keys into vocabulary tables.
3. Rewrote `traildepot/migrations/main/U1790208000__create_base_tables.sql` (17 `STRICT` tables:
   3 vocabulary, 8 master data, 2 link tables, 4 transaction tables, indexes, `updated` triggers).
4. Deleted the views migration; confirmed the SQL is preserved in `full_database_schema.sql` and
   `../dltbl/views_from_pb/`.
5. Rewrote `traildepot/config.textproto` (all 17 record APIs, `READ, UPDATE` for vocabularies, `expand`
   allow-lists, `SCHEMA` granted).
6. Validated end-to-end on a throw-away depot with seeded fixed-UUID rows, then on the real depot.
7. Rewrote the README as the design and verification record.

## Verification

- Migration applies from an empty depot:
  `Successfully applied migrations for 'main' DB: … 'U1790208000__create_base_tables'` followed by
  `Listening on http://[::1]:4000 🚀`, which also means all 17 record APIs and the config validated.
- `trail --depot=./traildepot schema invoices` exports the JSON schema (`type` is `["null","integer"]`).
- With the shipped authenticated-only config, unauthenticated `GET /api/records/v1/items` and
  `…/party_types/schema` both return **403**.
- Behaviour over HTTP against a seeded depot: `GET party_types` returns the seeded
  `0 customer` / `1 supplier` rows; `GET invoices?expand=type,party,booker` inlines
  `type: {"id":1,"data":{"name":"sale",…}}`; `GET parties?expand=type` inlines the label for both code
  `0` and code `1`; `GET invoices?filter[type][$eq]=1` → 1 row and `=0` → 0 rows;
  `POST parties {"type":1}` → `200`; `POST parties {"type":9}` → `400 db constraint: fk`;
  duplicate `party_companies` pair → `400 db constraint: unique`; new pair with canonical UUID text →
  `200`; `POST items {"barcode":""}` twice → both `200`; `POST items {"barcode":"999"}` twice → `200`
  then `400 db constraint: unique`; `GET payments?expand=type,party` inlines `recieving` and returns
  `paid: 1`.
- Negative results that shaped the schema (scalar JSON-schema columns, view type inference) are recorded
  as issues: [[Issue — TrailBase rejects scalar JSON-schema columns]],
  [[Issue — TrailBase view type-inference limits]].
- The scratch/verification depots were deleted afterwards, and `traildepot/data/` was removed so the
  first real run is a clean first run.

## Related

- [[Decision — Encode enumerations as integer codes with vocabulary tables]]
- [[Decision — Drop SQL views; aggregate reports client-side]]
- [[Decision — Model multi-valued relations as link tables]]
- [[Decision — Keep PocketBase-compatible data shapes]]
- [[Checkpoint — TrailBase Backend — 2026-09-24]]
