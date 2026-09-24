---
type: Decision
status: Accepted
created: 2026-09-24
updated: 2026-09-24
belongs_to:
  - "[[TrailBase Backend]]"
related_to:
  - "[[Backend — TrailBase Server]]"
affects:
  - "[[TrailBase Backend]]"
tags:
  - trailbase
  - schema
  - enums
  - json-schema
---

# Decision — Encode enumerations as integer codes with vocabulary tables

## Status

Accepted (2026-09-24). In force in the TrailBase schema.

## Context

The domain has three finite vocabularies: invoice type (purchase / sale / return / difference),
party type (customer / supplier) and payment type (sending / recieving / return). The backend has to
store them, validate them on write, filter and sort on them, and let a client render a dropdown with
labels. Three encodings were viable:

1. `TEXT` value with `CHECK (x IN (...))` — what the earlier TrailBase scaffold used.
2. Any column bound to a **TrailBase custom JSON schema** with `enum` + per-value `title`s, which also
   republishes through `/api/records/v1/<name>/schema` for client codegen and UI rendering.
3. `INTEGER` code with a foreign key into a vocabulary table that holds the labels.

Option 2 is the most "self-defining" on paper, so it was measured first; it cannot express a scalar
(see [[Issue — TrailBase rejects scalar JSON-schema columns]]).

## Decision

Enumerations are `INTEGER` code columns with a foreign key into a dedicated vocabulary table
(`party_types`, `invoice_types`, `payment_types`), where each row carries `id`, `name` (unique) and
`description`. Codes are 0-based, seeded by migration, and never renumbered. The vocabulary tables are
exposed as record APIs with `READ, UPDATE` (labels editable in place, new codes deliberately not
creatable through the API). Clients read labels either from the vocabulary API or, for one record, by
asking for `?expand=<column>` on the owning API.

## Consequences

- The legal values **and their meaning** are database rows, not a client-side map and not a comment.
  `GET /api/records/v1/invoice_types` is the source of truth for a dropdown.
- Write validation comes from the foreign key, with a clear error: `POST {"type":9}` →
  `400 db constraint: fk`.
- A vocabulary row that is still referenced cannot be deleted, so a code cannot be orphaned.
- Codes are opaque in raw data: reading `type: 1` means nothing without the vocabulary table, and a
  raw SQL session needs a join. This is the cost of storing a code instead of a word.
- `0` is a real, meaningful value, so clients must test for "unset" with an explicit null check
  (`''` in PocketBase became `NULL`). Truthiness checks break.
- `INTEGER` compares, indexes and orders as an integer; a `TEXT` code would not order the same way.

## Alternatives considered

- **`TEXT` + `CHECK (x IN (...))`** — self-contained in the DDL, but the code→label map then lives in
  frontend code, adding a value still needs a migration, and per-value meaning has nowhere to live.
- **TrailBase custom JSON schema** — rejected: a scalar bound to a JSON schema cannot be written
  through the record API. Reproduced in [[Issue — TrailBase rejects scalar JSON-schema columns]].
- **A native `ENUM` type** — SQLite has none, and `STRICT` tables only allow INT/INTEGER/REAL/TEXT/BLOB/ANY.

## Evidence

Measured against `trail v0.33.15` on a scratch depot, then on the real depot:

- `POST /api/records/v1/parties {"name":"Bad","type":9}` → `400 db constraint: fk`.
- `POST /api/records/v1/parties {"type":1}` → `200`.
- `GET /api/records/v1/invoices?expand=type` → `type: {"id":1,"data":{"name":"sale","description":"Goods sold to a customer"}}`.
- `GET /api/records/v1/invoices?filter[type][$eq]=1` → 1 row; `=0` → 0 rows.
- The rejected alternative, same depot: `type INTEGER CHECK (jsonschema('invoice_type', CAST(type AS TEXT)))`
  exports the correct enum schema and validates SQL inserts, but every API write returns
  `400 Invalid Parameters`.

## Revisit when

- A vocabulary needs attributes beyond name/description (then it is a real entity, not an enum).
- A code must be renumbered or a value retired (needs a data migration plus client coordination).
- TrailBase gains scalar JSON-schema support and the UI/codegen benefit outweighs the indirection.

## Related

- [[Backend — TrailBase Server]] — where these tables and APIs live.
- [[Issue — TrailBase rejects scalar JSON-schema columns]] — the measurement that forced this choice.
- [[Data Model]] — the PocketBase model these codes replace (`''`/`customer`/`supplier`, ...).
