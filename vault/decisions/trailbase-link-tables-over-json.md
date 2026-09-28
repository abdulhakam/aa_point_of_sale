---
title: Model multi-valued relations as link tables, not JSON
type: decision
status: accepted
decided_on: 2026-09-24
created: 2026-09-26
tags: [trailbase, schema, relations, json, indexes]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[data-model]]", "[[runtime-js-guest-platform]]"]
---

# Model multi-valued relations as link tables, not JSON

## Context

PocketBase modelled `parties.company` and `order_bookers.company` as **multi-valued relations**:
one record could be linked to many companies. The earlier TrailBase scaffold stored those as
**JSON arrays** in a `TEXT` column. The legacy frontend filters them with a JSON-membership
operator, `company~"<id>"`.

Two problems with JSON in TrailBase:

1. JSON cannot be indexed, so a membership query is a scan.
2. **TrailBase cannot filter on JSON membership** — there is no equivalent of PocketBase's `~`
   operator on a relation column. The documented filter operators are
   `$eq $ne $gt $gte $lt $lte $is $like $re`, plus the `in` form.

So the frontend's `company~"<id>"` filter had to be reworked regardless of how the data was
stored.

## Decision

Both multi-valued relations become **link tables**, each with a UUIDv7 surrogate key and a
`UNIQUE` constraint:

```sql
CREATE TABLE "party_companies" (
  "id" BLOB PRIMARY KEY NOT NULL CHECK (is_uuid_v7("id")) DEFAULT (uuid_v7()),
  "party" BLOB NOT NULL REFERENCES "parties"("id") ON DELETE CASCADE,
  "company" BLOB NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "created" …, "updated" …, UNIQUE ("party","company")) STRICT;
```

`order_booker_companies` is the mirror image with `order_booker` instead of `party`.

## Consequences

**Gained**

- The relation is queryable, indexable and manageable in **both directions**:
  `GET party_companies?filter[party][$eq]=<id>`, `?filter[company][$eq]=<id>`, `?expand=party,company`.
- The `UNIQUE ("party","company")` constraint is what actually prevents duplicates —
  a duplicate pair is refused with `400 db constraint: unique`, which was verified.
- `ON DELETE CASCADE` on both endpoints: a link without an endpoint is garbage, so it goes.
- The `UNIQUE` constraint doubles as the party → company lookup index, and the explicit
  `idx_party_companies_company` / `idx_order_booker_companies_company` indexes add the reverse.
- The guest frontend's management screens edit these directly:
  `trailbase/src/runtime/app/lib/management.js` declares a `multi` field type with
  `{link, field, other, source}`, e.g.
  `{ name: "company", type: "multi", link: "party_companies", field: "party", other: "company", source: "companies" }`.
- The `import-from-v1` plugin expanded the PocketBase arrays into these tables, so the translation
  is already written. It is ported to the guest at
  `trailbase/src/runtime/app/plugins/import-from-v1/`; verifying it is
  [[pos-0029-rebuild-v1-import-on-guest]].

**Given up**

- A composite primary key would have been marginally smaller, but **TrailBase can only expose a
  table whose primary key is a single `INTEGER` or UUID column**, and clients must be able to add
  and remove links through the API — so the surrogate key is forced, not preferred.
- Two more tables and a join instead of one denormalised column. Six of the 17 tables are now
  arguably infrastructure (three vocabularies + two link tables + the return-reference join).
- A client that wants "the companies of this party" needs a second request or a client-side
  resolve; nested `expand` does not exist. Both frontends resolve references client-side, which is
  the supported pattern — `hydrateRefs` in the legacy app and the `refs` map in the guest app.

## Evidence

- `trailbase/src/migrations/main/U1790208000__create_base_tables.sql` — the link tables,
  with the comment explaining the surrogate key ("a composite PRIMARY KEY would be marginally
  smaller, but TrailBase can only expose a table whose primary key is a single INTEGER or UUID
  column").
- `trailbase/src/config.textproto` — `party_companies` and `order_booker_companies` each declared with
  `expand: ["party","company"]` / `["order_booker","company"]`.
- `trailbase/README.md` § *Design decisions* → "**No JSON columns.**" including the
  `company~"<id>"` filter note.
- `trailbase/src/runtime/app/lib/management.js` — the `multi` field and column definitions for `parties`
  and `bookers`.
- `trailbase/src/runtime/app/plugins/import-from-v1/meta.md` — "Expands the multi-valued
  `parties.company` / `order_bookers.company` relations into the `party_companies` /
  `order_booker_companies` link tables." The Node copy had the same text
  (`frontend-ssr/plugins/import-from-v1/meta.md`, removed 2026-09-27, [[guest-app-host-port]]).
  Verifying it is [[pos-0029-rebuild-v1-import-on-guest]].
