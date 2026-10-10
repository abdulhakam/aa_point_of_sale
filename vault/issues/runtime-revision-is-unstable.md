---
title: runtimeRevision() returns a different value on every request
type: issue
status: open
severity: high
created: 2026-10-10
updated: 2026-10-10
tags: [trailbase, guest, cache, performance, rendering, defect]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[rendered-page-cache]]", "[[guest-page-cache]]", "[[tb-0038-client-page-cache]]"]
---

# runtimeRevision() returns a different value on every request

`app/lib/paths.js` `runtimeRevision()` is meant to be a **content hash of the runtime tree, memoised
once per process** — the value the rendered-page cache keys on so an edit to a `.sql`/manifest
invalidates cached HTML ([[rendered-page-cache]]). Observed 2026-10-10: it returns a **different hash
on every request**.

## Evidence

On the dev server (`trailbase/traildepot`, `--runtime-root-fs=runtime`, 2026-10-10), consecutive
requests to `/data/version` (a route that returns `runtimeRevision()`):

```
rev-2e6dd4f0-235
rev-2e6dd4f0-235
rev-c7513242-235
rev-f04c5b41-235
```

and the same flip in the `aa-runtime-rev` meta on three consecutive `/dashboard` loads
(`rev-f04c5b41-235`, `rev-c7513242-235`, `rev-2e6dd4f0-235`). The file **count** (`-235`) is stable and
equals the runtime tree size; only the hash moves. The runtime tree has no file modified during the
window (checked: nothing under `runtime/` changed in the preceding 2 h except the files this session
edited, which are static thereafter).

`paths.js` memoises `revision` in a module-level binding, and `context.js` loads `paths.js` through
`loadModule` — so either the module is re-instantiated per request (the memo never persists) **and**
the walk is nondeterministic, or the walk's input genuinely varies. A deterministic walk over an
unchanged tree cannot produce different hashes, so one of those two is true; the walk itself
(`fnv1a`, sorted `readdir`, `path\0length\0content`) is deterministic, which points at the *content
the bridge returns* varying between requests.

## Impact

- **The rendered-page cache may never hit.** Every render is stored under a fresh
  `(revision, fingerprint, …)` key, so a repeat view misses and re-renders — the exact cost
  [[rendered-page-cache]] exists to remove. If true in production, the ~1 s repeat-view figures are
  not what ships.
- It forced the client page cache ([[guest-page-cache]]) to key on the **data version only**;
  `aa-runtime-rev` is emitted but unused, and a code-only change is not caught by the client cache.

## Not yet established

Whether production (`RUN.BAT`, `--runtime-root-fs=<depot>\runtime`) is affected. The observation is
from the dev invocation against the **source** runtime; the depot copy may behave differently. Before
acting: run the same probe against a `RUN.BAT` server, and against a tree with a single small file to
isolate the variable input.

## Candidate causes to check

- `fs.readdir`/`fs.readFile` in the host bridge returning a value that varies per call (order is
  sorted by the walk, but a *set* difference or a partial read would move the hash).
- The module being re-evaluated per request, combined with a per-call-varying read.
- The walk root resolving to a directory containing a transient file under some invocations (the
  count is constant here, which argues against this).
