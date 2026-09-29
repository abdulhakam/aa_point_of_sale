---
title: Guest rendering served stale templates; WASI mtime is unusable for cache invalidation
type: issue
status: fixed
severity: medium
created: 2026-09-26
tags: [trailbase, wasm, guests, rendering, minijinja, cache, limitations]
related_to: ["[[trail-runtime-js-reference]]", "[[runtime-js-single-host]]"]
---

# Guest rendering served stale templates; WASI mtime is unusable for cache invalidation

## The symptom

Editing a template on disk and re-rendering kept serving the **old** HTML for the life of the
instance. Verified directly: append a marker to `app/views/layout.html`, POST `/__render` →
the marker is absent; restart the server → the marker appears.

## Root cause

Two independent caches, neither of which can invalidate on this target:

1. **`std::fs::metadata(path).modified()` does not distinguish versions on `wasm32-wasip2`.**
   A loader cache keyed on mtime therefore never sees a change and returns the first-read
   source forever. (The same class of problem would hit any file-freshness check in a guest.)
2. **`minijinja` 2.24 caches compiled templates by name** and has **no `auto_reload`** (only
   `clear_templates()`, which needs `&mut Environment`). So even a fresh loader read would not
   be consulted after the first load of a given name.

## Fix applied

In `runtime-js` ([[runtime-js-single-host]]):

- Removed the mtime loader cache (`src/render.rs`); templates are read fresh each render.
- Wrapped the renderer in a `Mutex` and call `env.clear_templates()` before every
  `render`/`render_string`, so minijinja re-loads and re-parses from the current files.
- Added `render::with(|r| ...)` for the API bridge to use.

Verified: prime → clean; edit → marker appears; revert → clean, all without a restart.

## What it costs / to watch

- `Environment::get_template` already re-read and re-parsed per render even with the old cache,
  so the loader cache only saved a file read; removing it is cheap. `clear_templates()` adds a
  re-parse per render — acceptable at the current ~9–18 ms per-request overhead, but a **real**
  cache would need a working invalidation (content hash, or an explicit bump on deploy/SIGHUP),
  not mtime.
- Any future guest cache (report results, handler compilations) must **not** use file mtime on
  WASI. This is the same lesson for the plan's `data`/`compute` caches
  ([[trailbase-guest-wasm-runtime-defaults]]).

## Evidence

- `trailbase/host/src/render.rs` — uncached `Loader`, `clear_templates()` per render.
- Observed before the fix: `/__render` returned the pre-edit HTML indefinitely; only a process
  restart picked up the change.
- Observed after: marker present immediately after edit, absent immediately after revert.

## Related

- [[trail-runtime-js-reference]] — the render results and the parity harness.
- [[runtime-js-single-host]] — the component this lives in.
