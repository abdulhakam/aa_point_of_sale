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
  - relations
  - json
---

# Decision — Model multi-valued relations as link tables

## Status

Accepted (2026-09-24). In force in the TrailBase schema.

## Context

`parties.company` and `order_bookers.company` are multi-valued relations in PocketBase (a party or a
booker can belong to several companies). The earlier TrailBase scaffold kept them as `TEXT` JSON
arrays to stay shape-identical with the ported views. Two costs came with that: TrailBase cannot filter
on JSON membership, so the frontend's `company~"<id>"` filter had to be reworked anyway, and JSON is
neither indexable nor enforceable.

## Decision

Multi-valued relations are real rows in link tables — `party_companies` and `order_booker_companies` —
each with a UUIDv7 surrogate primary key, `UNIQUE (<owner>, <company>)`, `NOT NULL` foreign keys to
both endpoints with `ON DELETE CASCADE`, and `created`/`updated`. The relation is managed through the
record API like any other row.

## Consequences

- Filterable and indexable in both directions (`UNIQUE` indexes owner→company, plus an explicit index
  for company→owner), and `?expand=party,company` inlines both endpoints in one request.
- No JSON anywhere in the schema, which also removes the "relation values must be JSON-encoded" class
  of client bug.
- Reading "which companies does this party belong to" is one extra request (or one `expand`), where a
  JSON array was a single inline field.
- The surrogate key is redundant with the natural key. A composite `PRIMARY KEY` with `WITHOUT ROWID`
  would be smaller, but **TrailBase can only expose a table whose primary key is a single `INTEGER` or
  UUID column**, and clients must be able to add/remove these links through the API.
- Adding or removing a company link is a create/delete, not an array overwrite, so concurrent edits by
  two users do not clobber each other.

## Alternatives considered

- **Keep JSON arrays** — rejected: no membership filter through the API, no index, no enforcement, and
  the client has to encode/decode UUIDs inside JSON text.
- **Composite primary key (`(party, company)`, `WITHOUT ROWID`)** — smaller and the natural key, but the
  table then cannot be exposed as a record API, so links could only be managed by hand-written SQL.
- **A single `company` foreign key** (a party belongs to at most one company) — this is a product
  question, not a storage question; the multi-valued shape is carried over from PocketBase. If the
  domain is really one-to-many, collapse the link table into a `company` column on `parties`.

## Evidence

- `POST /api/records/v1/party_companies` with a duplicate pair → `400 db constraint: unique`; with a new
  pair (canonical UUID text) → `200`.
- `GET /api/records/v1/party_companies?expand=party,company` returns both endpoints inlined.
- The old JSON shape and its filter limitation are described in the superseded scaffold's README and in
  [[Data Model]].

## Revisit when

- The domain turns out to be one-to-many (then replace the link table with a `company` column).
- Link volume, not correctness, becomes a concern — it will not at this scale.

## Related

- [[Decision — Encode enumerations as integer codes with vocabulary tables]] — the other "no JSON" call.
- [[Backend — TrailBase Server]]
- [[Data Model]] — the original multi-valued relations.
