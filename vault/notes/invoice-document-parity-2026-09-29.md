---
title: Invoice document prototype — exact money parity with legacy, trigger maintenance, and a 1.9 s refresh
type: note
status: active
created: 2026-09-29
system: new
tags: [invoices, document-model, json, parity, triggers, materialised, refresh, benchmark]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[document-model-bench-2026-09-29]]", "[[component-split-and-sql-materialised-tables]]", "[[tb-0021-invoices-cashmemos-printing]]", "[[money-is-2dp-everywhere]]", "[[report-sql-filters-on-text-enums-returns-nothing]]", "[[api-contract-trailbase]]"]
---

# Invoice document prototype — exact money parity with legacy, trigger maintenance, and a 1.9 s refresh

Built and measured by `python trailbase/tools/invoice-document-parity.py`. It copies
`traildepot/data/main.db` to a scratch file (**the live depot is never written**), builds one
self-contained JSON document per invoice with `STORED` generated columns, and diffs every money figure
against PocketBase.

## 1. Money parity: exact

Join key is `(invoice type code, invoiceNo)` — verified unique in **both** databases, 8,927 rows each,
no key present on only one side.

| compared | rows | mismatches |
|---|---|---|
| `invoice_view.total` | 8,927 | **0** |
| `invoice_view.unrounded_total` | 8,927 | **0** |
| `invoice_view.final_total` | 8,927 | **0** |
| `transaction_view.total` (per line) | 23,413 | **0** — worst delta `0.000e+00` |
| `payments_view.amount` (COALESCE rule) | 26,526 | **0** |

Lines are compared **order-independently** (sort both sides' multisets). Guest ids are `uuid_v7` and
legacy ids are 15-char text, so there is no line-level join key, and the document preserves insertion
order while `transaction_view` does not — pairing by position compares unrelated lines and produced a
false 12,432/23,413 "mismatch" that was purely an ordering artefact.

## 2. Trigger maintenance: works, and it is the point

One `AFTER INSERT` trigger on `transactions` rewriting the parent document:

```text
a line insert + trigger took 2.5 ms
total      180934.99  ->  181034.99      (+100.00 = 20.00 price x 5 qty)
line count 36  ->  37
sum of embedded line totals = 181034.99
document.total agrees with its own lines: True
```

The derived total is written **in the same transaction as the line**, so no reader can ever see an
invoice whose stored total disagrees with its own lines. This is the F4 "totals race" arriving
pre-solved.

## 3. Refresh: yes, ~1.9 s

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
- Document payload is **11.0 MB, 1.3 KB per invoice** (slightly larger than the 5.5 MB shape-only
  bench, because these carry `cost_price`, `scheme`, `unrounded_total` and payment descriptions).
- `readable_id` as a `STORED` generated column works and is indexable, which is the natural home for
  the 15-char human-readable id.

## Related

- [[document-model-bench-2026-09-29]] — the shape benchmark that preceded this.
- [[tb-0021-invoices-cashmemos-printing]] — the build this unblocks.
