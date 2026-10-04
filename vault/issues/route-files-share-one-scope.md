---
title: Route files share one scope, so every route file must be an IIFE
type: issue
status: fixed
severity: high
created: 2026-10-04
tags: [guest, quickjs, routing, route-folders, scope, tb-0030]
belongs_to: "[[serving-a-route-from-a-route-folder]]"
related_to: ["[[esm-import-in-a-route-ts-does-not-survive-the-loader]]", "[[tb-0030-retire-the-route-ts-dispatcher]]", "[[file-router-conventions-not-a-data-dag]]"]
---

# Route files share one scope, so every route file must be an IIFE

**Found and fixed 2026-10-04.** This was the `redeclaration of 'kit'` that stopped the first attempt at
serving `/management/<entity>` from a route folder.

## The mechanism

`tb-ah-run-js`'s `run_route()` builds one wrapper per request:

```rust
(function () { ROUTE_PRELUDE })();

{code}

(async () => { … await GET(req) … })()
```

and evaluates it with `new Function`. **The route's code does not get its own scope** — everything a
route declares at top level lands in a scope shared with every other route the context has run, including
the dispatcher. So two route files that declare the same name is a redeclaration, and the error names
only the identifier, with nothing pointing at the *other* file.

## What it cost, and why it took two attempts

**Attempt 1** declared `const kit` in `management/{entity}/route.ts`. It failed with
`redeclaration of 'kit'` — and the collision was **the dispatcher's own `const kit`**, a file I had
edited in the same sitting without connecting the two.

**Attempt 2** renamed everything to `route*` to stay clear of the loader's vocabulary. It failed with
`redeclaration of 'routeKit'` — because **all four** management route files declared the same four
`route*` names, and they collide with *each other*. The rename solved the first collision by creating a
second.

## The probe that settled it

A throwaway route declaring one name per request, run against a live server:

```text
TAKEN  routeKit  routeApp  routeScreens  routeContext   <- the four names my own files declared
FREE   kit  app  screens  ctx  req  res  code  names  deps  method  loadModule  transformEsm
FREE   rout  routeway  routes  route_  Route  XrouteKit  aRoute
```

Not a prefix rule, and not the prelude — **exactly the names my four files used**. One request per name
found in about a minute what two deployments had not.

## The fix

**Every route file is wrapped in an IIFE**, which is what anyone writing a module would assume anyway,
and is the shape the host prelude already uses:

```ts
(function () {
  const routeKit = () => (globalThis).__AA_LOAD__("/app/lib/route-kit.js");
  // …
})();
```

Applied to `management/{entity}/route.ts` and `mode/route.ts`; the `_app` dispatcher is deliberately
**not** wrapped, because it is the fallback for every unrouted path and its names are module-wide by
design. The rule for anyone adding a route: *wrap it, and do not rely on a name being free.*

## The other thing this attempt established

`__AA_APP__` — the module bundle — is built by `app()`, which lives **in the dispatcher**. A route folder
never calls it. So a route file cannot assume the bundle exists; it must be able to build it, which is
the shared-context extraction (`app/lib/ctx.js`) that was reverted earlier on 2026-10-04. That work is
needed for route folders and was blocked by a different problem (the ESM/SWC composition), now solved by
the loader moving into the host. **This is the next piece, and it is a known one.**

## Related

- [[serving-a-route-from-a-route-folder]] — the parent note: what works, what does not, what to change.
- [[esm-import-in-a-route-ts-does-not-survive-the-loader]] — why the loader is in the host, which is
  what made a route file possible at all.
- [[tb-0030-retire-the-route-ts-dispatcher]] — the task this unblocks.
