---
title: Serving a route from a route folder — what works and what does not
type: note
status: active
created: 2026-10-04
tags: [tb-0030, routing, route-folders, guest, quickjs, findings]
belongs_to: "[[tb-0030-retire-the-route-ts-dispatcher]]"
related_to: ["[[esm-import-in-a-route-ts-does-not-survive-the-loader]]", "[[file-router-conventions-not-a-data-dag]]", "[[tb-0032-manifest-first-refactor]]", "[[vault-code-drift-audit-2026-10-03]]"]
---

# Serving a route from a route folder — what works and what does not

An attempt on 2026-10-04 to serve `/management/<entity>` from
`ahscripts/routes/management/{entity}/route.ts` instead of the dispatcher. **Reverted** — the tree is
back to `834a7f0c` and every gate is green. What it established is worth more than the change would
have been, because four of the five unknowns are now answered and the fifth is cheap.

## What works

- **The host's `{param}` matching is real and the route folder is reached.** The server log shows
  `Path: //management/parties` arriving with no dispatcher branch matching, and the folder's handler
  running. The pattern in `resolve_route_file` (`tb-ah-run-js/src/lib.rs`) is load-bearing and works.
- **A route file needs no `import` and no local loader.** `globalThis.__AA_LOAD__` — injected by the
  host's prelude — loaded shared modules and called into them from a route file with neither.
- **The write routes work.** `POST /management/sections/create` created a row and redirected, from
  `ahscripts/routes/management/{entity}/create/route.ts`.
- **The entity table genuinely needs no per-screen code.** `app/lib/screens/management.js` is
  entity-agnostic; every field, column, label and soft-delete flag came from
  `app/manifests/entities.json`. The direction is right.

## Four things that are not obvious, and cost the most time

1. **`URLSearchParams` does not exist in the guest.** It is QuickJS, so reaching for it is a
   `ReferenceError`, not something feature detection can avoid. The query has to be parsed by hand —
   `routeKit.parsePairs` moved into `route-kit.js` for it.

2. **The host matches route folders by EXACT path shape.** `POST /management/<entity>/create` needs
   its own folder even though the handler is the same generic one, and so do `…/<id>/update` and
   `…/<id>/delete` — three near-identical files. A single `{action}` folder would also match
   `…/<id>/anything` and put the routing decision back into a string comparison, which is the thing
   the host already does correctly. Three thin folders is the better shape.

3. **A route file receives the host's `req`, not the dispatcher's.** The host publishes
   `globalThis.__TRAILBASE_REQ__`, which has `method`/`url`/`headers`/`body` and **not** the `path`,
   `query` and `user` the dispatcher synthesised. Anything a shared helper expects from `req` has to
   be built from the host's shape first.

4. **`__AA_APP__` is not available while `app()` is still building it.** The first attempt read
   `__AA_APP__.routeKit` inside a delegate that `business()` calls during start-up, and every route
   answered `cannot read property 'routeKit' of undefined`. The fix is to publish route-kit on its
   own global *before* the bundle is assembled — and route-kit has to load **first**, ahead of the
   twenty other modules.

## SOLVED 2026-10-04: route files share ONE scope

**The blocker is fixed and diagnosed.** `run_route()` evaluates the prelude and each route's code in one
`new Function`, so a top-level name in a route file can collide with any other route's — including the
dispatcher's. Both `redeclaration` failures were this: the first against the dispatcher's own `kit`, the
second against *the four management files colliding with each other*.

A one-name-per-request probe found it in a minute:

```text
TAKEN  routeKit  routeApp  routeScreens  routeContext   <- my own files' names
FREE   kit  app  screens  ctx  req  res  code  loadModule  transformEsm
FREE   rout  routeway  routes  route_  Route  XrouteKit  aRoute
```

Not a prefix rule — exactly the names my files used. **The fix is that every route file is an IIFE**, so
its names are private. Full account: [[route-files-share-one-scope]].

## The piece that was missing — DONE 2026-10-05

**`__AA_APP__` was built by `app()`, which lived in the dispatcher** — a route folder never calls it, so it
could not assume the module bundle existed. `__AA_LOAD__`, `__AA_APP__` and `__AA_KIT__` were all confirmed
present in a route's scope, and `routeScreens()` and `entityList()` both work when called from a probe
with a real entity. The remaining work was the shared-context extraction: move `app()` (and the helpers it
closes over) into `app/lib/`, loaded through `__AA_LOAD__` like every other module.

**Built 2026-10-05.** `app()` now lives in **`app/lib/context.js`**, which exports `app()`, `business()`
and `DEFAULT_BUSINESS`. It closes over nothing from the dispatcher (`loadModule` is the host global), and
`route.ts` keeps only a thin `app()` alias plus a delegating `business()`. The whole `/management/<entity>`
family followed: GET from `ahscripts/routes/management/{entity}/route.ts`, and create/update/delete from
the three sibling folders — each an IIFE, only the method-named global published, the dispatcher branches
deleted, `guest-smoke.mjs` **95/95**. See [[tb-0030-retire-the-route-ts-dispatcher]] step 5 for the entry.

Three things the move made concrete, all already costing time once:

- **A folder MUST apply the AUTH GATE itself.** The dispatcher gated every authenticated route at one
  point before its branches; a folder bypasses the dispatcher, so without an explicit
  `if (!user) return loginRedirect(...)` it serves an anonymous request — and for a write, **executes**
  it. This is a security regression, not a cosmetic one. `userOf`/`loginRedirect` now live in
  `route-kit`, and `guest-smoke.mjs` asserts the anonymous redirect for both a management read and a
  management write.
- **A path id must be left RAW.** Ids are padded base64url (`…==`) and `=` is legal in a path segment.
  Percent-encoding it to `%3D` feeds the tolerant base64 decoder a `3` and a `D` as sextets and produces
  an id that matches no row — a **silent no-op update that still redirects `303 ?message=Updated`**.
  Query ids ARE encoded; path ids are not.
- **`req` is the host's shape**, with `query` as a raw STRING and no parsed `{param}` values, so the
  folder re-parses its own path with a regex.

A correction to the design's file layout, worth knowing before writing the next folder: the host resolves
**`route.{ts,js}`** in the matched folder and calls the method-named export (`globalThis.GET` / `POST` /
…) — *not* the `route.json` + `loader.js` + `action.js` the decision proposed. The intent is unchanged;
the names are not what the host implemented.

## The one that stopped it

**`redeclaration of 'kit'`,** on a file that declares `kit` exactly once — verified by reading it.

The cause is structural and I did not get to confirm it: **the host prelude and the route file share a
scope.** `run_route()` prepends `ROUTE_PRELUDE` — which declares `MODULE_CACHE`, `transformEsm`,
`loadModule`, `normalizePath`, `dirOf`, `resolveSpec` — to the route's own code inside one
`new Function`. The prelude wraps itself in an IIFE, so those names are function-scoped *to the
prelude*, and the route file should be free to reuse them. It was not.

⚠️ **This is a hypothesis, not a diagnosis.** What I could not do is reproduce it locally: `transformEsm`
now lives in the **Rust prelude**, so the probe that reads it out of a JS file and compiles the route
locally no longer has a source to read. That probe was the only thing that made this class of bug
visible, and moving the transform into Rust took it away — which is an argument for keeping a
JS-readable copy of the transform, or for reproducing it in the test harness from the Rust source.

## What a second attempt should do differently

- Name the route file's helpers so they cannot collide with anything the prelude might introduce
  (`kit` is a plausible name for a helper *and* plausible prelude vocabulary).
- Publish the shared modules on their own globals before the bundle, so no delegate depends on
  `__AA_APP__` existing.
- Build the dispatcher's `req` shape (`path`, `query`, `user`) in the route folder before calling any
  shared helper — do not assume a shared helper's `req` is the dispatcher's.
- Keep the probe. Reproducing the guest's transform in the harness is what made four of the five
  findings findable in under an hour.

## Related

- [[esm-import-in-a-route-ts-does-not-survive-the-loader]] — why the loader moved to the host, which
  is what made this attempt possible at all.
- [[file-router-conventions-not-a-data-dag]] — the decision these folders implement.
- [[tb-0030-retire-the-route-ts-dispatcher]] — the task this is for.