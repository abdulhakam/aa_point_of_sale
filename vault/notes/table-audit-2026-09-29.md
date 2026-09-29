---
title: Table audit 2026-09-29 — no base table is dead, but three are worth acting on
type: note
status: active
created: 2026-09-29
system: new
tags: [schema, audit, tables, cache, migration, cleanup]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[data-model]]", "[[categories-is-the-company-list]]", "[[component-split-and-sql-materialised-tables]]", "[[document-model-bench-2026-09-29]]", "[[invoice-document-parity-2026-09-29]]", "[[import-from-v1-drops-invoice-maker]]", "[[guest-frontend-feature-parity-gaps]]", "[[report-enum-translation-2026-09-29]]"]
---

# Table audit 2026-09-29 — no base table is dead, but three are worth acting on

Audit of the live depot (`traildepot/data/main.db`, 27,277 pages of 4,096 = **106.6 MB**) against
`trailbase/runtime/` and `config.textproto`. The question asked was which tables are no longer needed.

## Answer: no base table is unused

All **17 base tables** are simultaneously (a) referenced by runtime code, (b) declared as a record
API in `config.textproto`, and (c) tied into the foreign-key graph. None can be dropped as they
stand — though see item 3 for the one that becomes redundant under a small data migration.

```
areas(59) categories(15) companies(15) expenses(88) invoice_types(4) invoices(8927)
invoices_return_reference(54) items(207) order_booker_companies(5) order_bookers(4)
parties(942) party_companies(13) party_types(2) payment_types(3) payments(26526)
sections(10) transactions(23413)
```

The three zero-row invoice helpers — `invoice_create_key`, `invoice_line_op`, `invoice_lock` — are
**live**, not vestigial. They are the idempotency and lease tables used by `invoicing.js`
(`addLine` de-dupes on `invoice_line_op`; `invoice_lock` is the create lease). They are empty only
because no invoice has yet been created on the new side.

### A method note, because the first pass was wrong

A per-line heuristic that only looked for SQL keywords on lines naming the table reported
`companies`, `expenses`, `mview`, `party_companies`, `invoice_types`, `party_types` and
`payment_types` as **"no references found"**. All seven are referenced. The references are indirect:
a table name is bound to a constant (`const MVIEW_TABLE = "mview"` in `app/lib/reports.js:108`), used
as an object key in the view-dependency maps (`expenses:` in `compute/views.js:524`), or passed
through `base.<table>`. A keyword scan that skips those shapes produces confident false negatives,
and would have justified deleting live tables.

## The three that are actually actionable

### 1. `mview` + `mview_meta` — 82.2 MB, 77% of the database

Live today: it is the report path. But it is **86× the size of the data it derives from**.

| | |
|---|---|
| all 17 base tables, actual data | **~950 KB** (payments 676 KB, invoices 260 KB, rest ~15 KB) |
| `mview` JSON payload | **82.2 MB** |
| whole database | 106.6 MB |

| view | MB |
|---|---|
| paymentsInvoicesReport | 16.66 |
| transactionsReport | 13.43 |
| paymentsView | 13.41 |
| transactionView | 11.41 |
| ledgerParty | 8.54 |
| ledgerBooker | 8.11 |
| ledgerJournal | 6.25 |
| invoiceView | 3.75 |

This is the table the [[component-split-and-sql-materialised-tables]] work retires. The measured
replacement is **11.0 MB of indexed `STORED`-generated-column tables** for 8,927 invoice documents
([[invoice-document-parity-2026-09-29]]), so landing it would remove roughly **71 MB** and the
11.9 s hydration cost measured in [[browser-benchmark-2026-09-29]]. Not removable *now*; removable
*then*, and it is the single biggest storage item in the system.

### 2. `pagecache` — a cache, so safe to drop at will

34 rows, currently ~0 KB. Pure derived state, written and read only by `route.ts`. No unique
information. Free insurance either way; not worth a migration on its own.

### 3. `companies` vs `categories` — **the opposite of what this note first said**

**CORRECTION 2026-09-29, same day.** An earlier revision of this note called `companies` "a
duplicate the migration invented, and it is not in the source". That was wrong in substance, and
[[categories-is-the-company-list]] has the full evidence.

PocketBase indeed has no `companies` collection and no `companies` view. But the **company
dimension is real and pre-existing in the legacy system** — it is simply *stored* in a collection
named `categories`. The legacy nav entry is `{ text: "companies", path: "management/categories" }`,
`paymentsbycompany/page.jsx:111` reads `categories` into a variable called `companies`, the stock
and difference report filters are labelled **"Company"**, and `CreateSupplier.tsx:36` creates a
supplier by inserting into `categories`. The 15 names are business names — BAKE PARLOR, ZEESHAN
PAPAR, NATIONAL RECIPIE — not product categories.

So the migration did the **right** thing promoting them to a separate `companies` table: legacy
genuinely conflates two concepts in one collection. **The redundant table is `categories`.**

The data shows items resolve into the wrong one of the pair:

```
items.category                  -> categories     206 of 207 items
party_companies.company         -> companies      13 of 13
order_booker_companies.company  -> companies       5 of 5
```

Same 15 names, different ids, no link. The guest already labels them differently —
`app/lib/entities.js:36` calls the `categories` API **"Item Companies"**, `:45` calls the other
**"Companies"**. Retiring `categories` means repointing `items.category` at `companies`, not
dropping rows. That is [[tb-0014-point-company-fields-at-companies]], now with the evidence that
resolves it.

## One read-only gap (already recorded, re-confirmed)

`invoices_return_reference` (54 rows) is exposed as a record API and read by `payments_view.sql` and
`compute/views.js`, but **no writer exists in the runtime**. It is populated only by the import. It
is not a removal candidate — it is a correctness gap, and
[[guest-frontend-feature-parity-gaps]] carries the detail.

## TrailBase internals — not ours

`_user`, `_user_avatar`, `_file_deletions`, `_schema_history`, `_wasm_shared_preferences` are
created and used by TrailBase itself. `_user_avatar` and `_wasm_shared_preferences` are empty
infrastructure. Not candidates.

## Related

- [[data-model]] — the canonical table list and relationships.
- [[component-split-and-sql-materialised-tables]] — what retires `mview`.
