---
type: Issue
status: Open
belongs_to:
  - "[[TrailBase Backend]]"
related_to:
  - "[[Frontend — TrailBase Server-Rendered App]]"
  - "[[Import from v1 Plugin]]"
  - "[[TB-0007 Add the plugins hub and the Import from v1 migration plugin]]"
affects:
  - "[[Frontend — TrailBase Server-Rendered App]]"
created: 2026-09-25
updated: 2026-09-25
tags:
  - trailbase
  - frontend
  - caching
  - gotcha
---

# Issue — Report cache lag after a client-side import

## Summary

After [[Import from v1 Plugin]] finishes, the dashboard and the reports keep showing the **old** numbers
until the app's base-table cache expires — up to `CACHE_TTL_SECONDS` (default **60 s**). Nothing tells the
node process that the data changed, because the import runs entirely in the browser.

## Evidence

Observed in the real Chrome run on 2026-09-25:

- The import completed (`60,245 / 60,245`, `0` failures) and the plugin's own Result table was correct.
- Clicking straight to the dashboard showed every counter still at **`0`** — the value cached from before
  the import (the first dashboard load of the session).
- Reloading after the TTL had passed showed the correct counts (parties 942, items 207, invoices 8,927,
  transactions 23,413, payments 26,526, …), which then matched PocketBase exactly.

## Impact

- A user who imports and immediately checks a report sees stale or empty data and may conclude the import
  failed.
- Only cosmetic/latency: the underlying data is correct, and the cache self-heals within the TTL.

## Mitigation

- Documented in the plugin's `meta.md` and in [[Import from v1 Plugin]] ("report cache lag").
- Options to remove it (not yet chosen):
  1. The plugin's `window.__mig` could `POST` to a small authenticated endpoint (e.g. `POST /plugins/invalidate`)
     that calls `reports.invalidate()` — but that reintroduces server code the plugin currently avoids.
  2. Lower `CACHE_TTL_SECONDS` while a migration screen is open.
  3. Accept it and tell the user to wait a minute.

## Notes

This is a direct consequence of [[Decision — Drop SQL views; aggregate reports client-side]]: because the
node process aggregates from its own cached copy of the base tables, it is the one thing that has to be
told the data changed, and a browser-only tool cannot do that.

## Related

- [[Import from v1 Plugin]]
- [[Frontend — TrailBase Server-Rendered App]]
- [[Decision — Run the PocketBase migration client-side as a plugin]]
