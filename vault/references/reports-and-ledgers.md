---
title: reports-and-ledgers
type: reference
status: active
system: both
created: 2026-09-26
tags: [pos, reports, ledgers, arithmetic, parity]
related_to: ["[[runtime-js-guest-platform]]", "[[backend]]"]
---

# Report arithmetic and ledgers

The reports are the reason this rewrite exists, so their arithmetic is specified rather than
implied. On the legacy side the arithmetic is SQL, inside PocketBase views ([[backend]]).

> **⚠️ The architecture described below is one generation behind, corrected 2026-10-03.** The
> arithmetic in this document is still the authoritative description of the rules. The *mechanism*
> is not: the reports now run on **SQL**, not on a JavaScript engine.
>
> - `app/compute/reports.js` — **deleted**. It was the report engine; `git show
>   04cd42b:trailbase/runtime/app/compute/reports.js` still recovers it.
> - `app/lib/spoolreports.js` — the current entry point. Its comments cite `reports.js:NN` lines and
>   say so explicitly, so the mapping is traceable.
> - `app/reports/sql/` — `prelude.sql` plus **11** report statements under `reports/`.
> - `app/compute/views.js` — **still exists and is still imported**, by `lib/pages.js`
>   (`viewClosure`), `lib/reports.js` (`buildView`, `viewClosure`, `tablesForViews`,
>   `viewsAffectedBy`, `VIEW_ORDER`) and the two verification harnesses. The builder table below is
>   therefore still a live inventory, not a historical one — see
>   [[vault-code-drift-audit-2026-10-03]] §4.

## Derived "views" rebuilt in JavaScript

⚠️ Still imported, so still live — but the reports do not read these any more; they were replaced by
`app/reports/sql/reports/*.sql`. What survives is the **dependency graph** (`viewClosure`,
`viewsAffectedBy`, `tablesForViews`, `VIEW_ORDER`), which is why deleting the file is a refactor with
a prerequisite rather than a one-line cleanup.

`compute/views.js` exports one builder per old view, plus closure helpers:

| Builder | Rebuilds |
|---|---|
| `buildTransactionView(base)` | `transaction_view` — one row per invoice line |
| `buildInvoiceView(base, transactionView)` | `invoice_view` — one row per invoice, with invoice-level discounts applied |
| `buildTransactionsReport(base, transactionView, invoiceView)` | `transactions_report` |
| `buildPaymentsView(base, invoiceView)` | `payments_view` |
| `buildPaymentsInvoicesReport(base, paymentsView, transactionsReport, invoiceView)` | `payments_invoices_report` |
| `buildItemsReport(base, transactionView)` | `items_report` |
| `buildItemsDifferenceReport(base, transactionView)` | `items_difference_report` |
| `buildLedgerJournal(base, paymentsView)` | `ledger_journal` |
| `buildLedgerBooker(paymentsView)` | `ledger_booker` |
| `buildLedgerParty(paymentsView)` | `ledger_party` |
| `buildLedgerArea(paymentsView)` | `ledger_area` |
| `buildOutstanding(base, paymentsView)` | `outstanding_summary` |
| `buildCounts(base)` | `counts_for_row_numbers` |
| `buildRefs(base)` | `refs` — the reference maps the reports and filters read |

Plus the machinery that makes incremental rebuilds possible: `buildView`, `viewsAffectedBy`,
`viewClosure`, `tablesForViews`, `buildViews`, `buildSelectedViews(base, previous, dirty)`.

`viewsAffectedBy(tables)` is what lets [[runtime-js-guest-platform]] rebuild only the views a
changed table feeds, and `viewClosure(names)` is what lets a `meta.json` declare `"views":
["transactionsReport"]` and have the transitive dependencies pulled in automatically.

## The line and invoice math

From `buildTransactionView`:

```
lineTotal  = price × qty × (1 − discount_1/100) × (1 − discount_2/100) − discount_rs
net_amount = round2(lineTotal × (1 − inv_d1/100) × (1 − inv_d2/100))
profit     = round2(cost_price × qty)          // see the quirk below
```

Two discounts are multiplicative, not additive, and `discount_rs` is a flat amount subtracted
after them. The invoice's own `discount_1` / `discount_2` are then applied per line to produce
`net_amount` — which is how the Item Sale Report's sale total comes out at `731.00` for the
smoke seed (`590.42 + 140.58`, i.e. the invoice-level `discount_rs` allocated per line).

From `buildInvoiceView`:

```
total           = Σ round2(line total)                     // per invoice
unrounded_total = total − total×d1/100, then − that×d2/100
final_total     = round2(unrounded_total − discount_rs)
```

`dated` falls back to `created` when unset (`inv.dated || inv.created`), matching the old
`COALESCE`-style behaviour.

## The 14 reports

`compute/reports.js` (23,580 bytes) exports `REPORTS` — a map of name → `{title, inputs, run}`
— and `runReport(name, ctx, filters)`. `inputs` names the views each report needs, which is how
the caller assembles `ctx` from the warm snapshot:

| Report key | Title | Inputs |
|---|---|---|
| `payments` | Unified Payments Report | `paymentsView`, `invoiceView`, `refs` |
| `salesreport` | Sales Report | `paymentsView`, `invoiceView`, `refs` |
| `paymentsbycompany` | Payments By Company | `paymentsInvoicesReport`, `invoiceView`, `refs` |
| `profit` | Profit Report | `transactionsReport`, `refs` |
| `itemsales` | Item Sales Report | `transactionsReport`, `refs` |
| `stockreport` | Stock Report | `itemsReport`, `refs` |
| `difference` | Difference Report | `itemsDifferenceReport`, `refs` |
| `ledgers/party` | Party Ledger | `ledgerParty`, `invoiceView`, `refs` |
| `ledgers/booker` | Booker Sales Ledger | `ledgerBooker`, `invoiceView`, `refs` |
| `ledgers/area` | Area Ledger | `paymentsView`, `refs` |
| `ledgers/general` | General Ledger | `ledgerJournal` |
| `dailysale` | Daily Sale Report | `invoiceView`, `refs` |
| `outstanding` | Outstanding Payments Report | `outstanding` |
| `productsale` | Product Supply Summary | `transactionView`, `refs` |

Note `productsale`'s title is **"Product Supply Summary"**, not "Product Sale Report" — the
tile on the index is labelled with the latter. `ledgers/general` is the only report with no
`refs` input, which is also why it is excluded from the warm-up list in
`trailbase/runtime/ahscripts/routes/_app/route.ts`.

The 4 ledger pages are reached at `/reports/ledgers/{area,booker,general,party}` and from
`LEDGER_INDEX`; the other 11 from `REPORT_INDEX`.

## Inherited quirks, kept on purpose

These are wrong but deliberate — they are in the old SQL too, and reproducing them is what
makes the full-green smoke comparisons meaningful:

1. **`transaction_view.profit` is total cost, not margin.** The old SQL misnamed it. The
   `Profit Report` therefore uses `transactions_report.profit`, which *is* the real margin.
   `views.js` carries a `// NOTE: named profit in the old SQL but it is total cost, not margin`
   comment at exactly that line so nobody "fixes" it by accident.
2. **`ledger_*.credit` / `debit` do not model the return case.**
3. **`ledger_journal.stock` is always `0`.**
4. **The `deleted` soft-delete flag is not applied consistently** across the derived views.

One deviation *is* deliberate and is called out as such: **`ledger_area` grouped arbitrary
`created`/`type` values from its `GROUP BY`**, which made its date and "recieving only" filters
unreliable. The Area Ledger here filters the **source payments** instead, so the range and the
type filter mean what the screen implies. That is the only intentional behavioural difference
from the legacy views.

## The assertions that pin the numbers

The guest smoke suite (`node trailbase/tools/guest-smoke.mjs`) seeds a small consistent dataset
through the
record APIs and checks hand-computed values that must match the preserved view SQL — 71
checks in total. The arithmetic ones:

| Value | Expected | Why |
|---|---|---|
| Profit Report total | `91.00` | sale margin `90.42 + 40.58` minus return `40.00` |
| Item Sales total sale | `731.00` | `590.42 + 140.58` (invoice-level `discount_rs` allocated per line) |
| Stock Report total | `4510.00` | `91 × 50` Cola minus `2 × 20` Chips |
| Payments payable / recivable | `800.00` / `150.00` | unpaid sending, and recieving − recieved − returns |
| Outstanding balance | `150.00` | `500 − 200 − 150` for the seeded customer |
| Payments By Company split | `403.85` / `161.54` | revenue share `598.50 / 741` and `142.50 / 741` of a `500` payment |

The last row is the interesting one: it demonstrates that Payments By Company distributes a
payment across companies **by revenue share**, not by direct attribution.

Run it with `node trailbase/tools/guest-smoke.mjs` (see [[build-and-run]]). It boots its own
throw-away TrailBase depot, so it does not touch development or production data.

## Where the old SQL is preserved

The legacy SQL itself is kept verbatim in the PocketBase migrations — most recently
`1789890300_ledger_party_window_function.js` and `1789890310_payments_summary_view.js` — and
in the parent-directory artefacts `full_database_schema.sql` and
`dltbl/views_from_pb/U1776088644__create_views.sql`. See [[stale-schema-sql-paths]] for why the
paths cited in the READMEs do not resolve, and [[performance-and-caching]] for what those
views do for speed.

`trailbase/README.md` notes that this preserved SQL is also the reference for anyone who later
wants the aggregation as a **WASM handler** or a materialised table inside TrailBase.

## Related

- [[backend]] — the views listed per migration, including `payments_summary`'s eight columns.
- [[runtime-js-guest-platform]] — the page host and the report service that run this code.
- [[trailbase-drop-sql-views]] — why there are no views on the new side.
- [[tb-0013-rework-report-screens-without-views]] — the legacy-side follow-up.
