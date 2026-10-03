---
title: An ESM import in a route.ts does not survive the guest's loader
type: issue
status: open
severity: high
created: 2026-10-03
tags: [guest, loader, esm, transform, route-ts, tb-0030, blocker]
belongs_to: "[[tb-0030-retire-the-route-ts-dispatcher]]"
related_to: ["[[tb-0032-manifest-first-refactor]]", "[[esm-shim-rewrites-text-inside-comments]]", "[[guest-helpers-pure-vs-cached]]", "[[vault-code-drift-audit-2026-10-03]]"]
---

# An ESM import in a route.ts does not survive the guest's loader

**Found 2026-10-03.** This is the blocker on tb-0030 steps 5 and 6, and it is a property of the guest's
two-stage loader rather than of anything in the app.

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

Not yet attempted, and each option costs something:

| Option | Cost |
|---|---|
| **Split the loader out** — `app/lib/loader.js`, self-contained, and give `route.ts` a ~10-line bootstrap that reads and `eval`s it | The loader then loads itself, which is fine, and `ctx.js` imports it normally. Adds one indirection. **Most promising.** |
| **Keep the loader in `route.ts`** and have `ctx.js` take it from `globalThis.__AA_LOAD__`, set before use | Explicit one-line ordering; but a route folder importing `ctx.js` would then depend on the dispatcher having been loaded. **Wrong direction** — route folders must work without it. |
| **Apply SWC inside `loadModule`** for `.ts` files | The honest fix: `transformEsm` would then need to handle typed input, or the host would expose a strip step to the guest. A Rust change plus a guest change. |
| **Stop using `import` in route files**; require `loadModule` calls | Works today, at the cost of the thing the split is for. |

The first option is the one to try. It is not blocked by anything found here — only by not having been
built.

## What was reverted

The extraction itself: `app/lib/ctx.js` (the 630-line shared context) and the repointed `route.ts`.
Both are gone; `route.ts` is back to 2,203 lines from `HEAD` and the gate is green.

Kept from the attempt, because both are worth having regardless of whether the split proceeds:

- **`tools/route-coverage.mjs` + `route-inventory.json`** — 77 routes, GET and POST, 77 reachable. The
  gate steps 5 and 6 need, and the thing that makes them safe. Already committed.
- **The findings about `route.ts` itself:** it has a collapsed line (two statements on one physical line,
  `parsePairs`), the same defect the vault documents had, and `route.ts:54`'s `transformEsm` supports
  only `export { a }` and `export { a as b } from "…"`, not a plain `export { a, b }` with aliases.

## The lesson, again

Three times this session a check that could not run has cost more than the change it was guarding:
five harnesses that had never authenticated, a route snapshot that had been snapshotting redirects, and
now a loader combination that no local check could reproduce. **A gate is only worth what it can
actually execute**, and "it passes here" means nothing when the production path differs — here by one
transform pass.

The compensating control that did work: `route-coverage.mjs` proved 77/77 on the reverted tree, which is
what made the revert safe and left no question about whether the working state still holds.

## Related

- [[esm-shim-rewrites-text-inside-comments]] — the same shim, a different failure mode.
- [[tb-0030-retire-the-route-ts-dispatcher]] — the blocked task.
- [[guest-helpers-pure-vs-cached]] — how `transformEsm` and `loadModule` are reached at runtime.
