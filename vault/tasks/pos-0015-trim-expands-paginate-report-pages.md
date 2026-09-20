---
type: Task
status: In Progress
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

## Remaining (pagination + summary totals) — decision

- **Print reports stay full-list.** `transactions/unified`, `profit`, `dailysale`,
  `paymentsbycompany`, `salesreport`, `payments`, `areawise` render inside `<PrintContent>`
  and print the whole filtered set; paginating them would truncate the printed report.
- **`cashmemo/payments/PaymentsView` pagination is blocked on totals, not on plumbing.**
  The page shows client-side totals over the full filtered set. `payments_summary` can serve
  those totals for every filter it covers (day/party/area/section/booker/type/paid) but it has
  no `company` or `original_invoices` column, so the page's Company and Invoice filters cannot
  get correct totals from it. Adopting `usePagedList` there without a totals source for those
  two filters would show wrong totals. The clean fix is a summary-backed totals path with a
  full-list fallback only when `company`/`invoiceFilter` is set — tracked as follow-up work.
- `usePagedList` / `crud.listPage` therefore remain unused by the app; [[POS-0012 Pagination test]]
  verified the helper itself against the live API.
