---
title: Invoice document — exact money parity with legacy, and the measurements the shipped design rests on
type: note
status: active
created: 2026-09-29
system: new
updated: 2026-09-29
tags: [invoices, document-model, json, parity, triggers, materialised, refresh, benchmark]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[document-model-bench-2026-09-29]]", "[[component-split-and-sql-materialised-tables]]", "[[tb-0021-invoices-cashmemos-printing]]", "[[tb-0027-materialised-invoice-documents]]", "[[invoice-document-write-through-and-rebuild]]", "[[invoice-doc-sync]]", "[[money-is-2dp-everywhere]]", "[[report-sql-filters-on-text-enums-returns-nothing]]", "[[api-contract-trailbase]]"]
---

# Invoice document — exact money parity with legacy, and the measurements the shipped design rests on

Built and measured by `python trailbase/tools/invoice-document-parity.py`. It copies
`traildepot/data/main.db` to a scratch file (**the live depot is never written**), builds one
self-contained JSON document per invoice with `STORED` generated columns, and diffs every money figure
against PocketBase.

> **SHIPPED (2026-09-29).** The prototype in this note is now the real thing. The build statement
> lives in `U1790300500__invoice_document_sync.sql` and is maintained by 14 triggers; this harness
> reads its SQL out of the migration rather than restating it, and section 2 below now installs the
> migration's own triggers instead of deriving one. The decisions and the full measurement set are
> in [[invoice-document-write-through-and-rebuild]]; the shipped checks are in [[invoice-doc-sync]].
> Read those two for the current state — this note keeps the evidence and the reasoning.
>
> Two numbers in the body are **superseded** and are marked where they appear: the "~1.9 s
> refresh" and the "0.89 ms" per-line figure were measured on an idle machine before the
> document carried names, and the ranges that replace them are in the decision note.

## 1. Money parity: exact

Join key is `(invoice type code, invoiceNo)` — verified unique in **both** databases, no key
present on only one side.

| compared | rows | mismatches |
|---|---|---|
| `invoice_view.total` | 8,935 | **0** |
| `invoice_view.unrounded_total` | 8,935 | **0** |
| `invoice_view.final_total` | 8,935 | **0** |
| `transaction_view.total` (per line) | 23,413 | **0** — worst delta `0.000e+00` |
| `payments_view.amount` (COALESCE rule) | 26,526 | **0** |

(8,935 rather than the 8,927 recorded when this was first run: the invoice-entry slice has added
test invoices since, in the guest depot. The parity is over every key present on both sides.)

Lines are compared **order-independently** (sort both sides' multisets). Guest ids are `uuid_v7` and
legacy ids are 15-char text, so there is no line-level join key, and the document preserves insertion
order while `transaction_view` does not — pairing by position compares unrelated lines and produced a
false 12,432/23,413 "mismatch" that was purely an ordering artefact.

## 2. Trigger maintenance: works, and it is the point

**CORRECTION 2026-09-29, later the same day.** This section originally recorded **2.5 ms** per
line insert. That figure came from a *narrow* trigger that used `json_set` to patch `total`, `lines`
and `line_count` on the existing document. Rebuilding the **whole** document — the correct
behaviour, and what the prototype should do — costs **0.89 ms** for the worst-case 36-line invoice.
The narrow figure understated the work and the number to use from here on is the 0.89 ms one.

Measured, worst-case invoice in the depot (36 lines), all figures best of 5:

> **Superseded.** These are prototype numbers for a document without names, on an idle machine.
> The shipped ranges — 0.9–2.9 ms for a line insert, 0.1–2.0 ms for a line update, and the fact
> that the cost scales with the size of the invoice — are in
> [[invoice-document-write-through-and-rebuild]]. The 237 ms figure, the point of the table, is
> unchanged.

| | ms |
|---|---|
| header money only, one invoice | 0.02 |
| **full document rebuild, correctly scoped** | **0.89** |
| same rebuild, incorrectly scoped | 237.00 |
| `UPDATE inv_doc SET doc = doc` (STORED columns recomputed) | 0.10 |
| the same UPDATE on a table with no generated columns | 0.01 |

The `STORED` generated columns cost **0.09 ms** and are not a factor. The derived total is written
**in the same transaction as the line**, so no reader can ever see an invoice whose stored total
disagrees with its own lines. This is the F4 "totals race" arriving pre-solved.

Entering a 36-line invoice line by line, end to end:

| lines | total | per line |
|---|---|---|
| 5 | 3.7 ms | 0.74 ms |
| 20 | 17.2 ms | 0.86 ms |
| 36 | 45.2 ms | 1.26 ms |
| 100 | 156.8 ms | 1.57 ms |

A statement-level trigger measures the same (33.3 ms for 36 lines), because inserting lines
individually is 36 separate statements either way. Row-level is the simpler choice and also covers
the case where lines arrive from different statements.

### The scoping hazard, which cost 266× and is worth a guard

The build SQL is correct for a **full rebuild** and badly wrong for a **trigger**: it aggregates the
whole depot. A trigger built from it verbatim re-aggregated all 23,413 transactions and all 26,526
payments on **every single line** — 237 ms per line, 8.7 s for a 36-line invoice, which would have
made the till unusable.

Scoping it to the affected invoice fixes it. The trap is that **three separate scans** need scoping,
and `payments` has no `deleted` column, so two of those `FROM` clauses carry no `WHERE` to extend:

```sql
FROM "transactions" t WHERE t."deleted" = 0            AND t."invoice"   = NEW."invoice"
FROM "payments"                                     WHERE "invoice"   = NEW."invoice"
FROM "payments" pay                                 WHERE pay."invoice" = NEW."invoice"
```

A substitution written for the unaliased form silently missed the aliased `pjson`, and the assert
that all three were scoped is what caught it. **The trigger variant must be generated from the build
SQL and asserted to be scoped — never hand-copied.**

## 3. Refresh: ~1.9 s as a prototype, 3–18 s as shipped

> **Superseded.** Measured on an idle machine, and on a document without names. The shipped
> document is 16.9 MB at 1.9 KB each rather than 11.0 MB at 1.3 KB, and the machine was busier:
> 3–18 s depending on shape. The important consequence is not the number, it is that **the slow
> end crosses the guest's ~20 s call deadline**, so the rebuild is a job on the durable queue and
> not a statement inside a request. Run inline, it completes the work and then loses the HTTP
> response to the deadline — which is exactly what happened when it was first tried.

| step | cost |
|---|---|
| plain in-place rebuild (`DELETE` + `INSERT`) | **1,288 ms** |
| shadow-table build | 1,222 ms |
| atomic swap (`DELETE`+`INSERT`+`DROP` in one transaction) | 655 ms |
| **user-triggered refresh, shadow + atomic swap** | **~1.9 s** |

The swap is atomic because SQLite DDL is transactional, so a reader never sees a half-built table.
At 1.9 s it is short enough to be a button, and it belongs on the durable queue with progress
([[jobs-in-process-durable-queue]]) rather than on a request.

## 4. Three things the build exposed

**`unrounded_total` is itself rounded by legacy, and `final_total` subtracts `discount_rs` from the
ROUNDED value.** Storing the raw expression instead moved **4 invoices by half a cent and one by a
whole cent** (`(1, 846.0)`: legacy `3250.00`, naive `3249.995`). The document must apply
`printf('%.2f')` twice, exactly as `invoice_view` does.

**`json_group_array` inside `json_object` produces a JSON *string*, not a nested array.** It must be
wrapped: `'lines', json(COALESCE(l.lines,'[]'))`. Without it `$.lines` is a string and
`json_each(doc,'$.lines')` returns nothing.

**`payments` has no `deleted` column.** Verified against the live schema — `payments` carries
`id, invoice, party, paid_to, type, amount, paid, payment_date, description, created, updated`. The
legacy Payments screen has a delete button, so on the new side a payment delete is a **hard delete**
that erases history from a running balance ([[reports-and-ledgers]]). This needs a decision before
cash memo.

## 5. Also confirmed

- `dated` is blank on **21 of 8,927** invoices in the guest, where legacy had a value. They fall back
  to `created`, which is the import timestamp — so an invoice date field would show 2026 for a 2024
  invoice ([[guest-depot-created-is-import-time]]).
- Document payload is **11.0 MB, 1.3 KB per invoice** as a prototype (slightly larger than the
  5.5 MB shape-only bench, because these carry `cost_price`, `scheme`, `unrounded_total` and payment
  descriptions). **Shipped it is 16.9 MB at 1.9 KB each**, because the document now also carries
  party/item/booker/type names, phone, duedate, description, and each payment's type and party.
  That is the cost of "a read needs no join at all", and it is still far better than the
  `mview` entries it would replace — `invoiceView` 3.75 MB, `transactionsReport` 13.43 MB,
  `paymentsView` 13.41 MB. It does **not** cover `paymentsInvoicesReport` (16.66 MB), which is a
  cross-invoice company split and needs the aggregate tier rather than documents
  ([[table-audit-2026-09-29]]).
- `readable_id` as a `STORED` generated column works and is indexable, which is the natural home for
  the 15-char human-readable id.

## Related

- [[document-model-bench-2026-09-29]] — the shape benchmark that preceded this.
- [[tb-0021-invoices-cashmemos-printing]] — the build this unblocks.
