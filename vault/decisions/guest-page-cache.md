---
title: "Cache rendered page fragments on the client, keyed on the data version"
type: decision
status: accepted
decided_on: 2026-10-10
created: 2026-10-10
updated: 2026-10-10
tags: [guest, ui, frontend, htmx, cache, indexeddb, performance, freshness]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[rendered-page-cache]]", "[[reference-lists-come-from-indexeddb]]", "[[guest-fingerprint-refresh]]", "[[htmx-navigation-with-html-fragments]]", "[[guest-report-result-cache]]", "[[runtime-revision-is-unstable]]", "[[tb-0038-client-page-cache]]", "[[tb-0036-htmx-navigation]]"]
---

# Cache rendered page fragments on the client, keyed on the data version

## Context

The shell survives a boosted nav and only `#app-main` is swapped, but every nav still **fetches** its
fragment. The server already avoids re-**rendering** an unchanged page ([[rendered-page-cache]]); the
network round trip — and the body transfer — remained. The owner asked (2026-10-10) to stop fetching
pages every time and to "fetch from the DB only when anything changed".

## Decision

A client **page cache** in IndexedDB (`public/js/pagecache.js`), keyed on

`(CACHE_REV, viewing identity, live data version, url)`

- **A hit serves the fragment with no request.** The `htmx:beforeRequest` decision is synchronous, so
  the store is mirrored in memory; a hit intercepts the click (`preventDefault` +
  `stopImmediatePropagation`) and performs the swap htmx would have — apply the `hx-swap-oob` metas,
  replace `#app-main`, push the URL, and dispatch `htmx:afterSwap` so `app.js` re-enhances (title,
  settings, refdb, grid, autocomplete, invoicedb). A **miss is left entirely to htmx**, whose normal
  GET fragment is then cached on `htmx:afterRequest`.
- **Freshness is the fingerprint, never a TTL** ([[guest-fingerprint-refresh]]). A write reports a new
  data version in its response's OOB meta and clears the cache; `BroadcastChannel` clears other tabs;
  a `GET /data/version` probe clears on tab focus and on a 30 s interval for changes made elsewhere.
  The version comes from `/data/version` when the page meta is blank (`dataVersionIfWarm` is often
  empty), and is adopted from each response.
- **Per identity.** The shell is per-user, so the key carries the signed-in identity
  (`<meta name="aa-user">`), and the cache is dropped on the login screen.

## Why not the alternatives

| Alternative | Why not |
|---|---|
| HTTP `ETag`/`304` on the boosted GET | htmx 2.0.4 has **no 304 handling** (0 references in the vendored min). A conditional request would hinge on the browser resolving the 304 to a cached 200 for the XHR — unverified, and it leaves a round trip per nav. Not rejected forever; the client cache removes the trip outright. |
| A **Service Worker** | Transparent to htmx, but it needs a **secure context**. `RUN.BAT` binds `0.0.0.0:4000` over **http** for LAN tills, so a service worker is unavailable in production. |
| Cancel `htmx:beforeRequest` to serve from cache | **Does not stop the request** for a boosted link in 2.0.4 (verified in the gate: the handler ran, `preventDefault` set, the XHR still fired). Intercepting the click is the point that works. |
| Key on the **code revision** too | `runtimeRevision()` is unstable per request in this environment ([[runtime-revision-is-unstable]]), so it would never hit. `CACHE_REV` (bumped on a contract change) is the weaker stand-in; the code-revision component is a follow-up once the issue is fixed. |

## Consequences

**Accepted**

- A repeat navigation to an unchanged page is served from IndexedDB with **no request** (gated:
  `pagecache-check.mjs`, the fragment is not requested).
- A write, another tab, or another device's write clears it — freshness is bounded by the write path
  and the 30 s probe, not a TTL, so [[rendered-page-cache]]'s discipline is preserved.

**Given up / to watch**

- A **staleness window** of up to the probe interval for a write made on another device that this tab
  never fetched — the same window [[reference-lists-come-from-indexeddb]] accepts for the reference
  store.
- Back/forward to a page the cache served re-fetches via htmx (its history snapshot is bypassed by the
  manual swap). Functional, one round trip; a popstate-serves-cache follow-up is recorded in
  [[tb-0038-client-page-cache]].
- A second cache with its own lifecycle and eviction (bounded to 60 entries).

## Evidence

- `trailbase/runtime/app/public/js/pagecache.js` — the store, the swap, the invalidation.
- `trailbase/runtime/ahscripts/routes/data/version/route.ts` — the probe endpoint.
- `trailbase/runtime/app/views/layout.html.jinja` — the `aa-user` meta and the loader.
- `trailbase/tools/pagecache-check.mjs` — **14 passed, 0 failed**.
- [[tb-0038-client-page-cache]] — the build log and the full gate results.
