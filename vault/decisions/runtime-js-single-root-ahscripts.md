---
title: "runtime-js is a single ahscripts/ root with colocated route templates"
type: decision
status: accepted
decided_on: 2026-10-12
created: 2026-10-12
updated: 2026-10-12
tags: [trailbase, runtime-js, layout, templates, minijinja, decision]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[runtime-js-guest-platform]]", "[[trailbase]]", "[[tb-0043-colocate-app-into-ahscripts]]"]
---

# runtime-js is a single `ahscripts/` root with colocated route templates

## The choice

The editable application is **one directory, `trailbase/runtime/ahscripts/`**, not the two siblings
`ahscripts/` + `app/` it had before. Each route's template lives inside the route's own folder as
`page.html.jinja`:

```
ahscripts/
  routes/dashboard/{route.ts, page.html.jinja}
  routes/invoices/{route.ts, page.html.jinja, all/page.html.jinja, new/page.html.jinja,
                   {id}/{page.html.jinja, grid/page.html.jinja, view/page.html.jinja}}
  views/layout.html.jinja, views/partials/*      ← the shared shell
  pages/<slug>/page.html.jinja                    ← declarative page templates
  lib/ compute/ manifests/ reports/sql/ public/ plugins/ config/
```

The renderer resolves names against **three roots in order** — `ahscripts/routes`,
`ahscripts/views`, `ahscripts/pages` — root-relative, so a colocated route template reaches the
shared `layout.html.jinja` and `partials/*` through its own `{% extends %}` (see
[[runtime-js-guest-platform]]).

## Why

- **One place to look.** "A route and its template" stopped being two trees apart. A route folder is
  now self-describing, which is what a route-folder convention was for
  ([[tb-0030-retire-the-route-ts-dispatcher]]).
- **`ahscripts/` keeps the host's route discovery untouched.** The host already resolves
  `/ahscripts/routes/...`, so choosing it as the surviving root cost zero router changes; the cost
  moved onto the `/app/` path literals, which are mechanical.
- **The three-root loader made it nearly free.** Template names were already path-relative and
  already mirrored a route folder (`dashboard/index.html.jinja` → `routes/dashboard/`), so
  colocation was a move plus a rename to `page.html.jinja`; `{% extends %}` and `{% import %}`
  needed no edits.

## What was rejected

- **Merging into `app/` instead** (`app/routes/...`). Fewer literal edits, but it changes the host's
  route-discovery path and diverges from the upstream `tb_ah_run_js` convention.
- **Moving the shared shell and the declarative pages into route folders.** `layout.html.jinja` and
  `partials/*` are extended/imported by many routes and cannot belong to one. The declarative pages
  **must not** move into `routes/<slug>/`: the router prefers a literal directory over a `{key}`
  one, so a `routes/reports/profit/` holding no `route.ts` would shadow `routes/reports/{key}/route.ts`
  and 404 every report. They stay a separate `ahscripts/pages/` tree.

## Consequences

- The shared shell is the only template group not colocated; that is a property of sharing, not a
  gap.
- Raw host paths moved: `render.rs` and `tb-ah-render-jinja/src/render.rs` now pass three roots;
  `config.rs` reads `/ahscripts/config/app.config.json`.
- Verified by the static checker `tools/template-check.mjs`; runtime behaviour is gated by
  `route-snapshot.mjs` and `guest-smoke.mjs` after the operator rebuilds the wasm.
