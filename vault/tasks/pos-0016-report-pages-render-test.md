---
type: Task
status: Done
ticket: POS-0016
priority: P1
belongs_to:
  - "[[AA Point of Sale]]"
related_to:
  - "[[POS-0015 Trim expands + adopt pagination in report pages]]"
  - "[[Route Map]]"
affects:
  - "[[Frontend — Next.js Application]]"
blocked_by:
  - "[[POS-0015 Trim expands + adopt pagination in report pages]]"
created: 2026-09-20
updated: 2026-09-20
tags:
  - testing
  - frontend
  - reports
---

# POS-0016 Report pages render test

## Goal

Confirm each rewired report page renders the same correct data after expand-trimming,
pagination, and summary-view adoption.

## Done when

- For every page changed in [[POS-0015 Trim expands + adopt pagination in report pages]], a manual/automated pass confirms:
  - table rows match the pre-change output for a fixed filter range (spot-check totals),
  - pagination controls navigate correctly and totals still reflect the full range,
  - no `undefined`/blank cells from removed expands (names resolved via cached map or SQL).
- Any mismatch is fixed or filed as an Issue before [[POS-0018 Regression-test performance suite]].

## Related

- Test companion to [[POS-0015 Trim expands + adopt pagination in report pages]].

## Verification

PASS (2026-09-20). All seven rewired routes rendered with live data and correct names;
`/app/cashmemo/payments` paginated (50/page, 18 pages, page 2 navigates, totals stable across
pages and matching the DB exactly). One defect was found and fixed: the `payments_summary`
query used the default `sort=-created`, which that view cannot sort by → 400 → page crash;
fixed with `sort: "day"`. Full per-route evidence:
[[POS-0015 Trim expands + adopt pagination in report pages]].

## How the pass was run (for repeatability)

`agent-browser` is not installed and the `chrome-devtools` MCP is **not exposed to the agent
session**, so the pass drove Chrome directly over CDP (the same channel the MCP wraps) with a
short Node script (Node ≥ 22 has a global `WebSocket`):

1. `backend\RUN SERVE.BAT` (PocketBase 8090) and in `frontend/`: `npm run build && npm run start`
   (app on 3000).
2. Launch headless Chrome on a dedicated port:
   `chrome --headless=new --remote-debugging-port=9333 --remote-debugging-address=127.0.0.1 --user-data-dir=<tmp>`
   (the default 9222 collided with the user's running Chrome).
3. Node script: auth via `POST /api/collections/users/auth-with-password`
   (`user@user.com`/`admin`), then `Page.addScriptToEvaluateOnNewDocument` to
   (a) seed `localStorage.pocketbase_auth` and (b) shift `Date` forward so "now" falls in a
   month with data; then `Target.createTarget` + `attachToTarget` + `Runtime.evaluate` to read
   the rendered DOM.

Two gotchas worth remembering:

- **Default date range is empty** — the pages default to the current month, but the DB ends
  ~2026-04. Real density is best in **Dec 2025** (~1.6k payments, ~1.5k transactions), so the
  script shifts the clock there; no seed rows or DB writes are needed.
- The clock shift causes React hydration warnings (#418/#423) on **every** page, including
  untouched ones — verified by a control run on `/app/reports/stockreport`. They are an
  artifact of the shim (server HTML uses the real date), not a defect.

## Work log

- 2026-09-20 — Visual pass run and passed; `payments_summary` bad-sort bug found and fixed.
