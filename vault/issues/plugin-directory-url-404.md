---
title: Plugin directory URLs 404 because the trailing slash is normalised away
type: issue
status: fixed
severity: medium
created: 2026-09-28
tags: [guest, plugins, routing, bug, fixed]
related_to: ["[[runtime-js-guest-platform]]", "[[trailbase-declarative-page-host]]", "[[trailbase-client-side-migration-plugin]]"]
---

# Plugin directory URLs 404 because the trailing slash is normalised away

## What happened

The plugins index links each plugin as `/plugins/<name>/` (trailing slash). Requesting that 404'd
with "Not found", while `/plugins/<name>/index.html` served fine. So the import plugin (and any
plugin page) was unreachable by its own link — the trailing-slash branch in the route never ran.

## Cause

`trailbase/runtime/ahscripts/routes/_app/route.ts` served plugin files with

```ts
const rel = path.slice("/plugins/".length);
const target = PLUGINS_DIR + "/" + (rel.endsWith("/") ? rel + "index.html" : rel);
```

but the dispatcher hands `path` in with the **trailing slash already stripped**, so
`rel.endsWith("/")` was always false and `rel` was treated as a file (a directory) — `fs.readFile`
failed and `readStatic` answered 404.

## Fix (2026-09-28)

Treat any extension-less `rel` as a directory and serve its `index.html`, falling back to the raw
path:

```ts
if (rel.endsWith("/") || rel.indexOf(".") < 0) {
  const res = await readStatic(PLUGINS_DIR + "/" + rel.replace(/\/$/, "") + "/index.html");
  if (res && res.status !== 404) return res;
}
return readStatic(PLUGINS_DIR + "/" + rel);
```

## Evidence

- Before: `GET /plugins/import-from-v1/` → `404 "Not found"`; `GET
  /plugins/import-from-v1/index.html` → `200`.
- After: `GET /plugins/import-from-v1/` → `200` (29,024 bytes), and the production import ran
  from that page ([[new-system-report-timings]]).

## Note

The running server reads the **depot** copy of the runtime (`traildepot/runtime`), which
`clear_db.bat` froze before the fix; re-syncing `src/runtime` → `traildepot/runtime` (or running
`clear_db.bat`) is required for a running server to pick up a runtime source edit.
