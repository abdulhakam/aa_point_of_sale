---
type: WorkSession
status: Completed
started: 2026-09-24
updated: 2026-09-24
belongs_to:
  - "[[TrailBase Backend]]"
works_on:
  - "[[TB-0001 Redesign the TrailBase schema]]"
created: 2026-09-24
tags:
  - trailbase
  - schema
  - session
---

# Work Session — TrailBase Schema Redesign — 2026-09-24

## Objective

Rework the TrailBase scaffold so the schema is the most efficient shape SQLite allows for this
workload, enumerations are stored as integer codes whose meaning is declared in the database, JSON
columns and views are eliminated, and TrailBase's own features are used wherever they fit — including
its custom JSON-schema feature, which the owner asked for explicitly.

## Starting state (verified this session)

- `trailbase/` held a scaffold from a previous session: one migration with 12 base tables and 14 ported
  views, `config.textproto` with 23 record APIs, a README describing the port.
- Enumerations were `TEXT` with `CHECK (x IN (...))`; `parties.company` and `order_bookers.company` were
  `TEXT` JSON arrays; four views were created but deliberately not exposed.
- `traildepot/data/` did **not** exist, so no depot had ever been initialized from those migrations.
- Installed toolchain: `trail v0.33.15-0-g2b867e5a` (sqlite 3.53.2), git bash with curl and timeout.

## Constraints

- The owner's instruction was explicit about direction: enums as integer codes with the meaning declared
  in the schema, no view tables, no JSON where an enum will do, "self-defining and complete" using
  TrailBase's features, and ideally UI schema from the same place as validation schema.
- The system's specs and structure are expected to change drastically soon, so the durable output of
  this session is the decisions and the measurement record, not a fixed product spec.
- No installed `v0.33.22`; everything was measured on the installed `v0.33.15`.

## Execution plan (as executed)

1. Establish what TrailBase's custom JSON-schema feature really supports, empirically.
2. Choose the enum encoding from the measurement.
3. Rewrite the migration (tables, indexes, triggers) and delete the views.
4. Rewrite the record-API config.
5. Verify on a throw-away depot: schema resolution, then HTTP behaviour including the failure paths.
6. Verify the real config from an empty depot, then leave a clean first-run state.
7. Rewrite the README; then record the work in the knowledgebase.

## Activity log

- Read `config.proto`, `schema/src/metadata.rs`, `schema/src/registry.rs`, `extension/src/jsonschema.rs`,
  `records/create_record.rs`, `records/validate.rs`, `extension/src/uuid.rs` and the docs to learn the
  feature surface instead of guessing at it. Key finding: a column is bound to a schema by a
  `CHECK (jsonschema('<name>', <column>))`, validated by a registered SQLite function, and the binding is
  checked at startup.
- Built a scratch depot and tested four enum shapes plus an object-schema control. Only the object-valued
  column works through the record API; scalars fail with `400 Invalid Parameters`, and a bare `INTEGER`
  argument fails at SQLite level with `Invalid type`. Recorded as
  [[Issue — TrailBase rejects scalar JSON-schema columns]].
- Also proved `is_uuid_v7` accepts a BLOB, canonical UUID text, or `uuid_parse('…')` — and that a
  15-byte blob literal is rejected, which is what an import must avoid.
- Wrote the new migration (17 `STRICT` tables, 3 of them seeded vocabularies, 2 link tables, 27 indexes,
  17 `updated` triggers) and deleted the views migration after confirming the SQL is preserved in
  `full_database_schema.sql` and `../dltbl/views_from_pb/`.
- Wrote the new `config.textproto`: vocabularies get `READ, UPDATE`, business tables
  `CREATE, READ, UPDATE, DELETE`, all get `SCHEMA`, foreign keys that a client would want to display are
  allow-listed for `expand`. `invoice_maker` is deliberately excluded because TrailBase forbids expanding
  a hidden `_user` table.
- Verified on a seeded throw-away depot and then on the real depot, then removed all scratch state.

## Changed artifacts

- `trailbase/traildepot/migrations/main/U1790208000__create_base_tables.sql` — rewritten.
- `trailbase/traildepot/migrations/main/U1790208120__create_views.sql` — deleted.
- `trailbase/traildepot/config.textproto` — rewritten.
- `trailbase/README.md` — rewritten (design, findings, frontend impact, validation log).
- `trailbase/traildepot/metadata.textproto` and `traildepot/.gitignore` — rewritten **by TrailBase** at
  startup (version stamp and depot-file normalization); the `static/` line was restored by hand with a
  comment, because TrailBase drops lines it does not know.
- `traildepot/data/` — created by validation, then deleted, so the first real run is a clean first run.

## Verification performed

Recorded in full under [[TB-0001 Redesign the TrailBase schema]] `## Verification`. Summary: the
migration applies to an empty depot, all 17 record APIs resolve, the server boots, unauthenticated
requests return 403, and the enum/link/barcode failure paths all return the expected `db constraint`
errors while the happy paths return the expected rows and inlined labels.

## Decisions made

- [[Decision — Encode enumerations as integer codes with vocabulary tables]]
- [[Decision — Drop SQL views; aggregate reports client-side]]
- [[Decision — Model multi-valued relations as link tables]]
- [[Decision — Keep PocketBase-compatible data shapes]]

## Blockers and open questions

- None blocking. Open: whether `REAL` money should become integer cents (deferred to
  [[TB-0002 Wire a frontend to the TrailBase server]] because it changes every client amount), and
  whether the `parties`↔`companies` relation is truly many-to-many or should collapse to a column.
- Not verified: anything on a TrailBase version newer than `v0.33.15`. The two recorded limitations are
  version-specific and worth re-probing after an upgrade.
- No Artifact/Test/Requirement notes were created because this vault does not declare those types; the
  verification lives in the task and the subsystem note links the files. Recorded here so the omission is
  deliberate rather than forgotten.

## Exact next action

None scheduled for code. The next step is a re-specification pass with the owner, because the TrailBase
system's specs and structure are expected to change substantially. Both
[[TB-0002 Wire a frontend to the TrailBase server]] and
[[TB-0003 Migrate PocketBase data into the TrailBase schema]] are held in Backlog until then. If work
resumes without a new spec, start from `trailbase/README.md` and the checkpoint.
