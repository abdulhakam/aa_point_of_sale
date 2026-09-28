---
title: Cache rendered report pages keyed by the live data fingerprint
type: decision
status: accepted
decided_on: 2026-09-28
created: 2026-09-28
tags: [reports, performance, cache, rendering, genericity, trailbase]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[report-performance-baseline]]", "[[compiled-artifacts-are-generic-capabilities]]", "[[snapshot-persistence-hits-the-20s-deadline]]", "[[guest-report-performance-options]]", "[[runtime-js-single-host]]"]
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

- `trailbase/src/runtime/app/lib/reports.js` — `fingerprint()`.
- `trailbase/src/runtime/ahscripts/routes/_app/route.ts` — `pageCacheGet` / `pageCachePut` and the
  report page handler.
- Measured repeat times in [[report-performance-baseline]]; `guest-smoke` stays 71/71 (including
  "stock report still renders after a write" and the incremental-refresh checks).

## Related

- [[report-performance-baseline]] — before/after numbers.
- [[guest-report-performance-options]] — the cold-path work this does not replace.
