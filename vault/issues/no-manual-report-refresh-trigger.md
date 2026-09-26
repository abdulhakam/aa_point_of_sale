---
type: Issue
status: Resolved
created: 2026-09-26T00:00:00.000Z
updated: 2026-09-26T00:00:00.000Z
belongs_to:
  - "[[TrailBase Backend]]"
related_to:
  - "[[Reports vs Pages — Implementation and Performance]]"
  - "[[TB-0008 Serve report results from the page host instead of whole views]]"
  - "[[TB-0009 Retire the legacy report routes in favour of the page host]]"
affects:
  - "[[Frontend — TrailBase Server-Rendered App]]"
tags:
  - trailbase
  - frontend
  - reports
  - operations
---

# Issue — No manual trigger for the report snapshot refresh

## Summary

The report snapshot (base tables + derived views + pre-rendered default reports) is refreshed only by a
timer, by a management write, or lazily when the snapshot is not ready. There is **no button and no
endpoint** to force a reload/process/render on demand, even though the service already exposes
`refresh()` and `invalidate()`.

> **Resolved 2026-09-26** — the top-bar state indicator is now a button that POSTs `/reports/refresh`.
> See Resolution below.

## Evidence

`src/lib/reports/index.js` exports `refresh()`, `invalidate(tables)` and `status()`. But the only route
wired to the service is read-only:

```js
// src/routes/reports.js
router.get("/reports/status", auth, (req, res) => res.json(reports.status()));
```

`public/js/app.js` (`initJobIndicator`) polls `/reports/status` to paint the top-bar dot; it has no click
handler. The pipeline therefore runs only as:

1. **Timer** — `setInterval` every `REFRESH_INTERVAL_SECONDS` (default 60 s); probes each table's
   fingerprint and rebuilds only what changed.
2. **Management write** — `POST /management/<entity>/{create,update,delete}` call
   `reports.invalidate(touchedTables(entity))`, which marks those tables dirty and fires `refresh()`
   immediately.
3. **Lazy on read** — `getViews()` / `run()` call `ensureFresh()`, which refreshes only if the snapshot is
   not ready or is dirty.

## Impact

- After a change the app cannot see — most notably the browser-only
  [[Import from v1 Plugin]], which cannot invalidate the server — the operator waits up to one refresh
  tick (60 s) with no way to hurry it. See [[Issue — Report cache lag after a client-side import]].
- Diagnostics are harder: confirming "did the pipeline pick up my change?" means waiting, or making a
  throwaway write.
- Workarounds today: save any management record (invalidates its tables), or restart the frontend
  (`ready` starts false, so the first authenticated request rebuilds everything).

## Options

1. Add `POST /reports/refresh` (auth-guarded) that calls `reports.refresh()` — a targeted refresh of
   whatever the fingerprint probe finds changed.
2. Add `POST /reports/refresh?full=1` calling `reports.invalidate()` with no arguments — a full re-read of
   all 17 tables.
3. Make the top-bar indicator clickable to POST the endpoint and re-poll `/reports/status` immediately.
4. Have the Import from v1 plugin call it at the end of a run (the plugin currently runs entirely in the
   browser and has no server hook).

## Resolution (2026-09-26)

- `POST /reports/refresh` (auth-guarded) in `src/routes/reports.js` runs `reports.refresh()` — probe,
  re-read only the tables whose fingerprint moved, rebuild their views and re-render the affected reports.
  `?full=1` calls `reports.invalidate()` first, so every table is re-read.
- It answers the job state as JSON when the request asks for it, otherwise redirects `303` back to a
  same-host `Referer` (falling back to `/dashboard`), so the control works with JavaScript disabled.
- The top-bar indicator in `views/partials/topbar.html` is now a submit button in a plain form
  (`data-job-form`); `public/js/app.js` intercepts the submit, POSTs with `accept: application/json`,
  paints the returned state and then reloads the page so it renders from the rebuilt snapshot.
- Verified live: `303` with `Location: /p/reports/stock`, `200` JSON with `ready: true`, and `?full=1`
  advancing the build (1 → 2, 14 views rebuilt). In a real browser the click set `aria-busy`, the page
  reloaded, and the probe ran (the page then showed `207 row(s) · snapshot v3`).
- `npm run smoke` grew from 59 to **63/63** checks, covering the redirect, the full re-read, the JSON
  answer and that the snapshot is left `ready`.

## Related

- [[Reports vs Pages — Implementation and Performance]]
- [[Decision — Refresh the report snapshot incrementally from table fingerprints]]
- [[Issue — Report cache lag after a client-side import]]
- [[Frontend — TrailBase Server-Rendered App]]
