---
title: TB-0013 Rework or retire the report screens that depend on dropped views
type: task
status: todo
priority: medium
created: 2026-09-26
tags: [reports, views, pocketbase-types, cleanup, migration]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[trailbase-drop-sql-views]]", "[[reports-and-ledgers]]"]
---

# TB-0013 Rework or retire the report screens that depend on dropped views

The legacy frontend reads PocketBase **views** as if they were collections. TrailBase has no views
([[trailbase-drop-sql-views]]), so every one of those reads is a dead end the moment the client is
repointed — and its generated types are already unmaintainable.

## What depends on a view

`frontend/src/app/api/pocketbase-types.ts` carries a record type per view, which is the inventory:

| Type | View | Used by (screen) |
|---|---|---|
| `PaymentsViewRecord` | `payments_view` | Payments report, Sales report, Area ledger |
| `PaymentsSummaryRecord` | `payments_summary` | Payments report totals |
| `PaymentsInvoicesReportRecord` | `payments_invoices_report` | Payments By Company |
| `InvoiceViewRecord` | `invoice_view` | Daily Sale |
| `TransactionViewRecord` | `transaction_view` | Product Sale |
| `TransactionsReportRecord` | `transactions_report` | Item Sales, Profit |
| `ItemsReportRecord` | `items_report` | Stock |
| `ItemsDifferenceReportRecord` | `items_difference_report` | Difference |
| `LedgerPartyRecord` | `ledger_party` | Party ledger |
| `LedgerBookerRecord` | `ledger_booker` | Booker ledger |
| `LedgerAreaRecord` | `ledger_area` | Area ledger |
| `LedgerJournalRecord` | `ledger_journal` | General ledger |
| `NetPriceRecord` | `net_price` | (pricing helper) |
| `OutstandingSummaryRecord` | `outstanding_summary` | Outstanding |
| `CountsForRowNumbersRecord` | `counts_for_row_numbers` | Dashboard counters |

These are also the types `hydrateRefs` and the report components are written against, so removing
them is not just a type edit.

## The two possible outcomes

**Rework** — each screen fetches base tables and computes via the shared engine. The arithmetic is
already written and verified: `runtime-js/site/app/compute/views.js` plus
`runtime-js/site/app/compute/reports.js`, whose 14
report keys map onto these screens ([[reports-and-ledgers]]). The natural move is to reuse those
modules rather than re-derive the arithmetic in React.

**Retire** — the screen is deleted and its `/p/*` equivalent (or its `/reports/*` equivalent inside
[[runtime-js-guest-platform]]) becomes the only implementation. This is what
[[trailbase-declarative-page-host]] was designed for, and it removes the duplication rather than
porting it.

Which one applies per screen depends on [[pos-0028-decide-cutover-plan]]. If the Next.js app is
retired outright, this task collapses into deleting the screens.

## Not to be forgotten

- `/app/reports/payments/areawise` — a copy of the Unified Payments Report that no tile links to.
  [[runtime-js-guest-platform]] already left it out deliberately; deleting it here is the
  consistent choice.
- `/app/reports/stockreport/itemTransactionsReport` — has no guest equivalent, so it needs a decision
  rather than a port.
- The dashboard's `counts_for_row_numbers` becomes `buildCounts(base)` client-side, i.e. it depends
  on the warm snapshot rather than one cheap view read
  ([[trailbase-view-type-inference-limits]]).

## Subtasks

- [ ] For each screen in the table above, decide: rework onto base tables, or retire in favour of the
      guest/page-host equivalent
- [ ] Reuse `compute/views.js` + `compute/reports.js` rather than re-implementing the arithmetic
- [ ] Replace `counts_for_row_numbers` usage with `buildCounts`
- [ ] Decide the fate of `payments_summary`'s SQL-side aggregation — the one view that exists for
      performance, not shape ([[performance-and-caching]])
- [ ] Remove the dropped views' entries from `pocketbase-types.ts`, or regenerate the file from the
      remaining collections
- [ ] Delete `reports/payments/areawise` and `reports/stockreport/itemTransactionsReport`, or justify
      keeping them
- [ ] Re-check every reworked screen's totals against the preserved view SQL for the same rows
- [ ] `npx tsc --noEmit` and `npm run build` clean

## Notes

- The preserved view SQL is the specification and the test oracle — it is in the PocketBase
  migrations (`1789890300_ledger_party_window_function.js`, `1789890310_payments_summary_view.js`) and
  in the parent-directory artefacts. ⚠️ The READMEs' path to those artefacts is wrong; see
  [[stale-schema-sql-paths]].
- The former Node frontend's README (`frontend-ssr/README.md`, removed 2026-09-27) also listed
  this as § *Follow-ups* item 2: "Rework the report screens that
  depended on the dropped views, and delete the corresponding entries from
  `frontend/src/app/api/pocketbase-types.ts`."

## Related

- [[reports-and-ledgers]] — the arithmetic and the quirks that must be preserved.
- [[backend]] — the views, per migration.
- [[tb-0012-wire-nextjs-frontend-to-trailbase]] — the prerequisite if the screens are reworked
  rather than retired.
