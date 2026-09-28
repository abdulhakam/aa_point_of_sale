---
title: Cap rows rendered per report page
type: decision
status: accepted
decided_on: 2026-09-28
created: 2026-09-28
tags: [reports, performance, rendering, cold-path, genericity]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[report-performance-baseline]]", "[[snapshot-persistence-hits-the-20s-deadline]]", "[[compiled-artifacts-are-generic-capabilities]]", "[[guest-report-performance-options]]", "[[rendered-page-cache]]"]
---

# Cap rows rendered per report page

## Context

The cold path (first view of a filter) was dominated by the guest's minijinja render of every row:
payments 26,526, transactions 21,815, etc. Several heavy reports crossed the ~20 s call deadline
([[snapshot-persistence-hits-the-20s-deadline]]).

## Decision

Render at most **`RENDER_MAX_ROWS = 1000`** rows per report page, in `route.ts`, before the
template. The cap:

- is applied to the **table body only** — `totals` are still computed over every row, so totals stay
  correct;
- is overridable per request: `?maxRows=N` sets it, `?all=1` renders everything (legacy parity);
- is part of the page-cache key, so the capped and full pages never collide;
- prints a "Showing first N of M rows — Show all" notice.

It is a generic capability (a row budget for any list page), runtime-only, no rebuild.

## Result (production depot, fresh filter, cold)

| report | cold before cap | cold after cap |
|---|---|---|
| salesreport | 3,244 ms | **798 ms** |
| payments | 6,184 ms | **2,218 ms** |
| dailysale | 2,421 ms | **680 ms** |
| paymentsbycompany | 500 @ 20 s | **19,499 ms** (200) |
| ledgers/general | 500 @ 20 s | **19,268 ms** (200) |
| itemsales | 500 @ 20 s | 500 (compute-bound) |
| profit | 500 @ 20 s | 500 (compute-bound) |

Repeat views became near-instant (e.g. payments 79 ms, ledgers/general 97 ms).

## What the cap exposed

The cap removes the **render** cost, but `ledgers/general`, `paymentsbycompany`, `itemsales` and
`profit` stay ~19–20 s cold **even rendering only 1000 rows** — so their cold cost is not the
render, it is the **JS computation** over every row (`ledgerJournal`, `paymentsInvoicesReport`,
`transactionsReport` + per-row shaping). Moving that into SQL (runtime `.sql`/`js` strategy) or a
native compute path is the cold fix those reports still need
([[guest-report-performance-options]]).

## Consequences

**Accepted**

- Render-bound heavy reports: 2–8× faster cold, and `paymentsbycompany`/`ledgers/general` stop
  returning 500.
- Totals and CSV/print semantics unchanged; `?all=1` restores full output.

**Given up / to watch**

- The default page shows the first 1000 rows; a user wanting every row follows "Show all" (or uses
  compatibility mode). This is a visible product change vs the legacy all-rows page.
- Grouped templates truncate mid-group if the row count exceeds the cap; raise `maxRows` or use
  `?all=1` for those.
- Compute-bound reports are not helped by the cap (see above).

## Evidence

- `trailbase/runtime/ahscripts/routes/_app/route.ts` — `RENDER_MAX_ROWS`, slicing, `rowInfo`.
- `trailbase/runtime/app/views/reports/report.html` — the truncation notice.
- [[report-performance-baseline]] — measurement method and numbers; `guest-smoke` 71/71.
