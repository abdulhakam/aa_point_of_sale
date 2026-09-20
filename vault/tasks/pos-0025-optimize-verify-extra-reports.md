---
type: Task
status: Done
ticket: POS-0025
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
  - pagination
---

# POS-0025 Optimize + verify the Daily Sale, Outstanding, and Product Sale reports

## Goal

Bring the three reports named in [[Issue — Standalone Build Drift]] up to the same standard as
the rest of the performance program, and verify them end to end (rendering + logic).

## Context — the "missing reports" premise was stale

The request was to *add* `dailysale`, `outstanding`, and `productsale` because the standalone
build was believed to have them and the source not. That is no longer true:

- All three pages exist in source and were added by commit `261a56c` ("Introduce new reporting
  pages for daily, outstanding, and product sales…").
- `frontend/src/app/app/reports/page.tsx` (the reports hub) links all three.
- `frontend/` builds 18 report routes, the same count the Issue attributes to `standalone/`.

So there is nothing to add. What *is* outstanding is that these three pages were never covered
by [[POS-0015 Trim expands + adopt pagination in report pages]] and still carry over-fetching:

- `dailysale/page.tsx` — `invoice_view` with `expand: "party,party.area,party.area.section,booker"`
  (the deep chain POS-0015 removed elsewhere).
- `productsale/page.tsx` — `transaction_view` with
  `expand: "item,invoice,invoice.party,invoice.party.area,invoice.party.area.section"`, but the
  render only uses `t.item` and an `items` lookup, so the entire `invoice.*` chain is unused.
- `outstanding/page.tsx` — `outstanding_summary` with `expand: "party"`, but the render uses the
  view's own `party_name` column, so the expand is unused.

## Done when

- The three pages no longer request unused or deep expands (dailysale resolves names from the
  cached reference maps; productsale drops the unused `invoice.*` chain; outstanding drops the
  unused `party` expand).
- Each page renders the same rows/totals as before, verified in-browser (reuse the
  [[POS-0016 Report pages render test]] CDP harness), and
- the product-sale aggregation and daily-sale totals still match the underlying views.

## Work log

- 2026-09-20 — Premise checked: the three reports already exist, are linked, and are built;
  [[Issue — Standalone Build Drift]] and [[Reconcile the standalone build with source]] were
  corrected. Scoped the real work as the expand trim + verification above.
- 2026-09-20 — Applied the trims: `dailysale` drops
  `expand: "party,party.area,party.area.section,booker"` and resolves names via
  `useHydratedRefs(rows, ["party","booker"])`; `productsale` drops the wholly-unused
  `expand: "item,invoice,invoice.party,invoice.party.area,invoice.party.area.section"` (and a
  stray `console.log`); `outstanding` drops its unused `expand: "party"` (the view already
  exposes `party_name`). `npx tsc --noEmit` clean; `npm run build` clean (48 pages).

## Verification

Browser pass 2026-09-20 (headless Chrome over CDP, clock shifted to 2025-11-12 — a dense sale
day). All three rendered live data, and every row count and total matches a direct DB query:

| Report | Rows (DB / page) | Total (DB / page) |
|---|---|---|
| Daily Sale | 78 / 78 (+ total + 2 print-wrapper rows) | 257107.56 / **257107.56** |
| Product Sale | 83 items / 83 (+ total + 2) | 256575.49 / **256575.49** |
| Outstanding | 602 parties / 602 (+ total + 2) | 203098631.93 · 174081583.85 · 28656988.81 / **identical** |

Names render correctly in every column (e.g. daily sale Customer `RAUF NADEEM KARYANA`, Area
`MAHAJIR COLONY`, Booker `ATTIQUE`; product `TWINKLE` with `0 ctns 210 units`), confirming the
expands were replaced without loss. The hydration warnings seen during the pass are the
clock-shim artifact documented in [[POS-0016 Report pages render test]] (a control run on an
untouched page showed the same).
