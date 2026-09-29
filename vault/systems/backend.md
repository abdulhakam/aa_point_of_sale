---
title: backend (PocketBase)
type: system
status: production
maturity: legacy
locator: backend/
runtime: PocketBase 0.22.55 (pocketbase.exe)
created: 2026-09-26
tags: [pos, backend, pocketbase, legacy, production]
related_to: ["[[frontend]]", "[[trailbase]]"]
---

# backend (PocketBase)

**Legacy / production.** `backend/` is the PocketBase server that currently serves the live
point-of-sale data. It is the system [[trailbase]] is being built to replace, and the
system [[frontend]] (the production UI) talks to.

Nothing in this directory is experimental: changing it changes production behaviour.

## What is in the directory

| Entry | What it is |
|---|---|
| `pocketbase.exe` | PocketBase **0.22.55**, 44,842,496 bytes, committed to git |
| `pb_migrations/` | 23 JavaScript migrations — collections and **SQL views** |
| `pb_data/` | the live development/admin data directory (git-ignored) |
| `pb_data_bench/` | a benchmark data directory (git-ignored) |
| `p_data/` | another data directory — ⚠️ **committed to git** (see [[pocketbase-data-dirs-in-git]]) |
| `DEV.BAT` | PocketBase `serve --dev` + `npm run dev` in `../frontend` |
| `RUN NEXTJS.BAT` | PocketBase `serve` + `npm run start` (production Next server) + open `:3000` |
| `RUN SERVE.BAT` | PocketBase `serve` + `npm run serve` (static `out/` via http-server on `:3000`) |

PocketBase listens on `127.0.0.1:8090`, which is what `frontend/.env.local`'s
`NEXT_PUBLIC_PB_URL` points at.

## Migrations: collections **and** views

Unlike the TrailBase side — which deliberately has no views at all — the PocketBase backend
expresses report arithmetic as SQL views, applied by migrations named
`<unix-epoch>_<created|updated>_<collection>.js`:

| Migration | Object |
|---|---|
| `1714379020`, `1714379034`, `1714380740` | `payments` collection changes |
| `1714380770` | `payments_view` |
| `1714399354` | `ledger_journal` |
| `1714479896` | `items_report` |
| `1714479961` | `invoice_view`, `invoices`, `transaction_view`, `transactions_report` |
| `1714485504`, `1714485692` | `items_difference_report` |
| `1714486725` … `1714487441` (6) | `ledger_booker`, iterated to its final query |
| `1743350400` | `outstanding_summary` |
| `1743352000` | `outstanding_summary` threshold |
| `1789890189` | `add_performance_indexes` |
| `1789890300` | `ledger_party` as a **window function** query |
| `1789890310` | `payments_summary` — pre-aggregated payment totals |

The last three are the performance programme (POS-0013 / POS-0017 and neighbours), and
their comments carry the reasoning. `1789890310_payments_summary_view.js` says it moves the
`SUM` the client used to do in `PaymentsView.tsx`'s `calculator()` into SQL: rows are
grouped by day + filter dimensions, so a filtered report reads dozens of summary rows
instead of tens of thousands of raw ones. Clients keep their normal filter but on `day`
(and the dimension columns) instead of the raw `created` timestamp, then sum eight category
columns over the returned groups:

| Column | Meaning |
|---|---|
| `sending` | unpaid `sending` amounts |
| `sent` | paid `sending` amounts |
| `recieving` | unpaid `recieving` amounts |
| `recieved` | paid `recieving` amounts |
| `sending_returns` | `return` amounts whose party is not a customer |
| `recieving_returns` | `return` amounts whose party is a customer |
| `invoice_total` | unpaid amounts (all types) |
| `total_paid` | paid amounts (all types) |

`total_sending` / `total_recieving` / `total` are derived from these on the client — kept
in JS because every column in that view must be a single function call, which is all
PocketBase's view parser accepts.

## The views that exist here and not on the TrailBase side

`payments_view`, `payments_summary`, `payments_invoices_report`, `ledger_journal`,
`ledger_party`, `ledger_booker`, `ledger_area`, `invoice_view`, `transaction_view`,
`transactions_report`, `items_report`, `items_difference_report`, `net_price`,
`outstanding_summary`, `counts_for_row_numbers`.

Every one of them appears as a *record type* in `frontend/src/app/api/pocketbase-types.ts`
(`PaymentsViewRecord`, `InvoiceViewRecord`, `LedgerPartyRecord`, …), which is why removing
the views on the TrailBase side is a frontend-visible change rather than an internal one.
Their arithmetic is reimplemented in `trailbase/runtime/app/compute/views.js` and
`compute/reports.js`, documented in [[reports-and-ledgers]], and preserved verbatim as SQL
in the parent-directory artefacts described in [[stale-schema-sql-paths]].

## Access control (as it stands)

The PocketBase collection API rules were `""` for every collection — i.e.
world-accessible. [[trailbase]] deliberately does not inherit that: everything there
requires authentication. See [[keep-legacy-stack-in-production]] for why the legacy rules
have not simply been tightened in place.

## Relationship to the new backend

| Aspect | `backend/` (PocketBase) | `trailbase/` (TrailBase) |
|---|---|---|
| Engine | PocketBase 0.22.55 | TrailBase / SQLite, `STRICT` |
| Enumerations | text (`sale`, `customer`, `sending`) | `INTEGER` FK into a vocabulary table |
| "unset" enum | `''` | `NULL` |
| Booleans | true/false | `0`/`1` |
| Multi-valued relations | JSON arrays (`parties.company`) | link tables |
| Report arithmetic | SQL views | JavaScript, in [[runtime-js-guest-platform]] |
| Ids | `'r…'` 15-char | UUIDv7 |
| Timestamps | `'%Y-%m-%d %H:%M:%fZ'` | same, deliberately |
| Aggregation | `GROUP BY` in views | client-side |
| Access | world-readable | authenticated only |

The timestamp format is the one thing kept **byte-compatible** on purpose, so exported data
stays lexicographically comparable and the legacy frontend's `created >= '…'` range filters
keep working. See [[trailbase-pocketbase-data-compatibility]] and [[data-model]].

## Data migration out of here

`trailbase/README.md` documents the route: export PocketBase JSON/CSV, then insert with the
same timestamp format. Ids are regenerated as UUIDv7, so any externally stored id (printed
invoices, QR payloads) needs remapping — or insert with `uuid_parse()` and keep them.

The value translations that must be applied:

| Old value | New value |
|---|---|
| `parties.type`: `''` / `customer` / `supplier` | `NULL` / `0` / `1` |
| `invoices.type`: `''` / `purchase` / `sale` / `return` / `difference` | `NULL` / `0` / `1` / `2` / `3` |
| `payments.type`: `''` / `sending` / `recieving` / `return` | `NULL` / `0` / `1` / `2` |
| `parties.company`, `order_bookers.company` (JSON arrays of ids) | one `party_companies` / `order_booker_companies` row per id |

A working implementation of exactly this translation exists as the `import-from-v1` plugin,
ported to the guest at `trailbase/runtime/app/plugins/import-from-v1/` (the Node copy at
`frontend-ssr/plugins/import-from-v1/` was deleted with that app on 2026-09-27) — but it still
drops `invoices.invoice_maker` (see [[import-from-v1-drops-invoice-maker]]) and is unverified.
Verifying it is [[pos-0029-rebuild-v1-import-on-guest]], feeding
[[pos-0027-migrate-production-data-to-trailbase]].
