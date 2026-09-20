---
type: Task
status: Done
ticket: POS-0015
priority: P1
belongs_to:
  - "[[AA Point of Sale]]"
related_to:
  - "[[Frontend — Next.js Application]]"
  - "[[Reports & Ledgers]]"
affects:
  - "[[Frontend — Next.js Application]]"
blocked_by:
  - "[[POS-0011 Paginated list plumbing]]"
  - "[[POS-0013 SQL aggregation views]]"
created: 2026-09-20
updated: 2026-09-20
tags:
  - performance
  - frontend
  - reports
  - pagination
---

# POS-0015 Trim expands + adopt pagination in report pages

## Goal

Cut over-fetching in report pages and switch detail lists to the paginated helper.

## Scope (per page)

- **Trim expands**: stop expanding `party.area.section` on full lists. Either join by id
  against a cached reference map (areas/sections/parties cached by [[POS-0009 Fix React Query cache config]]), or have
  the SQL view emit the names directly (several views already denormalize). Targets:
  - `reports/transactions/unified` — expand `item,company,party,party.area,party.area.section,booker`
  - `reports/profit` — same heavy expand
  - `reports/payments`, `reports/payments/areawise`, `cashmemo/payments/PaymentsView` —
    expand `invoice,party,area,section,booker(,company)` over 26k rows
  - `reports/paymentsbycompany` — expand `area,section,company,party,booker,original_invoice`
- **Adopt pagination**: transactional detail lists use `usePagedList` ([[POS-0011 Paginated list plumbing]]) with
  `mantine-datatable` page controls instead of `getFullList`.
- **Use summary views**: swap the report body/totals to the SQL summary views from
  [[POS-0013 SQL aggregation views]] where the page only needs aggregated numbers.

## Done when

- Targeted pages no longer request deep `party.area.section` expands on full lists.
- Transactional lists render paginated (page/perPage controls work, totals shown).
- Pages render the same data as before (verified in [[POS-0016 Report pages render test]]).

## Related

- Verified by [[POS-0016 Report pages render test]].
- Uses [[POS-0011 Paginated list plumbing]] and [[POS-0013 SQL aggregation views]].

## Work log

- 2026-09-20 — Added `useRefMaps` + `hydrateRefs` + `useHydratedRefs` to
  `frontend/src/app/api/useAPI.ts`: fetch the small reference collections once (cached
  `REFERENCE_STALE_TIME`) and synthesize the PocketBase `expand` shape client-side, so
  existing `row.expand?...` render code is untouched (low-churn adapter).
- 2026-09-20 — Trimmed the deep expand on `reports/transactions/unified` and
  `reports/profit` (was `expand=item,company,party,party.area.section,booker`); now
  hydrate `item,company,party,booker,area,section` from reference maps.
- 2026-09-20 — Trimmed the expand on the payments family: `reports/payments`,
  `reports/payments/areawise`, `reports/salesreport` (was
  `expand=invoice,party,area,section,booker`), `cashmemo/payments/PaymentsView`
  (also `company`), and `reports/paymentsbycompany` (was
  `expand=area,section,company,party,booker,original_invoice`).
- 2026-09-20 — Wrote `scripts/tests/test_expand_trim.py`: proves the client-resolved names
  equal the old server expand across three views. RESULT: PASS — 0 mismatches on
  4,800 field values; payload reductions **70.1% / 74.8% / 64.9%** (transactions_report /
  payments_view / payments_invoices_report). `npx tsc --noEmit` clean; `npm run build` OK.
- Findings worth keeping: `payments_view.company` is a **multiple** relation (array) while
  `payments_invoices_report.company` is a **scalar** PocketBase never expands (the page maps
  it from `categories` itself — unchanged). The hydrator handles scalar and array shapes.
- 2026-09-20 — **Pagination adopted** on the cash memo payments list
  (`cashmemo/payments/PaymentsView.jsx`): the table now uses `useCRUD().pagedList`
  (`usePagedList`, 50/page) with `mantine-datatable` page controls, replacing `getFullList`.
- 2026-09-20 — **Summary-view totals.** Totals come from `payments_summary` via
  `summaryCalculator()` when every active filter is a column of that view
  (day/party/area/section/booker/type/paid); the Company and Invoice filters are not in the
  view, so those cases fall back to the previous full-list behaviour to keep totals correct.
  Added an `enabled` option to `useFullList` to gate the two paths.
- 2026-09-20 — Wrote `scripts/tests/test_summary_totals.py` → PASS: summing `payments_summary`
  matches the payments calculator across 9 filter shapes (all rows; per-type; party/area/
  section/booker; date range + type). `npx tsc --noEmit` clean; `npm run build` OK.

## Verification

Browser render pass ([[POS-0016 Report pages render test]]), 2026-09-20, headless Chrome 153
over CDP. All seven rewired routes rendered with live data and **client-resolved names**
(party/area/section/company/booker/item):

| Route | Result |
|---|---|
| `/app/reports/transactions/unified` | 823 rows; BOOKER/COMPANY/AREA/SECTION/ITEM names present |
| `/app/reports/profit` | 889 rows; names + Profit column |
| `/app/reports/payments` | 898 rows; INVOICE/AREA/SECTION/PARTY/BOOKER names |
| `/app/reports/payments/areawise` | 898 rows |
| `/app/reports/salesreport` | 296 rows |
| `/app/reports/paymentsbycompany` | 1,135 rows; COMPANY names present |
| `/app/cashmemo/payments` | 50 rows/page, 18 pages; page 2 navigates; totals stable across pages |

Totals cross-checked: the page showed Purchase 496187.58 / Paid 624407.00 / Sale 479034.50 /
Recieved 480240.50 for Dec 1–15 2025, identical to both `payments_summary` and the raw
`payments_view` aggregation.

### Bug found and fixed by this pass

The first browser run crashed `/app/cashmemo/payments`: `useFullList` defaults to
`sort="-created"`, but `payments_summary` has **no `created` column**, so PocketBase answered
**400 Bad Request** and the page threw. Fixed by passing `sort: "day"` to the summary query.
Re-verified: the page renders and paginates. (This is why the browser pass was worth doing —
the data-level tests could not catch a request-shape rejection.)

Design note: the print report pages (`transactions/unified`, `profit`, `dailysale`,
`payments`, `areawise`, `salesreport`, `paymentsbycompany`) deliberately stay full-list — they
render inside `<PrintContent>` and print the whole filtered set, so paginating them would
truncate the printed report. Only the cash memo payments list (a management list with row
actions, no print) was paginated.
