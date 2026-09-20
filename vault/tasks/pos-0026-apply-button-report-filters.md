---
type: Task
status: Done
ticket: POS-0026
priority: P1
belongs_to:
  - "[[AA Point of Sale]]"
related_to:
  - "[[POS-0015 Trim expands + adopt pagination in report pages]]"
  - "[[Reports & Ledgers]]"
  - "[[Route Map]]"
affects:
  - "[[Frontend — Next.js Application]]"
blocked_by:
  - "[[POS-0011 Paginated list plumbing]]"
created: 2026-09-20
updated: 2026-09-20
tags:
  - performance
  - frontend
  - reports
---

# POS-0026 Add an Apply button to report filters

## Goal

Stop reporting pages from firing a request on every filter change: the user sets the filters
first, then presses **Apply**, and only then is the data requested.

## Why

Report pages build their PocketBase `filter` directly from live form state, so every select,
date or free-text change produces a new React Query key and a fresh request. Setting, say,
Area → Section → Booker fires three requests (and three "Loading…" flashes); only the last is
useful. Snapshotting the filters behind an Apply button collapses that to one.

## Approach

Draft vs applied split, via a small shared hook `useAppliedFilters(initial)` (in `useAPI.ts`):

- every input keeps editing the existing form/`useState` draft (no change to the inputs),
- a new `applied` snapshot is what the page's `filter` is built from, so the query only
  re-keys when Apply is pressed,
- **Apply** copies the draft into `applied`; **Reset** returns both the draft and the applied
  snapshot to the page defaults,
- the page's printed/report header shows the *applied* range so it always matches the data,
- the initial `applied` value equals the page defaults, so first load still fetches.

## Done when

- The report pages (and the cash memo payments list) only issue a data request when Apply is
  pressed (or on first load), not on each input change.
- Apply + Reset work, the printed header matches the applied range, and the pages render the
  same data as before.
- `npx tsc --noEmit` + `npm run build` clean; a browser pass confirms one request per Apply.

## Work log

- 2026-09-20 — Task created from the user's request. Scope: the report pages under
  `app/reports/**` plus `cashmemo/payments/PaymentsView.jsx` (the pages that carry filters).
- 2026-09-20 — Added `useAppliedFilters(initial)` (returns `{ applied, apply, reset, initial }`)
  to `useAPI.ts`, then rolled the pattern out across 16 pages:
  `reports/payments`, `reports/payments/areawise`, `reports/salesreport`, `reports/profit`,
  `reports/transactions/unified`, `reports/paymentsbycompany`, `reports/dailysale`,
  `reports/outstanding`, `reports/productsale`, `reports/difference`, `reports/stockreport`,
  all four `reports/ledgers/*` pages and `cashmemo/payments/PaymentsView.jsx`.
  On each: the data query's `filter` (and anything else the query derives from the filters, e.g.
  cash memo's `summaryCompatible`/`summaryFilter`) now reads `applied`; an **APPLY** button
  snapshots the draft; RESET restores the inputs and the snapshot; labels/printed headers that
  describe the data read `applied` so they always match it.
- `npx tsc --noEmit` clean; `npm run build` clean (48 pages).

## Verification

Browser pass 2026-09-20 (headless Chrome over CDP) on `/app/reports/payments`, counting the
real `payments_view` requests:

| Step | `payments_view` requests |
|---|---|
| after page load | 2 |
| after choosing an Area in the dropdown (draft change) | **2 — unchanged** |
| after pressing APPLY | 4 — new requests, carrying `&& (area = "mq5gt7d1w2f4uwl")` |

So editing filters no longer fires a request; only APPLY (or first load) does. Filters set
before Apply are batched into the single applied request.
