---
title: "tb-0043 — Merge runtime/app into runtime/ahscripts and colocate route templates"
type: task
status: doing
priority: high
created: 2026-10-12
updated: 2026-10-12
tags: [trailbase, runtime-js, layout, refactoring, templates, minijinja]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[runtime-js-guest-platform]]", "[[trailbase]]", "[[build-and-run]]", "[[environment]]"]
---

# tb-0043 — Merge `runtime/app` into `runtime/ahscripts` and colocate route templates

The request: a single editable-app directory, with each route's template sitting in the route's own
folder ("like Next.js, but Jinja"). Today the runtime has two sibling roots under
`runtime/` — `ahscripts/` (the host's route/init/jobs discovery contract) and `app/` (views, pages,
lib, compute, manifests, reports/sql, public, plugins, config) — and a route's `.ts` and its
`.html.jinja` live in different trees.

## Decision

- The single root is **`ahscripts/`**. Route discovery (`/ahscripts/routes`) is therefore untouched in
  the host; the cost moves onto the `/app/` path literals instead.
- **Full colocation**: each route's template moves into the route's folder as `page.html.jinja`, and
  the `template:` string becomes that folder's path relative to the routes root
  (`dashboard/page.html.jinja`, `invoices/{id}/page.html.jinja`, …).
- **Genuinely shared files stay shared**, under `ahscripts/views/`: `layout.html.jinja`,
  `partials/*`, `reports/report.html.jinja` (the default report view) and
  `reports/ledgers/general.html.jinja` (the general ledger's `view` override). They cannot be
  colocated with a single route because they are extended/imported by many.
- **Declarative pages stay a separate `ahscripts/pages/` tree.** They must NOT move into
  `routes/<slug>/`: the host prefers a literal directory over a `{key}` one, so a
  `routes/reports/profit/` holding no `route.ts` would shadow `routes/reports/{key}/route.ts` and
  404 every report.

## Renderer contract

`render.rs`'s `Loader` already searches a list of roots and resolves names root-relative. The roots
become:

1. `/ahscripts/routes` — colocated route templates (addressed by path from here)
2. `/ahscripts/views`  — shared shell: `layout.html.jinja`, `partials/*`, shared report views
3. `/ahscripts/pages`  — declarative page templates (`<slug>/page.html.jinja`)

Because `{% extends 'layout.html.jinja' %}` and `{% import 'partials/…' %}` are resolved through the
same loader, a route template in root 1 still reaches the shared shell in root 2 with no change to
its own directives.

## Sequence

- [x] Write this note; set the owning project's `Sequence`
- [x] Move `runtime/app/{lib,compute,manifests,reports,sql,public,plugins,config,pages}` → `runtime/ahscripts/`
- [x] Move shared views (`layout`, `partials`, shared report views) → `runtime/ahscripts/views/`
- [x] Move each per-route template → `runtime/ahscripts/routes/<folder>/page.html.jinja`
- [x] Rewrite every `template:` string to the routes-relative colocated path
- [x] Rewrite `/app/` path literals → `/ahscripts/` in JS/JSON (paths only, not comments/URLs)
- [x] Update Rust host: `render.rs` roots (three-root loader), `config.rs` config path, comments;
      the sibling `tb-ah-render-jinja` component's `render.rs` too
- [x] Add `tools/template-check.mjs` and run it — **71 references / 56 templates, 0 misses**
- [x] Update `.bat` drivers (wholesale `runtime\` copy needs none), `tools/*`, `README.md`, and the vault
- [ ] **Operator**: rebuild the wasm (`build.bat`) and run `route-snapshot.mjs` + `guest-smoke.mjs`

## What changed

- `runtime/app/` no longer exists; `runtime/` holds only `ahscripts/`.
- 28 per-route templates moved into route folders as `page.html.jinja`; 14 shared files stayed under
  `ahscripts/views/` (`layout.html.jinja`, `partials/*`, `reports/report.html.jinja`,
  `reports/ledgers/general.html.jinja`).
- Declarative pages live at `ahscripts/pages/` (they cannot move into `routes/<slug>/` without
  shadowing `{key}` folders).
- `tb-ah-run-js/src/render.rs` and `tb-ah-render-jinja/src/render.rs`: `Renderer::new` now takes a
  `Vec<PathBuf>` of roots `[routes, views, pages]`.
- ~96 runtime source files had `/app/` path literals rewritten to `/ahscripts/`; legacy `/app/...`
  URL comments and the historical `git show …:runtime/app/…` object-spec were left intact.
- The vault's living documents (decisions, references, notes, issues, systems, the README, the
  project note) had their `runtime/app/` locators rewritten to `runtime/ahscripts/`. **Task notes and
  dated notes keep their historical `runtime/app/` paths on purpose** — they record where code lived
  when the work was done.

## Verification

Not runnable in the editing session (no wasm rebuild; the gates need a live server). What was run:

| Check | Result |
|---|---|
| `node tools/template-check.mjs` | **OK — 56 templates, 71 references resolve** across [routes, views, pages] |
| `node tools/brace-check.mjs` | 86 route files, **balanced** |
| all runtime JSON parses | 23/23 ok |
| `runtime/app` references remaining | none in code; only historical comments + `git show` object-specs |

**Operator hand-off:** `cmd /c trailbase\build.bat`, then `node trailbase\tools\route-snapshot.mjs`
and `node trailbase\tools\guest-smoke.mjs` against a live server. Any template that fails to resolve
would surface as a 500 from the host renderer.

