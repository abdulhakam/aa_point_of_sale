---
type: Issue
status: Resolved
belongs_to:
  - "[[TrailBase Backend]]"
related_to:
  - "[[Backend — TrailBase Server]]"
  - "[[Frontend — TrailBase Server-Rendered App]]"
  - "[[TB-0007 Add the plugins hub and the Import from v1 migration plugin]]"
affects:
  - "[[Frontend — TrailBase Server-Rendered App]]"
created: 2026-09-25
updated: 2026-09-25
tags:
  - trailbase
  - api
  - bug
---

# Issue — TrailBase returns a plain-text DELETE body

## Summary

A successful `DELETE /api/records/v1/<api>/<id>` answers `200` with `content-type: text/plain` and the
body `deleted`. The record client in `frontend-ssr/src/lib/trailbase.js` parsed **every** success body with
`JSON.parse`, so `tb.remove()` threw `Unexpected token 'd', "deleted" is not valid JSON` on a *successful*
delete.

## Evidence

```
DELETE http://127.0.0.1:4093/api/records/v1/sections/<id>   (Authorization: Bearer …)
HTTP/1.1 200 OK
content-type: text/plain; charset=utf-8
content-length: 7

deleted
```

Found while exercising the migration plugin's optional "clear existing data" wipe: every per-row delete
threw before the fix.

## Impact

- Every hard delete through the record client was broken: `frontend-ssr`'s management screens hard-delete
  `sections` and `items` (the entities whose table has no `deleted` column — see
  [[Frontend — TrailBase Server-Rendered App]]), so deleting a section or item surfaced a 502/error page.
- Soft-deleted entities (`deleted` flag via `PATCH`) were unaffected, which is why it went unnoticed.
- The migration plugin's wipe could not run at all.

## Resolution

`request()` in `trailbase.js` now returns the raw text when a 2xx body is not JSON:

```js
if (!raw) return null;
try { return JSON.parse(raw); } catch { return raw; }
```

Verified: the wipe path deleted a seeded graph of all 14 tables in dependency order with no error, and
`tb.remove()` no longer throws.

## Related

- [[Backend — TrailBase Server]]
- [[Frontend — TrailBase Server-Rendered App]]
- [[Import from v1 Plugin]]
