---
title: TrailBase rejects JSON-schema validation on scalar columns
type: issue
status: known-limitation
severity: medium
created: 2026-09-26
tags: [trailbase, json-schema, validation, enums, upstream]
related_to: ["[[trailbase]]", "[[trailbase-encode-enums-as-integer-codes]]"]
---

# TrailBase rejects JSON-schema validation on scalar columns

## What was tried

TrailBase has a per-column JSON schema feature: register a schema in `config.textproto` under
`schemas`, bind it to a column with `CHECK (jsonschema('<name>', <column>))`, and TrailBase both
validates writes against it **and** republishes it through
`/api/records/v1/<name>/schema` for client codegen and UI rendering. That is exactly the
"define the validation schema and the UI schema in the database" idea, and it was the first design
tried for the enumeration columns.

## Measured result

Four shapes were created on a throw-away depot and exercised over HTTP, against `trail v0.33.15`
and re-measured with identical results on `v0.33.22`:

| Shape | Result |
|---|---|
| `type INTEGER CHECK (jsonschema('invoice_type', type))` with `enum: [0,1,2,3]` | **`INSERT` fails: `Invalid type`** — the validator only accepts TEXT arguments |
| `type INTEGER CHECK (jsonschema('invoice_type', CAST(type AS TEXT)))` | schema exports correctly (`"type":{"$ref":"#/$defs/type"}` with the enum and per-value `title`s) and an `INSERT` in SQL is validated correctly, but **`POST` via the record API fails with `400 Invalid Parameters`** |
| `type TEXT CHECK (jsonschema('invoice_type_text', type))` with `enum: ["sale",…]` | `POST {"type":"sale"}` → `400 Invalid Parameters`; `POST {"type":"\"sale\""}` (pre-serialised JSON text) → succeeds and reads back as `"sale"` |
| `data TEXT CHECK (jsonschema('obj_schema', data))` with an **object** schema | **works end-to-end**: `POST {"data":{"a":1}}` → `200`; `POST {"data":{"a":"x"}}` → `400` |

## Conclusion

**A scalar cannot be both `INTEGER`-coded and JSON-schema-validated through the API.** Given that
either/or, the enum was kept as `INTEGER` + foreign key into a vocabulary table, which delivers the
same two goals — write-time validation with a clear error, and a machine-readable vocabulary —
plus it survives filtering, sorting and `expand`
([[trailbase-encode-enums-as-integer-codes]]).

The feature is **not broken**, it is *narrow*: it is the right tool for a genuinely structured
object/array-valued `TEXT` column (a settings blob, `std.FileUpload`, …). Only those should be
bound to it.

## The second-order trap

The binding is checked **at startup**: a column whose `CHECK` names a schema that is not registered
in `config.textproto` prevents the server from booting
(`JsonSchema(NotFound("..."))`). So a half-finished experiment — a `CHECK` left in the migration
with the `schemas:` block removed — turns into a server that will not start.

For that reason, `trailbase/config.textproto` deliberately declares **no `schemas:` block at
all**: there is no column that should be bound to one. The absence is a decision, not an omission.
Anyone adding a JSON-schema-bound column in the future must add the block back *and* the migration
that references it, together.

## Evidence

- `trailbase/README.md` § *TrailBase's custom JSON schemas are only usable for object-valued
  columns* — the four-shape table above, with the two TrailBase versions named.
- `trailbase/README.md` § *Known TrailBase limitations* — the same limitation, re-checked on
  `v0.33.22`, noting that `v0.33.16`–`v0.33.22` changed WASM guests, the admin UI, schema-name
  parsing and batch error propagation, none of which touch this path.
- `trailbase/config.textproto` — no `schemas:` block, with the surrounding comment explaining the
  startup check.
- The prior vault recorded this as `issues/trailbase-scalar-json-schema-columns-rejected.md`; see
  [[previous-vault-recovery]].
