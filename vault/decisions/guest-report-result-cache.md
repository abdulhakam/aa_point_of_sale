---
title: Report results are cached in the KV store, keyed by a per-process nonce and version
type: decision
status: accepted
decided_on: 2026-09-26
created: 2026-09-26
tags: [trailbase, wasm, rquickjs, data, cache, reports, phase-5]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[guest-fingerprint-refresh]]", "[[guest-app-host-port]]", "[[reports-and-ledgers]]"]
---

# Report results are cached in the KV store, keyed by a per-process nonce and version

## Context

The guest recomputes a report on every `/p/<slug>/data` request. Its ETag gives a `304` only when
the client revalidates; a plain repeat still pays the full view build (seconds on real data). The
Node service keeps a bounded in-process report cache (`MAX_CACHED_REPORTS`); the guest has no
in-process map that survives across requests in a controlled way, but it does have the depot's KV
store.

## Decision

- Cache the computed result in **KV** under
  `rpt:<nonce>:<version>:<report>:<JSON(filters)>`.
  - **`nonce`** is generated once per process, so a restart never serves a stale entry (the KV
    store persists across restarts).
  - **`version`** increments on every snapshot rebuild and on `invalidate()`, so a data change makes
    new keys and old ones are simply never read again.
- A cache miss computes and writes back (best effort — a KV failure never fails a report);
  `GET /reports/status` exposes `reportCacheHits`/`reportCacheMisses`.

## Consequences

**Accepted**

- A repeated identical report request is served from KV instead of rebuilding the views
  (smoke asserts `reportCacheHits >= 1` and an identical result).
- No invalidation logic is needed beyond the version in the key.

**Given up / to watch**

- **No TTL or eviction**: entries accumulate in the KV store for the life of the depot (old versions
  become unreachable garbage). A cleanup job (the queue poller could do it) is the follow-up.
- `JSON.stringify(filters)` must be stable for a hit; the filter maps are built in a fixed order, so
  it is — a future filter added out of order would silently reduce the hit rate, not corrupt output.
- The cache stores the whole result (rows included), so very large reports write a large KV value.

## Evidence

- `trailbase/runtime/ahscripts/lib/reports.js` — `cacheKey`, `run`, `invalidate`, `status`.
- The guest smoke (`trailbase/tools/guest-smoke.mjs`) asserts a repeat run is a cache hit with an
  identical result: every check in the suite passes.

## Related

- [[guest-fingerprint-refresh]] — what makes a new `version`.
- [[guest-app-host-port]] — the app host this lives in.
