---
title: Use runtime-js as the single app host (rendering folded in)
type: decision
status: accepted
decided_on: 2026-09-26
created: 2026-09-26
tags: [trailbase, wasm, rquickjs, architecture, rendering, minijinja]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[trail-runtime-js-reference]]", "[[trailbase-guest-wasm-runtime-defaults]]", "[[trailbase-guest-wasm-spike-results]]", "[[compiled-artifacts-are-generic-capabilities]]", "[[rendering-is-a-component-behind-an-envelope]]", "[[component-split-and-sql-materialised-tables]]", "[[manifest-driven-routing-and-data-dag]]", "[[client-side-live-recalculation]]", "[[report-render-row-cap]]", "[[trailbase-loads-multiple-components-flat-router]]"]
---

# Use runtime-js as the single app host (rendering folded in)

## Context

Phase 0 proved the guest platform's premises ([[trailbase-guest-wasm-spike-results]]) and the
plan's component map proposed separate `app-host`, `render`, `compute`, `data`, `jobs` and
`worker` components ([[trailbase-guest-wasm-runtime-defaults]]). The existing
`abdulhakam/trail_runtime_js` project already implements the D2/D4 premise as **one** Rust guest
embedding QuickJS with file routing and an API bridge ([[trail-runtime-js-reference]]), and it
builds and serves on our `trail v0.33.22` after a `trailbase-wasm 0.6.1` bump.

The plan's D3 wanted a separate Rust `minijinja` guest reached over HTTP.

## Decision

**`runtime-js` is the single app host for the first cut**, and rendering is **folded into it**
rather than being a separate component:

- A Rust `minijinja` module (`trailbase/host/src/render.rs`) is exposed to scripts as native
  `render.html(name, ctxJson)` / `render.string(source, ctxJson)`. Templates load from
  `/app/views` (falling back to `/app/pages`); names resolve views-root-relative; the ten filters
  from the earlier Node frontend are ported; templates cache by mtime.
- A route returns `{ html: "..." }` and the host answers `Content-Type: text/html`; anything else
  is JSON.
- Business logic (routes, report/ledger calculators) stays runtime TS under `app/`; the Rust host
  is architecture only.

This **amends D3** (no separate `render` component) and narrows the component map: `app-host`,
`compute` and (for now) `jobs` are one `runtime-js` component. A `worker`/`data` split remains a
later option if isolation or the per-call deadline demands it.

## Why not the alternatives

| Alternative | Why not |
|---|---|
| Separate `render` guest reached over HTTP (plan's D3) | Adds cross-component HTTP + JSON round-trips for every page render, plus a second component to load/deploy. Our S6 spike proved the HTTP path works, so it stays available, but it buys nothing while everything is Rust-in-one-host. |
| `minijinja-js` inside the JS engine | The original reason for the Rust crate ([[trailbase-guest-wasm-runtime-defaults]], D3): nested WASM engines are not viable inside the guest. Not an option. |
| Keep the former Node frontend's renderer | Defeats the whole re-platform; two runtimes and a second deploy. Removed 2026-09-27 ([[guest-ui-is-a-direct-shift-of-legacy]]). |

## Consequences

**Accepted**

- One `.wasm` to build, deploy and hot-reload; no port/URL plumbing between host and renderer.
- Rendering is native Rust (fast) while templates stay files that can change without a rebuild.
- The host's route table is fixed at startup, so authorable pages go through one generic file
  route in `app/` (the runtime-JS file router), as the plan requires.

**Given up / to watch**

- Rendering is not reusable by a non-JS component; extracting a `render` crate later means moving
  `render.rs` behind an HTTP or WIT boundary.
- Everything runs in one component: a blocking handler still blocks its runtime thread (mitigated
  by `--runtime-threads`; see [[trailbase-guest-cpu-js-limits]]).
- Component size rose from 5.88 MB to 7.17 MB when `minijinja` was added.

## Evidence

- `trailbase/host/src/render.rs` — the ported renderer and filters.
- `trailbase/host/src/api.rs` — the `render` bridge; `trailbase/host/src/lib.rs` — the `{ html }` response.
- Verified: `GET /page` → `200`, `content-type: text/html`, `{% extends "layout.html" %}` resolved,
  filters produced `1234.50`, `1 ctn 1 unit`, `24-Sep-2026`, `PROFIT REPORT`, `Yes`.
- [[trail-runtime-js-reference]] — the adopted host and its measurements.

## Amended framing (2026-09-28)

[[compiled-artifacts-are-generic-capabilities]] generalises this decision: the folded-in renderer
(and every other compiled piece) is a **generic capability**, so the one-component packaging chosen
here is an optimization, not a constraint on the app model. Decoupling `render.rs` behind an HTTP or
WIT boundary — as the alternative below already anticipated — changes packaging only, never app
logic.

## Superseded in part (2026-09-28)

This decision's **packaging** is now actively being revisited, not merely held open:

- [[component-split-and-sql-materialised-tables]] splits the folded-in renderer and the SQL/JS
  halves into three generic components and benchmarks both a composed single component and genuinely
  separate components. The "extracting a `render` crate later means moving `render.rs` behind a HTTP
  or WIT boundary" caveat above is now the agreed plan.
- [[manifest-driven-routing-and-data-dag]] retires the runtime-JS file router's single dispatcher,
  which was the mechanism this decision leaned on to make the host's fixed route table workable
  ("authorable pages go through one generic file route in `app/`").

What is **not** superseded: rendering stays native Rust rather than moving into the JS engine, and
report/rendering logic stays in runtime files rather than being compiled into the host. Those two
parts of D1 and D3 still hold.

## Related

- [[trailbase-guest-wasm-runtime-defaults]] — D1–D6, which this amends for D3.
- [[component-split-and-sql-materialised-tables]] — the split that supersedes the packaging.
- [[manifest-driven-routing-and-data-dag]] — the routing change that supersedes the file router.
- [[compiled-artifacts-are-generic-capabilities]] — the general invariant this is a case of.
- [[tb-0017-adopt-trail-runtime-js]] — the adoption task.
