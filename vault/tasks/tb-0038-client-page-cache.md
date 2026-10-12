---
title: "tb-0038 client page cache"
type: task
status: done
priority: medium
created: 2026-10-10
updated: 2026-10-10
tags: [guest, ui, frontend, htmx, cache, indexeddb, performance]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[guest-page-cache]]", "[[rendered-page-cache]]", "[[reference-lists-come-from-indexeddb]]", "[[htmx-navigation-with-html-fragments]]", "[[runtime-revision-is-unstable]]", "[[tb-0036-htmx-navigation]]"]
---

# tb-0038 client page cache

Cache rendered page fragments in the browser and serve a repeat boosted navigation without a request;
invalidate on the live data version. Decision and rationale: [[guest-page-cache]].

## Done (2026-10-10)

- [x] **`public/js/pagecache.js`** — IndexedDB `aa-pos-pagecache`, keyed on
      `(CACHE_REV, identity, data version, url)`, mirrored in memory so `htmx:beforeRequest`-time
      decisions are synchronous. A hit intercepts the **click** (`preventDefault` +
      `stopImmediatePropagation`, because cancelling htmx's `beforeRequest` did not stop a boosted
      link's request) and performs the swap htmx would: OOB metas applied, `#app-main` replaced, URL
      pushed, `htmx:afterSwap` dispatched so `app.js` re-enhances. A miss is left to htmx; the GET
      fragment is cached on `htmx:afterRequest`, keyed on `xhr.responseURL`.
- [x] **Invalidation** — a write reports a new data version in its response's OOB meta and clears the
      cache; `BroadcastChannel` clears other tabs; a `/data/version` probe clears on focus and on a 30 s
      interval for changes made elsewhere; the cache is dropped on the login screen so a shared browser
      cannot cross users.
- [x] **`GET /data/version`** (`ahscripts/routes/data/version/route.ts`) — the `{version}` probe,
      ETag-keyed, auth-gated.
- [x] **`<meta name="aa-user">`** in `layout.html.jinja` — the per-identity key material.
- [x] **Gate `tools/pagecache-check.mjs`** — **14 passed, 0 failed** (repeat nav served with no XHR,
      a write clears the cache, the probe answers, no page errors). The section it creates is deleted —
      net zero.
- [x] **Loading spinner** (`#aa-loading` in `layout.html.jinja`, styled in `app.css`) — htmx adds its request
      class to the element named by `hx-indicator` (inherited from `<body>`), so one element shows a
      spinner for a nav, a filter, a sort or a write. Shown after a ~150 ms delay so a fast request does
      not flash it; a cache hit shows nothing (it never reaches htmx, and it is instant).
- [x] Full suite green against `:4002`: `component-check` 19/19, `guest-smoke` 116/116,
      `grid-preview-check` 14/14, `autocomplete-check` 39/39, `hotkey-check` 62/62,
      `print-queue-check` 14/14, `route-snapshot` 50/0.

## Open

- [ ] **Code-revision staleness.** The key is the data version, not the code revision, because
      `runtimeRevision()` is unstable ([[runtime-revision-is-unstable]]). A template/edit with no data
      change is not caught by the client cache. Resolve the revision issue, then add it to the key.
- [ ] Back/forward to a server-page-cached URL currently re-fetches via htmx (htmx's history cache is
      bypassed by the manual swap). Serving popstate from the client cache is a follow-up.
