---
title: Data model
type: reference
status: active
system: both
created: 2026-09-26
tags: [pos, schema, data-model, trailbase, pocketbase, migration]
related_to: ["[[trailbase]]", "[[backend]]", "[[api-contract-trailbase]]"]
---

# Data model

The TrailBase schema is the target model; the PocketBase collections are what production runs
today. This note is the table-by-table reference for both, plus the value translation between
them. It is derived from
`trailbase/src/migrations/main/U1790208000__create_base_tables.sql` (21,008 bytes, the
only migration) and `trailbase/src/config.textproto`.

## Conventions used by every table

```sql
"id"      BLOB PRIMARY KEY NOT NULL CHECK (is_uuid_v7("id")) DEFAULT (uuid_v7())
"created" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ','now')) CHECK (datetime("created") IS NOT NULL)
"updated" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ','now')) CHECK (datetime("updated") IS NOT NULL)
```

- All 17 tables are `STRICT` — TrailBase refuses to expose a non-STRICT table.
- Primary keys are `BLOB` UUIDv7, generated server-side by `uuid_v7()` and validated by
  `is_uuid_v7()`. Time-sortable, so cursor pagination and index locality are free, and row
  counts are not leaked. PocketBase's `'r…'` ids are gone.
- `created` / `updated` are **`TEXT` in PocketBase's exact format**
  (`'%Y-%m-%d %H:%M:%fZ'`, e.g. `2026-09-24 16:17:32.436Z`) so data exported from PocketBase
  stays lexicographically comparable with new rows and the legacy frontend's `created >= '…'`
  range filters keep working. See [[trailbase-pocketbase-data-compatibility]].
- `updated` is maintained by a per-table `AFTER UPDATE` trigger (`trg_<table>__updated`),
  because SQLite has no `ON UPDATE`. Safe without recursion: TrailBase does not change SQLite's
  `recursive_triggers` default (off). These triggers are also what
  [[runtime-js-guest-platform]]'s change-detection fingerprint depends on.
- Money is `REAL`. See [[tb-0015-integer-cents-for-money]].
- Date-ish columns (`dated`, `duedate`, `payment_date`, `expenses.date`) are `TEXT DEFAULT ''`
  with `CHECK (col = '' OR datetime(col) IS NOT NULL)` — so `''` means unset and is a legal
  value, rather than `NULL`.

## Enumeration vocabularies

Three tables, seeded in the migration itself. Each is the single source of truth for the
code → label mapping, and each is exposed as a record API, so clients render dropdowns from the
database instead of a hardcoded JavaScript map.

```sql
CREATE TABLE "party_types" (... "name" TEXT ... "description" TEXT ...) STRICT;
INSERT INTO "party_types" ("id","name","description") VALUES
  (0, 'customer', 'Buys from us'),
  (1, 'supplier', 'Sells to us');
```

| `party_types` | | `invoice_types` | | `payment_types` | |
|---|---|---|---|---|---|
| `0` | customer | `0` | purchase | `0` | sending |
| `1` | supplier | `1` | sale | `1` | recieving |
| | | `2` | return | `2` | return |
| | | `3` | difference | | |

Descriptions as seeded: invoice `0` "Goods bought into stock", `1` "Goods sold to a customer",
`2` "Goods returned", `3` "Stock adjustment / write-off"; payment `0` "Money paid out",
`1` "Money taken in", `2` "Money returned".

**Codes are 0-based and stable** — they are written into rows and read back by clients, so they
must never be renumbered. **`0` is a real code**: clients must test "unset" with an explicit
null check, never with truthiness. `NULL` (not `''` as in PocketBase) is what "no type set"
means now. A code that does not exist is rejected by the foreign key
(`POST parties {"type":9}` → `400 db constraint: fk`), and deleting a vocabulary row that is
still referenced is refused, so a code cannot be orphaned.

`'recieving'` is spelled that way on purpose — see [[glossary]].

## Master data

| Table | Columns beyond the conventions |
|---|---|
| `sections` | `name` |
| `categories` | `name`, `deleted` |
| `companies` | `name`, `deleted` |
| `areas` | `name`, `section` → `sections(id)` `ON DELETE SET NULL`, `deleted` |
| `parties` | `name`, `type` → `party_types(id)` (**nullable, no default**), `phone`, `address`, `area` → `areas(id)` `ON DELETE SET NULL`, `deleted` |
| `order_bookers` | `name`, `phone`, `deleted` |
| `items` | `name`, `category` → `categories(id)` `ON DELETE SET NULL`, `barcode`, `display_id`, `cost_price`, `sale_price`, `box_size_qty` — note **no `deleted`** |
| `expenses` | `name`, `description`, `amount`, `date` |

`sections` has no `deleted` column, which is why [[runtime-js-guest-platform]] hard-deletes
sections and soft-deletes everything else — `trailbase/src/runtime/app/lib/management.js` records
`softDelete: false` for `sections` and `items`, `true` for the rest.

`items` also has no `deleted`, and is the only table with a partial unique index (below).

## Link tables

PocketBase modelled `parties.company` and `order_bookers.company` as multi-valued relations,
and the earlier TrailBase scaffold stored them as JSON arrays. JSON cannot be indexed and
TrailBase cannot filter on JSON membership, so each relation is a real row:

```sql
CREATE TABLE "party_companies" (
  "id" BLOB PRIMARY KEY … , "party" BLOB NOT NULL REFERENCES "parties"("id") ON DELETE CASCADE,
  "company" BLOB NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "created" …, "updated" …, UNIQUE ("party","company")) STRICT;

CREATE TABLE "order_booker_companies" ( … UNIQUE ("order_booker","company")) STRICT;
```

Each link carries a **UUIDv7 surrogate key** rather than a composite primary key: a composite
key would be marginally smaller, but TrailBase can only expose a table whose primary key is a
single `INTEGER` or UUID column, and clients must be able to add and remove these links through
the API. The `UNIQUE` constraint is what actually prevents duplicates (a duplicate pair is
refused with `400 db constraint: unique`), and it doubles as the party → company lookup index.
The explicit `idx_*_companies_company` indexes add the reverse direction.

## Transactions

### `invoices`

| Column | Type | Notes |
|---|---|---|
| `type` | `INTEGER` → `invoice_types(id)` | nullable; `0` is a real code |
| `invoiceNo` | `REAL` | the printed invoice number — numeric, and `REAL` rather than `INTEGER` to match PocketBase |
| `party` | `BLOB` → `parties(id)` | `ON DELETE SET NULL` |
| `booker` | `BLOB` → `order_bookers(id)` | `ON DELETE SET NULL` |
| `invoice_maker` | `BLOB` → `_user(id)` | `ON DELETE SET NULL`; TrailBase's hidden user table, so **cannot be expanded** |
| `dated` | `TEXT` | document date; `''` means unset, and readers fall back to `created` |
| `duedate` | `TEXT` | `''` means unset |
| `description` | `TEXT` | |
| `discount_1`, `discount_2` | `REAL` | two **multiplicative** percentages |
| `discount_rs` | `REAL` | flat amount, applied **after** the percentages |
| `completed` | `INTEGER CHECK IN (0,1)` | |
| `deleted` | `INTEGER CHECK IN (0,1)` | soft delete |

### `invoices_return_reference`

| Column | Type | Notes |
|---|---|---|
| `original_invoices` | `BLOB` → `invoices(id)` | `ON DELETE SET NULL` — which invoice a return references |

Plus `id`, `created`, `updated`. This is a standalone join table, not a column on `invoices`.

### `transactions` — one row per invoice **line**

| Column | Type | Notes |
|---|---|---|
| `invoice` | `BLOB NOT NULL` → `invoices(id)` | default `NO ACTION` — a line cannot outlive its invoice |
| `item` | `BLOB NOT NULL` → `items(id)` | default `NO ACTION` — an item with history cannot be deleted |
| `cost_price` | `REAL` | |
| `price` | `REAL` | unit price |
| `qty` | `REAL` | |
| `scheme` | `REAL` | free quantity ("Free" column) |
| `discount_1`, `discount_2` | `REAL` | line-level percentages |
| `discount_rs` | `REAL` | line-level flat amount |
| `deleted` | `INTEGER CHECK IN (0,1)` | |

⚠️ `transactions` means **invoice lines**, never payments. See [[glossary]].

### `payments`

| Column | Type | Notes |
|---|---|---|
| `invoice` | `BLOB` → `invoices(id)` | `ON DELETE SET NULL` |
| `party` | `BLOB` → `parties(id)` | `ON DELETE SET NULL` |
| `paid_to` | `BLOB` → `order_bookers(id)` | `ON DELETE SET NULL` — the booker the money went through |
| `type` | `INTEGER` → `payment_types(id)` | direction: sending / recieving / return |
| `amount` | `REAL` | a **positive magnitude**; direction comes from `type`, not the sign |
| `paid` | `INTEGER CHECK IN (0,1)` | |
| `payment_date` | `TEXT` | `''` means unset |
| `description` | `TEXT` | |

## Delete behaviour, deliberately chosen

| Reference | Behaviour | Why |
|---|---|---|
| `areas.section`, `items.category`, `parties.area`, `invoices.party`, `invoices.booker`, `invoices.invoice_maker`, `invoices_return_reference.original_invoices`, `payments.invoice`, `payments.party`, `payments.paid_to` | `ON DELETE SET NULL` | the child survives, the link is cleared — master data can be retired without destroying history |
| `transactions.invoice`, `transactions.item` | default `NO ACTION` | ledger rows: deleting an item or invoice that already has transactions is **refused** instead of silently orphaning history |
| `party_companies.*`, `order_booker_companies.*` | `ON DELETE CASCADE` | a link without an endpoint is garbage |

## Indexes, by access path

```text
transactions   invoice, item
invoices       party, booker, type, dated, created, invoice_maker, (type, created)
return refs    original_invoices
payments       party, paid, type, invoice, created, (type, paid), (party, paid, type), payment_date
parties        area, type
areas          section
items          category, display_id, UNIQUE(barcode) WHERE barcode != ''
expenses       date
links          company (both tables; the UNIQUE constraints index the other direction)
```

The `barcode` index is **partial and unique** (`WHERE "barcode" != ''`) so any number of items
may have no barcode while a duplicate non-empty one is refused — verified: `POST items
{"barcode":""}` twice → both `200`; `POST items {"barcode":"999"}` twice → `200` then
`400 db constraint: unique`. Indexes follow the access paths the frontends actually take, not
the old PocketBase view list.

## PocketBase → TrailBase value translation

Required when migrating data out of [[backend]] ([[pos-0027-migrate-production-data-to-trailbase]]):

| Old value | New value |
|---|---|
| `parties.type`: `''` / `customer` / `supplier` | `NULL` / `0` / `1` |
| `invoices.type`: `''` / `purchase` / `sale` / `return` / `difference` | `NULL` / `0` / `1` / `2` / `3` |
| `payments.type`: `''` / `sending` / `recieving` / `return` | `NULL` / `0` / `1` / `2` |
| `parties.company`, `order_bookers.company` (JSON arrays of ids) | one `party_companies` / `order_booker_companies` row per id |
| legacy `categories` (the one company list, shown as "Companies"; there is no legacy `companies` table) | a row in **both** new `categories` and `companies` — `items.category` FKs to the former, the link tables FK to the latter ([[v1-categories-map-to-companies]]) |
| booleans `true`/`false` | `1`/`0` |
| `'r…'` PocketBase ids | UUIDv7 (`uuid_v7()`), or keep the old ids by inserting with `uuid_parse()` |

Reading a label now costs one request and is usually free: every FK is allow-listed for
`expand`, so `GET /api/records/v1/invoices?expand=type,party,booker` returns the invoice with
the `invoice_types` row inlined as `type: {"id":1,"data":{"name":"sale",…}}`.

## Platform tables (not part of the 17 business tables)

The guest-WASM platform ([[runtime-js-guest-platform]]) adds its own tables in later migrations.
They are infrastructure, not business data, and are written with direct SQL
([[guest-writes-via-sql]]):

| Table | Migration | Purpose |
|---|---|---|
| `job`, `job_step`, `job_artifact` | `U1790300000__create_job_tables.sql` | durable job queue: steps carry a UNIQUE `idempotency_key`, `state`, `attempt`, `lease_until`; `job_artifact.step_key` is UNIQUE so a re-run cannot double-apply ([[jobs-in-process-durable-queue]]) |
| `invoice_lock`, `invoice_create_key`, `invoice_line_op` | `U1790300200__create_invoice_entry_tables.sql` | invoice entry: an edit lease per invoice, a create idempotency key, and a line-add idempotency key ([[invoice-entry-freshness-and-writes]], [[tb-0021-invoices-cashmemos-printing]]) |

`U1790300100__round_money_to_2dp.sql` is a **data** migration, not schema: it rounds existing
money and discount columns to 2 dp ([[money-is-2dp-everywhere]]).

Note: TrailBase's `_user` ids are **UUIDv4**, so a table that references a user must not carry a
`uuid_v7` check ([[trailbase-user-ids-are-uuidv4]]).

## Where the schema is *not* fully described here

The `_user` table is TrailBase's own and is deliberately not declared in `config.textproto`;
staff accounts are managed through `/api/auth/v1`. `invoices.invoice_maker` is the only FK
pointing at it, and it cannot be expanded.

## Related

- [[api-contract-trailbase]] — how these tables are read and written over HTTP.
- [[trailbase]] — the migration, config and access-control context.
- [[reports-and-ledgers]] — the arithmetic layered on top of these tables.
- [[tb-0015-integer-cents-for-money]] — the one pending change to this model.
