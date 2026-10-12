---
title: Encode enumerations as integer codes with a foreign key
type: decision
status: accepted
decided_on: 2026-09-24
created: 2026-09-26
tags: [trailbase, schema, enums, validation]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[data-model]]", "[[trailbase-scalar-json-schema-columns-rejected]]"]
---

# Encode enumerations as integer codes with a foreign key

## Context

PocketBase stored `parties.type`, `invoices.type` and `payments.type` as **text**
(`customer`, `sale`, `sending`, …) with `''` meaning unset, and the client branched on those
strings. The first TrailBase scaffold used text too, then JSON-schema-validated text.

Two goals were wanted: write-time validation with a clear error, and a machine-readable
vocabulary so clients can render dropdowns from the database instead of a hardcoded JavaScript
map.

TrailBase's per-column JSON schema feature looked like the answer — register a schema under
`schemas`, bind it with `CHECK (jsonschema('<name>', <column>))`, and TrailBase both validates
writes and republishes the schema through `/api/records/v1/<name>/schema`. It was tried first and
**does not work for scalar columns** (the measurements are in
[[trailbase-scalar-json-schema-columns-rejected]]).

## Decision

Enumerations are **`INTEGER` columns with a foreign key into a vocabulary table**, and the
vocabulary table is exposed as a record API.

```sql
CREATE TABLE "party_types" ("id" INTEGER PRIMARY KEY, "name" TEXT, "description" TEXT) STRICT;
INSERT INTO "party_types" ("id","name","description") VALUES
  (0,'customer','Buys from us'), (1,'supplier','Sells to us');
-- and on parties:
"type" INTEGER REFERENCES "party_types"("id")   -- nullable, no default
```

Codes are 0-based and stable. **`NULL` means "unset"**, replacing PocketBase's `''`. **`0` is a
real code**, so clients must test for unset with an explicit null check, never with truthiness.

| `party_types` | `invoice_types` | `payment_types` |
|---|---|---|
| `0` customer | `0` purchase | `0` sending |
| `1` supplier | `1` sale | `1` recieving |
| | `2` return | `2` return |
| | `3` difference | |

## Consequences

**Gained**

- 1–2 bytes instead of 7–10, and an integer compares and indexes as an integer.
- The set of legal values and their meaning live in the database **as rows**, which is what makes
  the schema self-defining — an invalid code is rejected by the FK
  (`POST parties {"type":9}` → `400 db constraint: fk`), and deleting a referenced vocabulary row
  is refused, so a code cannot be orphaned.
- Unlike a `CHECK (x IN (...))` list, adding a value is a data change, and the labels are
  editable through the API (`acl_authenticated: [READ, UPDATE, SCHEMA]` on the three vocabulary
  tables — deliberately **no `CREATE`**: adding a code is a schema change, because code-based
  logic would not know what a new code means).
- Clients render dropdowns from `GET /api/records/v1/party_types`, so no vocabulary is duplicated
  in JavaScript.

**Given up**

- Every existing write path changes: text → integer, and `''` → `NULL`. See
  [[pos-0027-migrate-production-data-to-trailbase]] for the translation table.
- Reading a label needs a second request *unless* `expand` is used. Every FK is allow-listed for
  expand, so `?expand=type` inlines it, and allow-listing costs nothing until asked for.
- Truthiness traps. `if (party.type)` is now wrong for a valid `0`, and `row.deleted ? …`
  changed meaning once booleans became `0`/`1` too. `trailbase/runtime/ahscripts/lib/data.js`
  coerces `0`/`1` explicitly for exactly this reason.
- No JSON-schema validation is available on scalar columns, so the enum's write-time validation
  is the FK, and TrailBase's `schemas:` block is deliberately absent from
  `config.textproto`.

## Evidence

- `trailbase/migrations/main/U1790208000__create_base_tables.sql` — the three
  vocabulary tables and their seeded `INSERT`s, plus every `INTEGER REFERENCES` column.
- `trailbase/config.textproto` — the three vocabulary APIs granting `[READ, UPDATE, SCHEMA]`
  and no `CREATE`; and the absence of any `schemas:` block, with the migration context.
- `trailbase/README.md` § *Design decisions* → "**Enumerations are `INTEGER` + foreign key, not
  `TEXT` and not JSON.**" and the enum tables.
- `trailbase/README.md` § *TrailBase's custom JSON schemas are only usable for object-valued
  columns* — the experiment that ruled out the alternative.
- `trail --depot=./traildepot schema invoices` → `invoices.type` is
  `{"type":["null","integer"]}`, confirming nullable integer rather than `''`-or-text.
