---
title: Cache rendered report pages keyed by the live data fingerprint
type: decision
status: accepted
decided_on: 2026-09-28
created: 2026-09-28
tags: [reports, performance, cache, rendering, genericity, trailbase]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[report-performance-baseline]]", "[[compiled-artifacts-are-generic-capabilities]]", "[[snapshot-persistence-hits-the-20s-deadline]]", "[[guest-report-performance-options]]", "[[runtime-js-single-host]]", "[[guest-report-result-cache]]", "[[tb-0032-manifest-first-refactor]]", "[[one-manifest-is-the-page-definition]]"]
---

# Cache rendered report pages keyed by the live data fingerprint

## Context

The dominant hot-path cost measured on the production depot is the minijinja render of every row
plus QuickJS shaping ([[snapshot-persistence-hits-the-20s-deadline]],
[[report-performance-baseline]]). The existing KV cache stores a report's **data result**, but the
page is still rendered on **every** hit — so a repeat view of `itemsales` took 17.3 s and `payments`
2.7 s, almost all of it re-render.

## Decision

Add a **generic rendered-page cache**. A rendered report page is stored in SQLite keyed by:

`(live data fingerprint, viewing identity, report key, filters)`

- **Live fingerprint** comes from `service.fingerprint()` (the same `count:max(updated)` probe the
  materialiser uses, memoised ~1.5 s). A write moves it, so the cached page misses and is re-rendered
  — the cache cannot serve content older than the fingerprint it was keyed with.
- **Viewing identity** (the signed-in user) is in the key because the page embeds the user's shell,
  so pages are never shared across identities.
- Stored via `pagecache(key TEXT PRIMARY KEY, html TEXT)`; read is one `SELECT`, write is
  `INSERT OR REPLACE`. It is app-agnostic — it caches "a rendered page for a given route + filters",
  whatever the route is — so it belongs to [[compiled-artifacts-are-generic-capabilities]].

Implemented entirely in runtime files: `app/lib/reports.js` exposes `fingerprint()`;
`ahscripts/routes/_app/route.ts` reads/writes the cache around the report page render.

## Why not the alternatives

| Alternative | Why not |
|---|---|
| Keep the KV *result* cache only | It already exists, and the render still dominates the hit. Caching the **page** removes the render. |
| Cache only the report body fragment | The shell is cheap; caching the whole page per identity is simpler and still correct. |
| Cache keyed by the thread-local `state.version` | `state` is `thread_local` (`host/src/runtime.rs`), so the version differs per thread and is not a valid shared cache key. The data fingerprint is. |
| Serve a stale page until the minutely job runs | Correctness regression: a write must be visible immediately. Keying on the live fingerprint (≤1.5 s memo) avoids it. |

## Consequences

**Accepted**

- Repeat views drop sharply: `itemsales` 17,341 → ~1,000 ms, `profit` 16,871 → ~1,500 ms,
  `payments` 2,707 → ~650 ms, `ledgers/general` 3,473 → ~1,265 ms ([[report-performance-baseline]]).
- Generic and reversible: delete the `pagecache` rows or the table to disable.
- Data changes are honoured within the ~1.5 s fingerprint memo, then the page is re-rendered and
  re-cached.

**Given up / to watch**

- **Cold is unchanged.** The first render of a heavy report still costs the full compute + render and
  can exceed the 20 s deadline (`paymentsbycompany` still 500s). This attacks the hot path only.
- **Unbounded growth** as filters vary; a local deployment tolerates it, but an eviction policy
  (cap by age/count) is a later need.
- **Staleness window** = the fingerprint memo (≤1.5 s), not zero.

## Evidence

- `trailbase/runtime/app/lib/reports.js` — `fingerprint()`.
- `trailbase/runtime/ahscripts/routes/_app/route.ts` — `pageCacheGet` / `pageCachePut` and the
  report page handler.
- Measured repeat times in [[report-performance-baseline]]; `guest-smoke` stays 71/71 (including
  "stock report still renders after a write" and the incremental-refresh checks).

## Related

- [[report-performance-baseline]] — before/after numbers.
- [[guest-report-performance-options]] — the cold-path work this does not replace.

## Update 2026-10-02 — the key also carries the CODE revision

The key was the live **data** fingerprint plus the viewing identity, the report and its filters. That
made a write miss and re-render, and said nothing about code. Edit a `.sql` file or a manifest,
restart, and the first request found an entry whose data fingerprint was still valid and served the
**old** HTML. Nothing looks wrong; the numbers are simply yesterday's code.

It is now paths.runtimeRevision(): an FNV-1a content hash of every file under the runtime root,
computed once per process. Proof, on the production depot:

1. Load `/reports/payments` — 2.5 s cold, then 151 ms and 121 ms from cache. One cache key,
   `rev-36edb03a-111`.
2. Change `app/pages/reports/payments/meta.json`'s title, `RUN.BAT`'s robocopy, restart.
3. Load the page again — it renders the **new** title, and the cache holds **two** keys with different
   revisions (`rev-36edb03a-111` and `rev-8f8941e8-111`). Without the revision the old title
   would have been served from cache.

Three details that are not obvious:

- **The root is the runtime root, not `/app`.** `ahscripts/` is a *sibling* of `app/`, and
  `ahscripts/routes/_app/route.ts` is the 1,900-line dispatcher. Walking `/app` covered 109 of
  the tree's 111 files and left the one file most likely to change during
  [[tb-0032-manifest-first-refactor]] outside the cache's view. Found by counting, not by reasoning.
- **Content, not a timestamp.** The guest has `fs.readdir`, `fs.readFile` and `fs.exists` and
  **no** `stat`, so mtime is not available — and a timestamp would miss an edit that preserves it
  (robocopy, a checkout, a restore from backup).
- **A path is hashed even when its content will not read.** Otherwise the size of the hole depends on
  what the bridge happens to refuse, which is not knowable from the guest. Adding, renaming or
  removing any file always invalidates; only an in-place edit of an unreadable file is invisible.

Memoised once per process, and that is safe **because** `RUN.BAT` always mirrors `runtime\` into
the depot *and* always restarts the server, so a new revision and a new process arrive together.
Recomputing per request would mean reading 582 KB of app source on every page view.

This closes the trap [[one-manifest-is-the-page-definition]] recorded under *Not done*.
