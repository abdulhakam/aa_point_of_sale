---
type: Task
status: Ready
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
