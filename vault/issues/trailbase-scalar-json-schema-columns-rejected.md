---
type: Issue
status: Open
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
  - json-schema
  - limitation
  - enums
---

# Issue — TrailBase rejects scalar JSON-schema columns

## Summary

TrailBase's custom JSON-schema feature (register a schema under `schemas:`, bind it to a column with
`CHECK (jsonschema('<name>', <column>))`) validates writes **and** republishes the schema through
`/api/records/v1/<name>/schema` for client codegen and UI rendering. That makes it the obvious way to
make an enum self-defining, but it cannot be used on a scalar column: an `INTEGER`-coded enum or a
single-word `TEXT` enum is rejected by the record API on write.

## Evidence (measured 2026-09-24, `trail v0.33.15`)

| Column / shape | Result |
|---|---|
| `type INTEGER CHECK (jsonschema('invoice_type', type))`, schema `enum: [0,1,2,3]` | `INSERT` fails: `Invalid type` — the SQLite validator only accepts a TEXT argument |
| `type INTEGER CHECK (jsonschema('invoice_type', CAST(type AS TEXT)))` | SQL inserts validate and `/schema` exports correctly (`"type":{"$ref":"#/$defs/type"}` with the enum and per-value `title`s), but **`POST {"type":3}` → `400 Invalid Parameters`** |
| `type TEXT CHECK (jsonschema('invoice_type_text', type))`, schema `enum: ["sale", …]` | `POST {"type":"sale"}` → `400 Invalid Parameters`; `POST {"type":"\"sale\""}` → `200`, read back as `"sale"` (double-encoded on write, decoded on read) |
| `data TEXT CHECK (jsonschema('obj_schema', data))`, object schema | works end-to-end: `POST {"data":{"a":1}}` → `200`, `POST {"data":{"a":"x"}}` → `400` |

The `400` is raised before SQL: `create_record.rs` marshals the request value into the column and
converts a failure into `BadRequest("Invalid Parameters")`, so the response carries no field-level
detail and never reaches the `CHECK`.

## Impact

- The schema cannot express an enum's legal values and their labels through TrailBase's own
  self-describing mechanism; see [[Decision — Encode enumerations as integer codes with vocabulary tables]]
  for the adopted alternative (integer codes + foreign key into a vocabulary table).
- The generated JSON schema for such a column carries no `enum`, so generated clients and the admin UI
  cannot render a dropdown from the schema alone — they must read the vocabulary API instead.
- Anyone reaching for this feature for a scalar will lose an afternoon to a `400` with no explanation.
  The write path is unusable for scalars, but nothing warns about it at startup: the server boots and
  the schema endpoint looks correct.

## Cause (inferred)

`is_uuid`-style arg handling aside, the JSON-schema validators (`jsonschema_by_name_impl`,
`jsonschema_matches`) read their value argument with `as_str_or_null()`, which errors on any non-TEXT
storage class, and the record API's parameter marshaller appears to expect a JSON-encoded TEXT payload
for a schema-bound column rather than a plain scalar. The refusal happens client-side of SQLite, so the
`CHECK` never runs. This is inference from the observed messages, not from reading the marshaller
line by line.

## Options

1. **Accept the limitation** and keep enums as integer codes with a vocabulary table (current choice).
2. **Restructure the column as JSON text** (`{"code":1}`) bound to an object schema, and have clients
   unwrap it. Works with the feature as documented, costs a double encoding and makes filters awkward.
3. **Escalate upstream** with this table as the reproduction; a scalar-aware marshaller would make the
   feature usable for exactly this purpose.
4. **Re-check on upgrade** — this is version-specific behaviour (`v0.33.15` was current-tested;
   `v0.33.22` had been released the previous day but was not installed).

## Workaround

Use the vocabulary table for enums, and reserve `jsonschema(...)` for genuinely object/array-valued
`TEXT` columns (a settings blob, `std.FileUpload`), where it works as documented.

## Update (2026-09-24) — re-probed on v0.33.22, unchanged

The binary was upgraded to `trail v0.33.22-0-g3dfb2f70` during this session, so the probe was repeated on
the new version against a fresh depot. `probe_int_cast` (`INTEGER` + `CAST(...)`) still returns
`400 Invalid Parameters` for both a valid `{"type":1}` and an invalid `{"type":9}`; `probe_text_js`
still rejects `{"type":"sale"}` and accepts the pre-serialised `{"type":"\"sale\""}`; and the real
authenticated-only APIs still answer `403` unauthenticated.

The limitation is therefore not specific to `v0.33.15`. The `v0.33.16`–`v0.33.22` changelog contains
nothing touching this write path (only an adjacent "empty/all-default inserts and empty updates"
fix in `v0.33.18`), so
[[Decision — Encode enumerations as integer codes with vocabulary tables]] stands.

## Related

- [[Decision — Encode enumerations as integer codes with vocabulary tables]]
- [[Backend — TrailBase Server]]
- [[Issue — TrailBase view type-inference limits]] — the other empirically-found limitation.
