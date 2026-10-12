---
title: Every imported invoice is a draft, so the whole ledger is out of the books and every report renders empty
type: issue
status: resolved
severity: critical
created: 2026-10-02
updated: 2026-10-02
resolved_on: 2026-10-02
tags: [trailbase, reports, invoices, import, lifecycle, draft, defect, production]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[import-from-v1-drops-invoice-maker]]", "[[invoice-lifecycle-draft-open-append-only]]", "[[guest-invoice-lifecycle]]", "[[imported-completed-flag-carries-no-information]]", "[[browser-journey-sweep-2026-10-02]]", "[[persisted-snapshot-can-be-stamped-current-while-empty]]", "[[reports-and-ledgers]]"]
---

# Every imported invoice is a draft, so the whole ledger is out of the books and every report renders empty

**RESOLVED 2026-10-02 — not repaired, removed.** [[no-draft-invoices-published-on-save]] withdrew the
lifecycle: there is no draft, an invoice is published when it is saved and stays editable
afterwards. `invoices.status` and its three triggers are **dropped** (migration
`U1790500000__drop_invoice_lifecycle_status.sql`), the committed-invoice filter is gone from
`app/lib/data.js` and from the report prelude, and the import no longer has a column to get wrong.
The text below is kept as the record of the defect and of how it happened.

**How it was fixed, and what it cost.** The data was not touched: dropping the column is enough,
because the filter that emptied the reports was the only thing reading it. Then the poisoned
snapshot had to be cleared by hand — `DELETE FROM mview; DELETE FROM mview_meta; DELETE FROM
pagecache` — because `?full=1` re-hydrates the empty snapshot instead of rebuilding
([[persisted-snapshot-can-be-stamped-current-while-empty]]). Verified after: all 10 reports and all
4 ledgers return rows, `/invoices` shows 300 rows billed 59,470,279.76, and `/reports/status` reads
`rows: 60260, tables: 15, views: 14` against `rows: 1300, tables: 12, views: 10` before.

**A second defect was found on the way:** `RUN.BAT` synced `runtime\` into the depot on every start
but never `migrations\`, so a new migration written in `trailbase/migrations/` was never applied to
the running depot. That is how a repair migration existed on disk and did nothing. `RUN.BAT` now
mirrors both.

**An earlier claim in this note — that restoring the data left `paymentsbycompany` at "12.2 s warm" —
was wrong, and is corrected here.** That figure was the **cold JSON API**
(`/p/reports/paymentsbycompany/data`, uncapped, 13,862 rows / 5.2 MB, which no browser code uses),
measured while the snapshot was still rebuilding. The page a user opens is **126 ms warm**. The data
coming back did not make the reports slow; a controlled A/B and two SQL changes took a cold load down
20%. See [[paymentsbycompany-performance-2026-10-02]].

**This is the most severe defect found in the new system. It makes the app useless for its actual
job while every page still returns `200` and looks correct.** Found 2026-10-02 by driving the real
browser over the production depot ([[browser-journey-sweep-2026-10-02]]).

## The finding

All **8,927** invoices in the production depot have `invoices.status = 'draft'`. Not one is `'open'`.

```sql
SELECT status, COUNT(*) FROM invoices GROUP BY status;   --  draft -> 8927
SELECT COUNT(*) FROM invoices WHERE status <> 'draft';   --  0
```

Of those, **8,504 have transaction lines** — they are real, settled business documents with items on
them, exactly the case the repair migration was written for. 423 have no lines.

## Why that empties every report

`app/lib/data.js` treats a draft as "not in the books" and drops it at the one place every base
table is read:

- `isCommitted()` (`data.js:114-121`) rejects any invoice with `status === 'draft'`; and
- `readCommittedInvoiceIds()` (`data.js:131-142`) builds the set of committed invoice ids that
  `transactions` and `payments` rows are filtered against.

Because that set comes out empty, the filter then takes **every child row with it**:

| Table | Rows in the database | Rows surviving the committed filter |
|---|---|---|
| `invoices` | 8,927 | **0** |
| `transactions` | 23,413 (all reference an invoice) | **0** |
| `payments` | 26,526 (all reference an invoice, 0 standalone) | **0** |

So every report, which reads those views, has nothing to report. The persisted snapshot records the
result honestly:

```text
mview: paymentsView 2B  invoiceView 2B  transactionView 2B  outstanding 2B
       paymentsInvoicesReport 2B  transactionsReport 2B      (all "[]")
       itemsReport 48659B  itemsDifferenceReport 48659B  refs 265804B   (items-based, fine)
mview counts = {"areas":59,"sections":10,"categories":15,"parties":943,"order_bookers":4,
                "items":207,"purchase_invoices":0,"sale_invoices":0,"return_invoices":0,
                "recieving_payments":0,"sending_payments":0}
```

## Why the rows became drafts

1. `U1790400000__invoice_lifecycle_and_difference_party.sql` added `invoices.status`, and its
   comment asserts: *"The import path sets it explicitly (the column did not exist when it ran)."*
2. `U1790400200__invoice_status_default.sql` added `invoices_status_default_insert`, an
   `AFTER INSERT … WHEN NEW.status IS NULL` trigger that sets `'draft'`.
3. The v1 import **never sets `status`** — `trailbase/runtime/app/plugins/import-from-v1/index.html`
   copies PocketBase records field-for-field and v1 has no such column. Every imported invoice
   therefore arrives with `status = NULL` and the trigger stamps it `'draft'`.

The comment in step 1 is now false, and that is the defect: the lifecycle default and the import
were never reconciled.

There is already a repair migration for exactly this —
`U1790400100__repair_invoice_status_backfill.sql`:

```sql
UPDATE "invoices" SET "status" = 'open' WHERE "status" IS NULL OR "status" NOT IN ('draft', 'open');
UPDATE "invoices" SET "status" = 'open'
 WHERE "status" = 'draft'
   AND EXISTS (SELECT 1 FROM "transactions" t WHERE t."invoice" = "invoices"."id");
```

**It did not take effect on this depot**, because every row's `created`/`updated` is
`2026-10-01 17:57:43Z` — the ledger was re-imported *after* the repair had already run, and the
import drove every row back to `'draft'`.

## What the user sees

| Surface | Result |
|---|---|
| All 10 reports + 4 ledgers | `Rows: 0`, "No data for the selected filters.", every total `0.00` — **for every date range**, including all-time |
| `/invoices` | "Invoices (0)", billed/paid/balance all `0.00`, "No invoices match these filters." |
| Dashboard | Purchase/Sale/Return Invoices and Recieving/Sending Payments all read **0.0**; the six master-data tiles are correct |
| `/payments`, `/inventory`, `/cashmemo/expenses`, all `/management/*` | **Correct and populated** — they read base tables directly, bypassing the filter |
| `/invoices/<id>` | Renders correctly (11 rows, real totals) |

So the app looks alive — the payments grid has 300 rows, the parties grid has 944 — while every
invoice list and every report is silently empty. That is the worst shape this failure can take.

## The workaround that proves the diagnosis

`/invoices` has a **"Show drafts instead"** checkbox (`?drafts=1`, `app/views/invoices/index.html.jinja:26`).
Ticking it immediately produces the real ledger:

| Request | Count | Billed | Paid | Balance |
|---|---|---|---|---|
| `/invoices` | 0 | 0.00 | 0.00 | 0.00 |
| `/invoices?drafts=1` | **300** (page cap) | **59,470,279.76** | **48,564,337.78** | **10,905,941.98** |

The reports have no equivalent escape hatch, which is why they read as "no business data" rather
than "uncommitted documents".

## Fixing it (needs a decision — it writes to the production depot)

Two independent changes; the first restores the app, the second stops it recurring.

1. **Repair the data.** Run the `U1790400100` repair statement against the depot — it is
   conservative: it only promotes a draft that has line items, so a genuine half-entered invoice
   stays a draft. Then clear the poisoned snapshot (`DELETE FROM mview; DELETE FROM mview_meta;`)
   and restart, because `?full=1` does **not** recover it (see
   [[persisted-snapshot-can-be-stamped-current-while-empty]]). Note that clearing the cache is
   necessary but *not sufficient* here: rebuilding recomputes the same empty views while the data is
   still all-draft, so the repair has to come first.
2. **Make the import set `status` explicitly** to `'open'` on create, so the default-draft trigger
   never applies to imported history. The comment in `U1790400000` already claims this is the
   contract; the code does not do it.

A cheaper stopgap is to invert the default — an imported invoice with no `status` becomes `'open'`
and only an explicit `'draft'` is a draft — but that inverts the intent recorded in
[[invoice-lifecycle-draft-open-append-only]], so it is a decision, not a patch.

## Regression against the previous sweep

[[browser-page-and-filter-sweep-2026-10-01]] recorded the payments report at **26,099 rows** for
`from=2020-01-01&to=2030-12-31`; the same request returns **0 rows** today. The re-import at
`2026-10-01 17:57:43Z` is between those two measurements, so this is a regression introduced by
that import, not a long-standing condition.

## Evidence

- `trailbase/runtime/app/lib/data.js:114-154` — `isCommitted()`, `readCommittedInvoiceIds()`,
  `readTables()`.
- `trailbase/traildepot/migrations/main/U1790400200__invoice_status_default.sql:28-33` — the
  `AFTER INSERT` default to `'draft'`.
- `trailbase/traildepot/migrations/main/U1790400100__repair_invoice_status_backfill.sql:13-21` — the
  repair that did not take.
- `trailbase/runtime/app/plugins/import-from-v1/index.html` — no `status` field on the invoice path
  (grep for `status` finds only the UI's own progress field).
- `node:sqlite` against `trailbase/traildepot/data/main.db` — the counts and `mview` payloads above.
- `GET /api/records/v1/invoices?filter[status]=draft&count=true` → `total_count: 8927`.
- `/reports/payments?from=2026-01-01&to=2026-10-02` → `Rows: 0`, all totals `0.00`
  (screenshot `02-report-payments-empty.png` in the sweep folder).