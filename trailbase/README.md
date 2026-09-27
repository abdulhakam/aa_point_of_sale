# TrailBase backend

A [TrailBase](https://trailbase.io) server for the point-of-sale data that currently lives in the
PocketBase backend (`../backend`, schema in `../full_database_schema.sql`).

The database schema and the REST APIs are in place and validated against a running server (see
[Validation](#validation)). The Next.js frontend still talks to PocketBase; wiring it to this server
is the remaining work, and [Frontend impact](#frontend-impact) lists every contract that changed.

## Layout

```text
trailbase/
  README.md
  RUN.BAT                        # start the server + open the admin dashboard
  traildepot/
    config.textproto             # server/auth settings + record API declarations
    migrations/main/
      U1790208000__create_base_tables.sql
    data/ backups/ secrets/ ...  # runtime state, git-ignored
```

## Quick start

```sh
# once
iwr https://trailbase.io/install.ps1 | iex        # or: curl -sSL https://trailbase.io/install.sh | bash

# every time (or use RUN.BAT)
trail --depot=./traildepot run
```

On first start TrailBase creates `traildepot/`, applies the migration and prints credentials for the
generated admin user:

```text
Created new admin user:
  email: 'admin@localhost'
  password: '<random>'
```

Change them before real use: `trail --depot=./traildepot user change-password admin@localhost <pw>`
and `trail --depot=./traildepot user change-email admin@localhost <email>`.

**`RUN.BAT` differs from a plain `trail run` in two ways.** On first run (no `traildepot/data`
yet) it creates the depot with `trail user change-password`, which applies this directory's
`config.textproto` and migration, creates the admin user **and** sets a fixed password
(`admin@localhost` / `administrator-0ne`) in one step, before any server starts — so nothing races
initialisation. It also binds `127.0.0.1:4000` explicitly, because TrailBase's own default bind is
`[::1]:4000` (IPv6 only): a client at `127.0.0.1` cannot reach that. Later runs just start the
server, so a
password you change yourself is never overwritten; delete `traildepot/data/` for a fresh scaffold
(and the fixed password again).

**If you previously ran the earlier scaffold, delete `traildepot/data/` first.** The table set and
the migration contents changed, and refinery silently *skips* a migration whose checksum no longer
matches, so a stale depot would keep the old schema.

Admin dashboard: <http://localhost:4000/_/admin/>. Record APIs: `/api/records/v1/<name>`. Schema of
any API: `/api/records/v1/<name>/schema` (requires the `SCHEMA` permission, see
[Access control](#access-control)).

## Schema

17 tables, all `STRICT`. No `VIEW`s.

| Group | Tables |
|---|---|
| Enumeration vocabularies | `party_types`, `invoice_types`, `payment_types` |
| Master data | `sections`, `categories`, `companies`, `areas`, `parties`, `order_bookers`, `items`, `expenses` |
| Link tables | `party_companies`, `order_booker_companies` |
| Transactions | `invoices`, `invoices_return_reference`, `transactions`, `payments` |

Every enumeration is an `INTEGER` column with a foreign key into a vocabulary table. The vocabulary
table is the single source of truth for the code -> label mapping, and it is exposed as a record API,
so clients render dropdowns from the database instead of from a hardcoded JavaScript map.

| `party_types` | `invoice_types` | `payment_types` |
|---|---|---|
| `0` customer | `0` purchase | `0` sending |
| `1` supplier | `1` sale | `1` recieving |
| | `2` return | `2` return |
| | `3` difference | |

Codes are 0-based and stable — they are written into rows and read back by the frontend, so they must
never be renumbered. **`0` is a real code**: clients must test for "unset" with an explicit null
check, not with truthiness. `NULL` (not `''` as in PocketBase) is what "no type set" means now.

Reading the label costs one request and is usually free: every foreign key is allow-listed for
`expand`, so `GET /api/records/v1/invoices?expand=type,party,booker` returns the invoice with the
`invoice_types` row inlined as `type: {"id": 1, "data": {"name": "sale", ...}}`. Expanding is opt-in
per request; allow-listing a column costs nothing until a client asks for it. `invoice_maker` points
at TrailBase's hidden `_user` table and therefore cannot be expanded.

Link tables carry a UUIDv7 surrogate key rather than a composite primary key. A composite key would
be marginally smaller, but TrailBase can only expose a table whose primary key is a single `INTEGER`
or UUID column, and clients must be able to add and remove these links through the API. The
`UNIQUE` constraint is what actually prevents duplicates.

## Design decisions

**Enumerations are `INTEGER` + foreign key, not `TEXT` and not JSON.** An INTEGER code is 1–2 bytes
instead of 7–10, compares and indexes as an integer, and — unlike a `CHECK (x IN (...))` list — the
set of legal values and their meaning live in the database as rows, which is what makes the schema
self-defining. A code that does not exist is rejected by the foreign key:

```text
POST /api/records/v1/parties  {"name":"Bad","type":9}   ->  400  db constraint: fk
```

Deleting a vocabulary row that is still referenced is likewise refused, so a code cannot be
orphaned.

**No JSON columns.** `parties.company` and `order_bookers.company` were multi-valued relations in
PocketBase and JSON arrays in the earlier scaffold. JSON cannot be indexed, and TrailBase cannot
filter on JSON membership, which is why the frontend's `company~"<id>"` filter needed rework. They
are now `party_companies` / `order_booker_companies` rows, so the relation is queryable, indexable
and API-manageable in both directions.

**No views.** SQLite `VIEW`s are recomputed on every read, cannot be indexed, and TrailBase can only
expose one when its output columns are all statically typeable (no `WITH`, no `UNION`, no reading
from another view, and the exposed `id` must be a base-table primary key that is also the grouping
key). Under those rules `ledger_journal`, `payments_summary`, `payments_invoices_report` and
`counts_for_row_numbers` could not be exposed at all, and the remaining ones only ever produced
report rows that the frontend filtered and summed again anyway. Report aggregation (invoice totals,
stock and profit per item, ledger balances) is now done by the client from the base tables, against
the indexed columns below. The old SQL is not lost: it is preserved verbatim in
`../full_database_schema.sql` and `../dltbl/views_from_pb/U1776088644__create_views.sql`, and it is
the reference for anyone who later wants it as a WASM handler or a materialised table.

**Indexes follow the access paths, not the old view list.** Invoice detail (`transactions` by
`invoice`), item stock/profit (`transactions` by `item`), invoice and payment lists
(party/booker/type/date combinations), the item picker (`barcode`, `display_id`) and both directions
of the link tables. `barcode` has a partial unique index (`WHERE barcode != ''`) so any number of
items may have no barcode while a duplicate non-empty one is refused.

**`STRICT` tables and UUIDv7 primary keys.** TrailBase refuses to expose non-STRICT tables. Ids are
generated server-side by `uuid_v7()`, are time-sortable (so cursor pagination and index locality are
free) and do not leak row counts. PocketBase's `'r…'` ids are gone.

**Timestamp format is byte-compatible with PocketBase.** `created`/`updated` are `TEXT` in
PocketBase's exact `'%Y-%m-%d %H:%M:%fZ'` format (e.g. `2026-09-24 16:17:32.436Z`) so data exported
from the old backend stays lexicographically comparable with new rows and the frontend's
`created >= '…'` range filters keep working. A 24-byte text timestamp costs more than TrailBase's own
8-byte `UNIXEPOCH()` integers, but at this row count the difference is irrelevant and breaking the
existing filters and export format would not be. `updated` is maintained by an `AFTER UPDATE`
trigger per table (SQLite has no `ON UPDATE`).

**Real foreign keys with deliberate delete behaviour.** Nullable master-data references
(`areas.section`, `items.category`, `parties.area`, `invoices.party`, `invoices.booker`,
`invoices.invoice_maker`, `payments.*`) use `ON DELETE SET NULL`: the child survives, the link is
cleared. Ledger rows (`transactions.invoice`, `transactions.item`) use the default `NO ACTION`, so
deleting an item or invoice that already has transactions is refused instead of silently orphaning
history. Link tables cascade, because a link without an endpoint is garbage.

**Booleans are `0/1` integers.** `STRICT` mode has no boolean type and TrailBase reports `INTEGER`
columns as JSON integers, so `deleted`, `paid` and `completed` come back as `0`/`1`, not
`true`/`false`. Reads are unaffected in JS truthiness terms; writes must send `0` or `1`.

### TrailBase's custom JSON schemas are only usable for object-valued columns

TrailBase has a per-column JSON schema feature: register a schema in the config under `schemas`, bind
it to a column with `CHECK (jsonschema('<name>', <column>))`, and TrailBase validates writes against
it *and* republishes it through `/api/records/v1/<name>/schema` for client codegen and UI rendering.
That is exactly the "define the validation schema and the UI schema in the database" idea, so it was
tried first — and it does not work for scalar columns such as an enum code. Measured against
`trail v0.33.15` on a scratch depot, and re-measured with identical results on `v0.33.22`:

| Shape | Result |
|---|---|
| `type INTEGER CHECK (jsonschema('invoice_type', type))` with `enum: [0,1,2,3]` | `INSERT` fails: `Invalid type` — the validator only accepts TEXT arguments |
| `type INTEGER CHECK (jsonschema('invoice_type', CAST(type AS TEXT)))` | schema exports correctly (`"type":{"$ref":"#/$defs/type"}` with the enum and per-value `title`s), `INSERT` in SQL is validated correctly, but **`POST` via the record API fails with `400 Invalid Parameters`** |
| `type TEXT CHECK (jsonschema('invoice_type_text', type))` with `enum: ["sale",…]` | `POST {"type":"sale"}` fails with `400 Invalid Parameters`; `POST {"type":"\"sale\""}` (pre-serialised JSON text) succeeds and reads back as `"sale"` — a double-encoding wart not worth inheriting |
| `data TEXT CHECK (jsonschema('obj_schema', data))` with an object schema | works end-to-end: `POST {"data":{"a":1}}` -> `200`, `POST {"data":{"a":"x"}}` -> `400` |

So a scalar cannot be both `INTEGER`-coded and JSON-schema-validated through the API. Given that
choice, the enum was kept as an `INTEGER` + foreign key, which delivers the same two goals —
write-time validation with a clear error, and a machine-readable vocabulary — plus it survives
filtering, sorting and `expand`. The JSON schema feature stays available and is the right tool for a
genuinely structured column (a settings blob, `std.FileUpload`, ...) if one is added later; only
object/array-valued `TEXT` columns should be bound to it.

Note also that the binding is checked at startup: a column whose `CHECK` names a schema that is not
registered in `config.textproto` prevents the server from booting
(`JsonSchema(NotFound("..."))`). This config therefore declares no `schemas:` block at all — there is
no column that should be bound to one.

## Access control

Everything requires authentication. Base tables grant `CREATE, READ, UPDATE, DELETE` to authenticated
users; the three vocabulary tables grant `READ, UPDATE` only, so labels can be corrected in place but
a new code cannot be invented through the API — adding a vocabulary entry is a deliberate schema
change, and code-based logic in the frontend would not know what a new code means. Nothing is
world-accessible — PocketBase's collection rules were `""` (i.e. public) for every collection, which
is not a sane default for a POS backend. An unauthenticated request is answered with **403** (no
permission), not 401. To open a specific API (e.g. a read-only kitchen display), add
`acl_world: [READ]` to that `record_apis` entry.

`SCHEMA` **is** granted to authenticated users, so `GET /api/records/v1/<name>/schema` works and
clients can be generated from a running server (`trail --depot=./traildepot schema items`) instead of
from types written by hand. The earlier scaffold withheld it.

Row-level rules are deliberately unused: the business tables have no per-user ownership, so `_REQ_` /
`_ROW_` rules would add complexity without protecting anything. If owner columns are added later,
TrailBase's `create_access_rule` / `read_access_rule` are the hooks.

Auth is TrailBase's own (`/api/auth/v1/login`, `/api/auth/v1/register`, …) and is configured in
`config.textproto`: email required with optional username, 8-character minimum password, no anonymous
or OTP sign-in, 1h access token + 30d refresh token. Emails need SMTP configured under `email {}` —
`secrets/secrets.textproto` is the place for credentials (git-ignored).

## Frontend impact

Everything here is a breaking change against the PocketBase-shaped client:

- **Enum values are integers.** `invoices.type`, `parties.type` and `payments.type` now carry the
  codes above; `''` ("unset") is `NULL`. Never branch on truthiness — `0` is a valid code.
- **`deleted`, `paid`, `completed` are `0`/`1`**, so queries become `?filter[deleted][$eq]=0`.
- **Filters are parameterised**: `?filter[col][$eq]=…`, `$ne/$gt/$gte/$lt/$lte/$is/$like/$re`, with
  `?limit=`/`?cursor=`/`?offset=`/`?count=true`/`?order=` replacing `getFullList`/`getList`, and a
  hard limit of 1024 per request.
- **Writes of relation values must be canonical UUID text**
  (`str(uuid.UUID(bytes=b64decode(id)))`), even though reads return url-safe base64 and URL paths use
  that base64 form. Passing the base64 form back on a write is rejected with `400`.
- **Nested expands do not exist.** `expand` inlines one hop for allow-listed columns; `expand=party`
  gives the party, not `party.area.section`. The frontend already resolves references client-side,
  which remains the supported pattern.
- **The `transaction_view` / `invoice_view` / `items_report` / `ledger_*` / `payments_view` /
  `net_price` / `outstanding_summary` endpoints are gone.** Their arithmetic has to move into the
  client (or a future WASM handler).
- `POST /api/records/v1/invoices` and friends accept a single record or an array, and
  `server.enable_record_transactions: true` allows an invoice plus its `transactions` rows to be
  submitted as one atomic request.

## Integration gotchas

- **Ids**: reads return url-safe base64 (e.g. `AZigAAAAcACAAAAAAAAAAg==`) and URL paths take that same
  form; relation *writes* take canonical UUID text (see above).
- **Inserting rows with explicit ids** (data migration) works, but the id must be exactly 16 bytes and
  version 7. `is_uuid_v7()` accepts a BLOB, a canonical UUID string, or `uuid_parse('…')`; prefer
  `uuid_parse()` in a migration because it validates the text form instead of failing a `CHECK`.
- **`expand`, `excluded_columns` and hidden columns** are validated at startup, so a typo in
  `config.textproto` fails fast rather than at request time.

## Data migration

Export PocketBase JSON/CSV, then insert with the same timestamp format. Ids are regenerated as
UUIDv7, so any externally stored id (printed invoices, QR payloads) needs remapping — or insert with
`uuid_parse()` and keep the ids.

Value translations:

| Old value | New value |
|---|---|
| `parties.type`: `''` / `customer` / `supplier` | `NULL` / `0` / `1` |
| `invoices.type`: `''` / `purchase` / `sale` / `return` / `difference` | `NULL` / `0` / `1` / `2` / `3` |
| `payments.type`: `''` / `sending` / `recieving` / `return` | `NULL` / `0` / `1` / `2` |
| `parties.company`, `order_bookers.company` (JSON arrays of ids) | one `party_companies` / `order_booker_companies` row per id |

## Follow-ups

1. **Wire the frontend to this server**: the `frontend/src/app/api/*` layer and its `useAPI.ts`
   helpers are PocketBase-shaped (`pb.collection(...)`, `filter: 'a = "b" && c = 1'`, `expand`,
   `getFullList`). They need a TrailBase client (`trailbase` npm package) or a thin adapter shim.
2. **Rework the report screens** that depended on the dropped views, and delete the corresponding
   entries from `frontend/src/app/api/pocketbase-types.ts`.
3. **Point the "Company" fields at `companies`**: `items.category` is labelled "Company" in
   `frontend/src/app/api/items.ts`. Decide whether `items` also needs a `company` foreign key.
4. **Consider integer cents instead of `REAL` for money.** `REAL` was kept for PocketBase
   compatibility, but every amount in the old views was wrapped in `printf("%.2f")` to hide binary
   float drift. Moving prices and amounts to `INTEGER` cents is both more correct and faster, and is
   a mechanical change while the database is still empty.
5. **If `frontend-tb/` is restored**, note that it was written against the *earlier* TrailBase
   scaffold — deleted from the working tree but still in git. It uses the older names and shapes
   (`products` instead of `items`, `companies2parties` / `companies2orderbookers` instead of
   `party_companies` / `order_booker_companies`, `partiesEnumType` instead of `party_types`, and
   TEXT enums), so it needs those renamed before it can talk to this schema.
6. **`static/`** is reserved in `traildepot/.gitignore` for a future `--public-dir` bundle; this
   scaffold serves only the APIs and the built-in admin/auth UIs.

## Validation

Verified against a running `trail` server, not by inspection: first on `v0.33.15`, then re-verified on
`v0.33.22` after the binary was upgraded mid-session, with the same results. `traildepot/data/` was
deleted afterwards so the first real run is the documented clean first run.

Schema and startup:

- the migration applies cleanly to an empty depot
  (`Successfully applied migrations for 'main' DB: … 'U1790208000__create_base_tables'`), all 17
  record APIs resolve, `config.textproto` loads, and the server reaches
  `Listening on http://[::1]:4000`;
- `trail --depot=./traildepot schema items` and `… schema invoices` export the JSON schemas
  (`invoices.type` is `{"type":["null","integer"]}`);
- unauthenticated `GET /api/records/v1/items` and `…/party_types/schema` return `403` with the
  shipped authenticated-only config.

Behaviour, exercised over HTTP against a seeded depot:

| Check | Result |
|---|---|
| `GET party_types` | returns `0 customer` / `1 supplier` rows from the database |
| `GET invoices?expand=type,party,booker` | `type` inlined as `{"id":1,"data":{"name":"sale",…}}`, party and booker likewise |
| `GET parties?expand=type` | `type` inlined as `customer` for `0` and `supplier` for `1` |
| `GET transactions?expand=item` | item inlined |
| `GET party_companies?expand=party,company` | both endpoints inlined |
| `GET invoices?filter[type][$eq]=1` / `…=0` | 1 row / 0 rows |
| `POST parties {"type":1}` | `200` + new id |
| `POST parties {"type":9}` | `400 db constraint: fk` |
| `POST party_companies` duplicate pair | `400 db constraint: unique` |
| `POST party_companies` new pair (UUID text) | `200` |
| `POST items {"barcode":""}` twice | both `200` (partial unique index) |
| `POST items {"barcode":"999"}` twice | `200` then `400 db constraint: unique` |
| `GET payments?expand=type,party` | `type` inlined as `recieving`; `paid` returned as `1` |

The JSON-schema finding above was established the same way, on a throw-away depot, by creating one
table per candidate shape and issuing the requests listed in the table; the scratch depots were
removed afterwards.

## Known TrailBase limitations

Determined empirically against `trail v0.33.15`, and re-checked on `v0.33.22`: both limitations behaved
identically, and the releases in between (`v0.33.16`–`v0.33.22`) changed WASM guests, the admin UI,
schema-name parsing and batch error propagation — none of which touch these paths.

- **A view can only be exposed if every output column is statically typeable**, which rules out
  `WITH`, `UNION`, reading from another view, and any grain whose `id` is not a base-table primary
  key that is also the grouping key. This is why there are no views at all; see
  [Design decisions](#design-decisions).
- **Custom JSON schemas only work for object/array-valued `TEXT` columns** through the record API;
  scalars are rejected on write with `400 Invalid Parameters`. See
  [above](#trailbases-custom-json-schemas-are-only-usable-for-object-valued-columns).
- **`expand` is one hop, opt-in and allow-listed**, and cannot reach a hidden (`_`-prefixed) table
  such as `_user`.
- **Filters differ from PocketBase**: `?filter[col][$op]=value` instead of
  `field = "x" && …`, and there is no JSON-membership operator.
