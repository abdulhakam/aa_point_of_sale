---
title: TrailBase backend
type: system
status: experimental
maturity: new
locator: trailbase/
runtime: TrailBase 0.33.22 (trail CLI)
created: 2026-09-26
tags: [pos, backend, trailbase, experimental, sqlite]
related_to: ["[[backend]]", "[[runtime-js-guest-platform]]"]
---

# TrailBase backend

**New / experimental.** `trailbase/` is a [TrailBase](https://trailbase.io) server that
holds the same point-of-sale data the PocketBase backend ([[backend]]) holds today, in
17 `STRICT` SQLite tables exposed as TrailBase record APIs. It is the intended
replacement for PocketBase; nothing in production reads from it yet.

## What it is

- TrailBase is a single Rust binary plus a *depot* directory. The binary is installed
  globally (`iwr https://trailbase.io/install.ps1 | iex`); `trailbase/` contains only
  source: the config and the migration.
- Depot layout:

  ```text
  trailbase/
    README.md                  # the authoritative operator/design write-up
    RUN.BAT                    # start the server + open the admin dashboard
    .gitignore                 # traildepot/data|backups|uploads|secrets|wasm are runtime state
    traildepot/
      config.textproto         # server/auth settings + the record_apis declarations
      migrations/main/U1790208000__create_base_tables.sql   # the whole schema (21 KB)
      data/ backups/ secrets/ uploads/ wasm/               # runtime state, git-ignored
  ```

- Verified against a running server on `trail v0.33.15`, then re-verified on
  `v0.33.22`. `traildepot/data/` was deleted afterwards so the first real run is the
  documented clean first run.

## Schema

17 tables, all `STRICT`, no `VIEW`s.

| Group | Tables |
|---|---|
| Enumeration vocabularies | `party_types`, `invoice_types`, `payment_types` |
| Master data | `sections`, `categories`, `companies`, `areas`, `parties`, `order_bookers`, `items`, `expenses` |
| Link tables | `party_companies`, `order_booker_companies` |
| Transactions | `invoices`, `invoices_return_reference`, `transactions`, `payments` |

The three vocabulary tables are seeded **in the migration** (`INSERT INTO "party_types"
("id","name","description") VALUES (0,'customer','Buys from us'), (1,'supplier','Sells to
us')`), so an empty depot is immediately usable and clients can render dropdowns from the
database instead of a hardcoded JavaScript map. Codes are 0-based, stable, and **`0` is a
real code** — "unset" is `NULL`, not `0`.

| `party_types` | `invoice_types` | `payment_types` |
|---|---|---|
| `0` customer | `0` purchase | `0` sending |
| `1` supplier | `1` sale | `1` recieving |
| | `2` return | `2` return |
| | `3` difference | |

`'recieving'` is deliberately misspelled — the migration comments that PocketBase, the
old views and the ledger logic all used that spelling, and [[data-model]] keeps it.

Indexes follow access paths, not the old PocketBase view list: `transactions` by
`invoice` and by `item`; `invoices` by `party`, `booker`, `type`, `dated`, `created`,
`invoice_maker` and the `(type, created)` pair; `payments` by `party`, `paid`, `type`,
`invoice`, `created` and the `(type, paid)` / `(party, paid, type)` / `payment_date`
combinations; `parties` by `area`/`type`; `areas` by `section`; `items` by `category` and
`display_id`; `expenses` by `date`; plus both directions of the link tables.
`barcode` has a **partial** unique index (`WHERE barcode != ''`) so many items may have no
barcode while a duplicate non-empty one is refused.

Every table carries a `trg_<table>__updated` `AFTER UPDATE` trigger — SQLite has no
`ON UPDATE`, so `updated` is maintained per table. That trigger is also what makes
the guest frontend's change-detection fingerprint work ([[guest-fingerprint-refresh]]).

Full table/column detail: [[data-model]]. Full API surface: [[api-contract-trailbase]].

## `config.textproto`

Declared explicitly because `email`, `server`, `auth` and `jobs` are top-level required
fields:

- `server`: `application_name: "AA Point of Sale"`, `site_url: "http://localhost:4000"`
  (**not** the real public URL yet), `enable_record_transactions: true` (an invoice plus
  its `transactions` rows can be submitted as one atomic request),
  `logs_retention_sec: 604800`, `request_size_limit_bytes: 5242880` (5 MB),
  `auth_ip_rate_limit: 20`.
- `auth`: `user_identifier: REQUIRE_EMAIL`, `password_minimal_length: 8`, no upper/lower
  or digit requirement, **no** anonymous sign-in, **no** OTP sign-in,
  `auth_token_ttl_sec: 3600`, `refresh_token_ttl_sec: 2592000`.
- `jobs {}` keeps the built-in system jobs (`BACKUP`, `HEARTBEAT`, `LOG_CLEANER`,
  `QUERY_OPTIMIZER`, …) at their defaults.
- No `schemas:` block at all — see [[trailbase-scalar-json-schema-columns-rejected]].
- Secrets (SMTP, OAuth) belong in `traildepot/secrets/secrets.textproto`, which is
  git-ignored; nothing secret is in `config.textproto`.

### Access control

Every one of the 17 `record_apis` entries grants `acl_authenticated: [CREATE, READ,
UPDATE, DELETE, SCHEMA]`, except the three vocabulary tables which grant only
`[READ, UPDATE, SCHEMA]` — labels can be corrected in place but a new code cannot be
invented through the API, because adding a vocabulary entry is a deliberate schema change
and code-based logic in a client would not know what a new code means.

`SCHEMA` is granted, so `GET /api/records/v1/<name>/schema` works and a client can be
generated from a running server (`trail --depot=./traildepot schema items`) instead of
from hand-written types. **This is a deliberate difference from the legacy PocketBase
setup**, where collection rules were `""` — i.e. world-accessible. Nothing here is public:
to open one API up (say a read-only kitchen display) add `acl_world: [READ]` to that
entry. See [[trailbase-auth-status-doc-mismatch]] for a documentation inconsistency about
the status code returned to anonymous callers.

`expand` is declared per API for exactly the foreign keys that may be inlined:
`areas.section`, `parties.area,type`, `items.category`, `party_companies.party,company`,
`order_booker_companies.order_booker,company`, `invoices.type,party,booker`,
`invoices_return_reference.original_invoices`, `transactions.invoice,item`,
`payments.invoice,party,paid_to,type`. `invoices.invoice_maker` points at TrailBase's
hidden `_user` table and therefore **cannot** be expanded.

## Running it

```bat
trailbase\RUN.BAT
```

`RUN.BAT` differs from a plain `trail run` in two ways, both load-bearing:

1. On first run (no `traildepot/data` yet) it creates the depot with
   `trail user change-password`, which applies `config.textproto` + the migration, creates
   the admin user **and** sets a fixed password in one step before any server starts — so
   nothing races initialisation. Defaults: `admin@localhost` / `administrator-0ne`.
   Later runs skip straight to starting the server, so a password you change yourself is
   never overwritten.
2. It binds `ADDRESS=127.0.0.1:4000` explicitly, because TrailBase's own default bind is
   `[::1]:4000` (IPv6 only), which a client at `127.0.0.1` cannot reach. See
   [[trailbase-ipv6-loopback-default-bind]].

Override with `set "DEPOT=C:\some\depot"` / `set "ADDRESS=127.0.0.1:4001"` before invoking.

Endpoints: admin dashboard `http://localhost:4000/_/admin/`, record APIs
`/api/records/v1/<name>`, per-API schema `/api/records/v1/<name>/schema`, auth
`/api/auth/v1/{login,refresh,register,...}`.

⚠️ **If you previously ran the earlier scaffold, delete `traildepot/data/` first.** The
table set and migration contents changed, and refinery silently *skips* a migration whose
checksum no longer matches — a stale depot would keep the old schema. See
[[trailbase-stale-depot-skips-migration]].

## What it deliberately does not do

- **No views.** SQLite `VIEW`s cannot be exposed by TrailBase unless every output column
  is statically typeable, so `ledger_journal`, `payments_summary`,
  `payments_invoices_report` and `counts_for_row_numbers` could not be exposed at all, and
  the rest only ever produced rows the client re-filtered. Report aggregation moved to the
  client — see [[trailbase-drop-sql-views]] and [[reports-and-ledgers]].
- **No JSON columns.** `parties.company` / `order_bookers.company` are link tables now —
  see [[trailbase-link-tables-over-json]].
- **No per-row access rules.** The business tables have no per-user ownership, so `_REQ_`
  / `_ROW_` rules would add complexity without protecting anything.
- **No exposed reports or aggregates.** TrailBase holds data and vocabularies only.

## Known limitations (measured, not assumed)

- A view can only be exposed when every output column is statically typeable.
- Custom JSON schemas only work for object/array-valued `TEXT` columns through the record
  API; scalars are rejected on write with `400 Invalid Parameters`.
- `expand` is one hop, opt-in and allow-listed, and cannot reach a hidden (`_`-prefixed)
  table such as `_user`.
- Filters differ from PocketBase: `?filter[col][$op]=value`, and there is no
  JSON-membership operator.
- `DELETE` answers with a plain-text body (`deleted`), not JSON — clients must tolerate
  that. See [[trailbase-delete-returns-plain-text]].

## Source of truth for operators

`trailbase/README.md` in the repository is the long-form version of this note: it carries
the validation table, the JSON-schema experiment results, the value-translation table for
data migration, and the follow-up list. This note is the orientation; that file is the
evidence.
