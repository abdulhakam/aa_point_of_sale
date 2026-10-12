---
title: "tb-0044 — optional error, global-error and not-found pages"
type: task
status: doing
priority: medium
created: 2026-10-12
updated: 2026-10-12
tags: [trailbase, runtime-js, routing, error-handling]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[runtime-js-guest-platform]]", "[[runtime-js-special-pages]]", "[[runtime-js-single-root-ahscripts]]"]
---

# tb-0044 — optional error, global-error and not-found pages

Next.js-style special pages for the guest host, requested right after the [[tb-0043-colocate-app-into-ahscripts]]
layout change. Decision and rationale: [[runtime-js-special-pages]].

## What was built

**Host (`tb-ah-run-js/src/lib.rs`)**

- Three optional reserved handlers under `routes/_<name>/route.{ts,js}`: `_not-found`, `_error`,
  `_global-error`. `resolve_special_file` / `run_special` look them up and dispatch them like any
  route.
- `response_from_json` extracted from the old inline `Ok(json)` branch, so normal and special
  dispatch answer identically.
- `resolve_route_file` now skips any `_`-prefixed segment (the Next.js `_folder` private convention).
- No route folder → `_not-found` if present, then the JSON `no_route_folder` 404; the host stamps
  `x-aa-not-found: no_route_folder` on the custom page so the unrouted signal survives.
- Handler exception → `_error`, then `_global-error`, then a host minimal 500 page. Previously a
  handler crash was answered `404 Route execution failed: …`.

**App (`runtime/ahscripts/routes/`)**

- `_not-found/{route.ts, page.html.jinja}` — renders the app shell with a "Page not found" body, 404.
- `_error/{route.ts, page.html.jinja}` — renders the shell with a "Something went wrong" body, 500,
  reading `req.error`.
- `_global-error/{route.ts, page.html.jinja}` — a standalone document (no app bundle, no shell), 500.

**Tools**

- `route-coverage.mjs` also treats the `x-aa-not-found` header as UNROUTED.
- `template-check.mjs` covers the new handlers and templates (now 59 templates, 130 references).

## Sequence

- [x] Rust host: special-handler lookup, dispatch, `_` reservation, `response_from_json` extraction
- [x] App: the three handlers + templates
- [x] `route-coverage.mjs` header handling
- [x] Vault: decision + this task + system note
- [ ] **Operator**: `build.bat`, then `route-snapshot.mjs` (re-baseline the 5 negative probes — they
      now answer an HTML 404) and `guest-smoke.mjs`

## Verification

Static only, in the editing session:

| Check | Result |
|---|---|
| `node tools/template-check.mjs` | OK — 59 templates, 130 references resolve |
| `node tools/brace-check.mjs` | 89 route files, balanced |

The Rust change is compiled by the operator's `build.bat`; it is not exercised here. The three pages
are intentionally optional — deleting any `_<name>` folder restores the host's previous behaviour.
