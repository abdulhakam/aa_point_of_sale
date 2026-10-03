---
title: An ESM import in a route.ts does not survive the guest's loader
type: issue
status: fixed
severity: high
created: 2026-10-03
updated: 2026-10-03
tags: [guest, loader, esm, transform, route-ts, tb-0030, blocker]
belongs_to: "[[tb-0030-retire-the-route-ts-dispatcher]]"
related_to: ["[[tb-0032-manifest-first-refactor]]", "[[esm-shim-rewrites-text-inside-comments]]", "[[guest-helpers-pure-vs-cached]]", "[[vault-code-drift-audit-2026-10-03]]"]
---

# An ESM import in a route.ts does not survive the guest's loader

**Found and FIXED 2026-10-03, by moving the loader rather than working around it.**

> ## The fix
>
> The loader — `MODULE_CACHE`, `transformEsm`, `loadModule`, `normalizePath`, `dirOf`, `resolveSpec` —
> was **~110 lines of JavaScript living inside `ahscripts/routes/_app/route.ts`**, so only that one file
> could use it. That is the actual defect. Everything else follows from it:
>
> - A route entry could not `import` a shared module, because `route.ts` is type-stripped by SWC and
>   *then* ESM-rewritten by a regex shim, and that composition does not survive an import statement.
> - Anything that wanted the loader had to live *inside* route.ts, which is why the shared context was
>   heading for a second JS module — **more** files, the opposite of the direction we want.
>
> So the loader moved **into the host**: `tb-ah-run-js`'s `run_route()` now prepends a `ROUTE_PRELUDE`
> constant to every route, which installs a deliberately small surface on `globalThis`:
>
> ```js
> g.__AA_LOAD__ = loadModule;
> g.__AA_TRANSFORM_ESM__ = transformEsm;
> ```
>
> Consequences:
>
> - **Every route entry has a loader**, with no `import` and no local copy. `route.ts` shrank by **112
>   lines** (2,204 → 2,114) and kept one line: `const loadModule = globalThis.__AA_LOAD__`.
> - Verified by a probe route with **no import and no local loader** that loaded two shared modules and
>   called into them: `loader ok; reports=14; sections=0`.
> - `route-snapshot` 49 routes / 0 erroring, `route-coverage` **77/77**, `guest-smoke` passing in full.
>
> This is also the shape the rest of the programme wants. With the loader available to every route, a
> route that needs one helper calls `__AA_LOAD__("/app/lib/x.js")`, and **most routes need no
> JavaScript at all** — which is what makes "fewer JS files, more manifests" achievable rather than
> blocked. See [[tb-0030-retire-the-route-ts-dispatcher]].
>
> The prelude is **generated** from `route.ts` lines 20–131 with only the type annotations removed, and
> the generator asserts its own output: `node --check`, zero remaining annotations, and that a known
> comment survived intact.

The rest of this note is the diagnosis, kept because the failure mode is the lesson.

## What happens

A route's `.ts` file is put through **two** transforms before it runs:

1. the host's Rust `ts_transform` (SWC) strips types — **entry files only**;
2. `transformEsm` (`ahscripts/routes/_app/route.ts:54`) rewrites ESM to a CommonJS-ish shim with
   `new Function`.

`app/lib/*.js` modules get **only** step 2. That asymmetry is the whole problem, and it is why
`app/lib/` is `.js` today: `transformEsm` is a regex shim and does not strip types.

A repointed `route.ts` that reaches for a shared module the ordinary way —

```ts
import { app as modules, loadModule, PAGES_DIR } from "/app/lib/ctx.js";
```

— produces a file that **transforms cleanly in Node and fails in the guest** with:

```text
Route execution failed: Unexpected token '{'
```

on every route, at module load, before any handler runs.

## Why it is hard to diagnose

Three properties made this expensive:

- **`node --check` passes.** The source is valid TypeScript, and so is its transformed form.
- **The transformed form passes too.** Running the guest's own `transformEsm` over the file and handing
  the result to `new Function` compiled cleanly — every time. The failure only appears after step 1,
  which is SWC and is not reproducible in Node.
- **The error names a token, not a place.** `Unexpected token '{'` appears identically for every route,
  so it reads like a broken route rather than a broken loader.

Three rounds went into this. Two were my own probe lying to me, and both are worth recording:

- The probe reported `Unexpected end of input` for a file whose only fault was that the extraction had
  carried over an `(function () {` **opener** whose closer stayed in `route.ts`. One line, whole-module
  failure.
- After that, the probe reported `Identifier 'latestPeriod' has already been declared` — which was
  **real**: `latestPeriod` and `filtersFor` sat between `dispatch` and `handle`, so a naive "keep
  everything from `dispatch`" cut duplicated two functions that had already moved.

## What would fix it

**The fourth option is the one that was built**, by moving the loader into the host — see the top of this
note. The others are kept because the reasoning still applies the next time a route needs something the
loader does not provide.

| Option | Status |
|---|---|
| **Move the loader into the host** — `run_route()` prepends it to every route | **DONE.** ~112 lines leave `route.ts`, every route gets a loader, no ESM needed anywhere |
| **Split the loader out** — `app/lib/loader.js`, self-contained, with a ~10-line bootstrap in `route.ts` | Superseded. It solves the same problem and leaves the loader reachable only from the dispatcher, which is the wrong direction: a route folder must work without the dispatcher |
| **Keep the loader in `route.ts`** and hand it to `ctx.js` via `globalThis.__AA_LOAD__` set before use | Same wrong direction as above — it makes every consumer depend on the dispatcher having loaded first |
| **Apply SWC inside `loadModule`** for `.ts` files | The principled version, and still the one to do if something else needs the loader to be transparent to `import`. `transformEsm` would then have to cope with typed input, or the host would expose a strip step to the guest |
| **Stop using `import` in route files**; require `loadModule` | Unnecessary once the host injects the loader — `__AA_LOAD__` is one call and needs no import |

The third option — applying SWC inside `loadModule` — is the honest long-term fix and is **not** done.
It was not needed here because moving the loader out of `route.ts` solves the actual problem, which was
that the loader was trapped in one file rather than that `import` was unsupported.

## What was reverted, and what survived

Reverted: the first extraction attempt — `app/lib/ctx.js` (the 630-line shared context) and a
repointed `route.ts` that reached it with ESM. That path was abandoned for two reasons: it produced
**more** JavaScript, which is the opposite of the direction we want, and it could not be made to load.

Kept, because all three stand on their own:

- **`tools/route-coverage.mjs` + `route-inventory.json`** — 77 routes, GET and POST, 77 reachable. The
  gate steps 5 and 6 need, and the thing that makes them safe.
- **The loader move**, which is the actual fix and required no extraction at all: the loader left
  `route.ts` and went into the host. That is what unblocks the split.
- **Two findings about `route.ts` itself:** it has a **collapsed line** — `parsePairs` has two
  statements on one physical line, the same defect the vault documents had
  ([[three-reference-docs-lost-their-line-structure]]) — and `transformEsm`'s `export { … }` support is
  **partial**: it handles `export { a }` and `export { a as b } from "…"`, but a plain aliased list like
  `export { a as b, c }` emits code only for the aliased entries and silently drops the rest.

## The lesson, twice over

Three times this session a check that could not run has cost more than the change it guarded: five
harnesses that had never authenticated, a route snapshot that had been snapshotting redirects, and a
loader combination no local check could reproduce. **A gate is only worth what it can actually
execute**, and "it passes here" means nothing when the production path differs — here by one transform
pass.

And the diagnosis was wrong in an instructive way. I concluded "SWC breaks ESM imports" from the
*absence* of a local reproduction, not from evidence, and said so at the time. The real cause was one
level up: the loader was trapped in a single file. Fixing that fixed the import problem **and** removed
112 lines of JavaScript, where chasing the import would have fixed neither.

## Related

- [[esm-shim-rewrites-text-inside-comments]] — the same shim, a different failure mode.
- [[tb-0030-retire-the-route-ts-dispatcher]] — the blocked task.
- [[guest-helpers-pure-vs-cached]] — how `transformEsm` and `loadModule` are reached at runtime.
