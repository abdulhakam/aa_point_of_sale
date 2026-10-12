---
title: "Reports page by LIMIT/OFFSET, not a growing window"
type: decision
status: accepted
created: 2026-10-11
updated: 2026-10-11
tags: [reports, pagination, spool, guest, decision]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[htmx-navigation-with-html-fragments]]", "[[a-reports-totals-come-from-a-sqlite-statement-that-wraps-the-report]]", "[[ui-parity-run-2026-10-11]]", "[[report-default-window-comes-from-the-data]]"]
---

# Reports page by LIMIT/OFFSET, not a growing window

**Decided 2026-10-11**, at the owner's request: every report/ledger page paginates.

## Context

Report pages rendered the first `RENDER_MAX_ROWS` (1000) rows with a "Load more" that **grew the
window** (`maxRows = shown + 1000`) and a "Show all" that dropped the cap. It was bounded per click
but re-rendered an ever-larger window and had no page you could sit on, link to, or return to. Every
one of the fifteen report/ledger screens shares the one path (`app/lib/report-render.js` →
`reports/report.html.jinja`), so one change covers them all.

## Decision

- `spoolRows(name, filters, limit, offset)` appends `LIMIT n OFFSET m` to the report statement
  (`LIMIT -1 OFFSET m` when showing all from an offset), so a page is O(page size) to render.
- `report-render.js` reads `page` (1-based), keeps `pageSize` (`maxRows` override or
  `RENDER_MAX_ROWS`), computes `offset = (page-1)*pageSize`, and exposes `rowInfo` with
  `page`, `pageCount`, `first`, `last`, `total`, and `prevHref`/`nextHref`/`allHref`.
- `reports/report.html.jinja` renders a pager (`← Prev · Page k of n · showing a–b of N · Next →` +
  `Show all`), reusing the `.pager` styles the invoice list already had. Prev/Next carry the current
  filters and drop the paging params.
- `all=1` remains the "everything on one page" escape hatch.

The totals and the row **count** still come from the uncapped totals statement, so the pager's "of N"
is exact regardless of the page.

## Consequences

- Every report and ledger paginates; the URL is shareable per page (`?page=k`).
- The rendered-page cache key includes `page`.
- Ordering is the report's own `ORDER BY`; a report whose ordering has ties can page unstably — the
  same caveat the SQL already carried.
- Supply Summary keeps its own template but pages the same way (`app/ahscripts/routes/reports/supplysummary`).
- **Correction 2026-10-11:** an earlier form of this change added an `ints` (plain integer sum) totals
  group so Supply Summary could show a "total units" figure. The owner clarified that **Total Items**
  means the **number of items in the summary** (the row count), not the sum of their units. The `ints`
  group was reverted; `spoolreports.js` carries `cents`, `derived`, `consts`, `pick` only, and Supply
  Summary's Total Items is its `rowCount`.
