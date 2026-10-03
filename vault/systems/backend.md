---
title: backend (PocketBase)
type: system
status: frozen
maturity: legacy
locator: legacyforparity/backend/
runtime: PocketBase 0.22.55 (pocketbase.exe)
created: 2026-09-26
updated: 2026-10-03
tags: [pos, backend, pocketbase, legacy, production]
related_to: ["[[frontend]]", "[[trailbase]]", "[[cutover-is-guest-only]]"]
---

# backend (PocketBase)

> **CORRECTED 2026-10-03.** The `locator` was wrong: `backend/` was deleted from git on 2026-09-29
> (`c167d311`) and the directory is now `legacyforparity/backend/` — untracked and git-ignored.
> `status: production` was **right** and is restored: this is the server the shop runs on.
>
> The part that was wrong is the *open* of the old body — "Nothing in this directory is experimental:
> changing it changes production behaviour." The real position is sharper than that: it is **frozen**,
> so changing it changes nothing, because there is nothing to change and no copy if you break it.
> See [[cutover-is-guest-only]].
>
> ⚠️ An earlier correction in this session read "no source" as "out of use" and called this an oracle
> "used solely to answer parity questions". That was wrong; `RUN MINI.BAT` starts it.

**Legacy / production, and frozen.** `legacyforparity/backend/` is the PocketBase server **the shop
runs on today** — `legacyforparity/RUN MINI.BAT` starts it before the UI. It is the system
[[trailbase]] is replacing, and the system the legacy UI ([[frontend]]) talks to.

Being **run** is not the same as being **maintainable**, and the difference is the risk: it can be run,
which is why it is also the oracle that answers "what did the old screen compute?"
([[reports-and-ledgers]]). It cannot be **built, edited or repointed**. A defect in the running POS
therefore cannot be fixed in the running POS.

## What is in the directory

| Entry | What it is |
|---|---|
| `pocketbase.exe` | PocketBase **0.22.55**, 44,842,496 bytes |
| `pb_migrations/` | 23 JavaScript migrations — collections and **SQL views** |
| `pb_data/` | a data directory, 17,960,960-byte `data.db` — ⚠️ **untracked, no git copy** |
| `p_data/` | another data directory — ⚠️ **was tracked in git history**, now untracked; see [[pocketbase-data-dirs-in-git]] |
| `DEV.BAT` | PocketBase `serve --dev` + `npm run dev` in `../frontend` — ⚠️ **broken**: `../frontend` no longer exists |
| `RUN NEXTJS.BAT` | PocketBase `serve` + `npm run start` — ⚠️ **broken**: no `frontend/` and no `package.json` |
| `RUN SERVE.BAT` | PocketBase `serve` + `npm run serve` — ⚠️ **broken**, same reason |
| `TAURI BUILD.BAT`, `TAURI DEV.BAT`, `TAURI RUN.BAT` | Tauri desktop wrappers — also reference the missing `frontend/` |

⚠️ **Every script here is dead.** They all invoke `npm` inside `../frontend`, which was deleted. Only
`pocketbase.exe serve` against an existing data directory still works, and only for parity
comparison.

PocketBase listens on `127.0.0.1:8090`, which is what the deleted `frontend/.env.local`'s
`NEXT_PUBLIC_PB_URL` pointed at.

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

Every one of them appeared as a *record type* in `frontend/src/app/api/pocketbase-types.ts`
(`PaymentsViewRecord`, `InvoiceViewRecord`, `LedgerPartyRecord`, …) — ⚠️ **that file was deleted from
git on 2026-09-29** and is not recoverable from the working tree, only from history. That is why
removing the views on the TrailBase side was a frontend-visible change, and it is also why
[[tb-0013-rework-report-screens-without-views]] is now blocked rather than merely unfinished. Their
arithmetic is reimplemented in `trailbase/runtime/app/compute/views.js` and
`compute/reports.js`, documented in [[reports-and-ledgers]], and preserved verbatim as SQL
in the parent-directory artefacts described in [[stale-schema-sql-paths]].

## Access control (as it stands)

The PocketBase collection API rules were `""` for every collection — i.e.
world-accessible. [[trailbase]] deliberately does not inherit that: everything there
requires authentication. The reason the legacy rules were never tightened in place is recorded in
[[keep-legacy-stack-in-production]] — **superseded** by [[cutover-is-guest-only]], since the legacy
server is now frozen and no longer reachable from any application.

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
