---
title: TrailBase API contract
type: reference
status: active
system: new
created: 2026-09-26
tags: [pos, api, trailbase, rest, contract, gotchas]
related_to: ["[[trailbase]]", "[[data-model]]", "[[runtime-js-guest-platform]]"]
---

# TrailBase API contract

Everything a client needs to know about talking to [[trailbase]], as verified against a running
server on `trail v0.33.15` and re-verified on `v0.33.22`. The client-side reference the Node
frontend used was `frontend-ssr/src/lib/trailbase.js` (151 lines, removed 2026-09-27, whose header
comment listed these same facts); the guest frontend reads the depot's SQLite directly and has no
record-API client ([[runtime-js-guest-platform]]).

## Endpoint surface

| Endpoint | Purpose |
|---|---|
| `GET/POST/PATCH/DELETE /api/records/v1/<name>` | CRUD on the 17 declared record APIs |
| `GET /api/records/v1/<name>/schema` | the JSON schema (requires the `SCHEMA` permission — granted) |
| `POST /api/auth/v1/login` | `{email, password}` → `{auth_token, refresh_token, csrf_token}` |
| `POST /api/auth/v1/refresh` | `{refresh_token}` → a fresh pair |
| `/api/auth/v1/register` | TrailBase-managed user creation |
| `/_/admin/` | the built-in admin dashboard |

`GET /api/records/v1/<name>/schema` matters beyond documentation: `trail
--depot=./traildepot schema items` exports the same schema from the CLI, so a client's types can
be generated from the running server instead of written by hand. The earlier scaffold withheld
the `SCHEMA` permission; this one grants it.

## Authentication

- Login returns `auth_token` (1 h) + `refresh_token` (30 d), configured in
  `trailbase/config.textproto`.
- **`Authorization: Bearer <auth_token>` is sufficient for reads *and* writes** — no CSRF header
  is needed, even though `csrf_token` is returned.
- **An unauthenticated request is answered `403`** (no permission), not `401`. ⚠️
  `config.textproto`'s own comment says "an unauthenticated request gets 401", which contradicts
  the measured behaviour. See [[trailbase-auth-status-doc-mismatch]].
- The API surface is closed by default: every one of the 17 APIs requires authentication. To
  expose one deliberately, add `acl_world: [READ]` to that `record_apis` entry.
- `_user` is provided by TrailBase and is not declared as a record API; manage staff through the
  auth endpoints.

## Listing and pagination

```http
GET /api/records/v1/items?limit=100&cursor=<cursor>&order=+name&count=true
```

Response:

```json
{ "records": [ … ], "cursor": "…", "total_count": 42 }
```

- `limit` is capped at **1024** per request; `offset` also exists as an alternative to `cursor`.
- `count=true` adds `total_count`. The client's `count()` helper uses `limit=1&count=true`.
- `order` takes `+col` / `-col`.
- The client's `listAll` loops on the response `cursor` until a page comes back shorter than
  `limit`, the cursor stops moving, or a `max` guard (200 000 rows) trips.

## Filtering

Parameterised, entirely unlike PocketBase's filter string:

```http
GET /api/records/v1/invoices?filter[type][$eq]=1
GET /api/records/v1/invoices?filter[deleted][$eq]=0
GET /api/records/v1/parties?filter[name][$like]=ali
```

Operators: `$eq $ne $gt $gte $lt $lte $is $like $re`, plus the `in` form. The former Node client's
`buildFilter` (in `frontend-ssr/src/lib/trailbase.js`, removed 2026-09-27) turned

```js
{ type: 1, deleted: 0, created: { $gte: "2026-09-01 00:00:00.000Z" } }
```

into `filter[type][$eq]=1`, `filter[deleted][$eq]=0`, `filter[created][$gte]=…`, and treats a
bare scalar as `$eq`. Empty/`null`/`undefined` values are dropped rather than sent.

What is **different from PocketBase**:

- No `field = "x" && other = 1` filter strings.
- No JSON-membership operator — which is why multi-valued relations became link tables
  ([[trailbase-link-tables-over-json]]).
- Booleans are `0`/`1`, so `?filter[deleted][$eq]=0`, never `= false`.

## `expand` — one hop, opt-in, allow-listed

```http
GET /api/records/v1/invoices?expand=type,party,booker
```

inlines the `invoice_types` row as `type: {"id":1,"data":{"name":"sale",…}}`. Rules:

- **One hop only.** `expand=party` gives the party, not `party.area.section`. There is no nested
  expand.
- **Allow-listed at startup** per API in `config.textproto`. A typo there fails fast at boot
  rather than at request time — same for `excluded_columns`.
- Costs nothing until a client asks, so allow-listing every FK is free.
- **Cannot reach a hidden (`_`-prefixed) table**, so `invoices.invoice_maker` cannot be expanded.
- The guest frontend therefore resolves references client-side from a
  `refs` map instead — the supported pattern.

Allow-listed expansions, per `config.textproto`:

| API | `expand` |
|---|---|
| `areas` | `section` |
| `parties` | `area`, `type` |
| `items` | `category` |
| `party_companies` | `party`, `company` |
| `order_booker_companies` | `order_booker`, `company` |
| `invoices` | `type`, `party`, `booker` |
| `invoices_return_reference` | `original_invoices` |
| `transactions` | `invoice`, `item` |
| `payments` | `invoice`, `party`, `paid_to`, `type` |

`expand` typically needs to be combined with filtering on the FK itself
(`?filter[party][$eq]=<id>`) — filtering on an expanded field is not supported.

## Ids — the asymmetry that bites

| Operation | Form |
|---|---|
| **Reads** return | url-safe base64, e.g. `AZigAAAAcACAAAAAAAAAAg==` |
| **URL paths** take | that same base64 form |
| **Relation writes** take | **canonical UUID text**, e.g. `str(uuid.UUID(bytes=b64decode(id)))` |

So passing the base64 form back on a write is rejected with `400`. This is the single most
common integration mistake. The former Node client's `relId` helper
(`frontend-ssr/src/lib/uuid.js`, removed 2026-09-27) normalised either form on the read side; the
Node-only id helper now lives at `trailbase/tools/uuid.mjs`.

Also:

- Inserting rows with explicit ids (data migration) works, but the id must be exactly 16 bytes
  and **version 7**. `is_uuid_v7()` accepts a BLOB, a canonical UUID string, or
  `uuid_parse('…')`. Prefer `uuid_parse()` in a migration, because it validates the text form
  instead of failing a `CHECK`.
- UUIDv7 is time-sortable, which is what makes cursor pagination cheap and lets
  [[runtime-js-guest-platform]] use "newest id" as part of its change fingerprint.

## Writes

- `POST /api/records/v1/<name>` accepts **a single record or an array of records**, and answers
  with an `ids` array — hence the client's `create()` returning `res?.ids?.[0]`.
- `PATCH /api/records/v1/<name>/<id>` updates.
- With `server.enable_record_transactions: true`, an invoice **plus its `transactions` rows** can
  be submitted as one atomic request. That is the intended shape for invoice entry.
- **`DELETE` answers with a plain-text body (`deleted`), not JSON.** A client that blindly
  `JSON.parse`s the response will throw. The former Node client's `request()` (in
  `frontend-ssr/src/lib/trailbase.js`, removed 2026-09-27) caught the parse failure and returned the
  raw string, with a comment saying exactly why. See
  [[trailbase-delete-returns-plain-text]].
- Booleans must be sent as `0` / `1` (`INTEGER`), because `STRICT` mode has no boolean type.
- FK violations surface as `400 db constraint: fk`; unique violations as
  `400 db constraint: unique`. Both are useful, stable error strings to assert on.

## Verified request/response behaviour

The checks below were exercised over HTTP against a seeded depot (the full table is in
`trailbase/README.md`):

| Check | Result |
|---|---|
| `GET party_types` | returns the `0 customer` / `1 supplier` rows from the database |
| `GET invoices?expand=type,party,booker` | `type` inlined as `{"id":1,"data":{"name":"sale",…}}`; party and booker likewise |
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
| unauthenticated `GET items`, `GET party_types/schema` | `403` |

## Client implementation notes (the former `frontend-ssr/src/lib/trailbase.js`, removed 2026-09-27)

- `TrailBaseError` carried `status`, `body` and `path`; `trailbaseErrorHandler` in the ported
  `trailbase/runtime/app/lib/http.js` turns it into a rendered page rather than a stack trace.
- `MAX_LIMIT = 1024` matches the server cap.
- `listPage`, `listAll`, `count`, `getOne`, `create`, `update`, `remove`, `schema`, `login`,
  `refresh` — deliberately no caching, no retries, no model layer. TrailBase is used for CRUD and
  auth only; everything derived lives in the app.

## Upstream limitations that shape the contract

- Views can only be exposed when every output column is statically typeable — so there are no
  report APIs at all ([[trailbase-view-type-inference-limits]]).
- Custom JSON schemas work only for object/array-valued `TEXT` columns via the record API
  ([[trailbase-scalar-json-schema-columns-rejected]]).

## Related

- [[data-model]] — the tables and columns behind each API.
- [[trailbase]] — config, access control and the depot lifecycle.
- [[runtime-js-guest-platform]] — the guest, which reads the depot's SQLite directly rather than
  through a record-API client.
