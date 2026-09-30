---
title: Generic route helpers live in the guest, but only pure stateless ones are worth Rust
type: decision
status: accepted
decided_on: 2026-09-30
created: 2026-09-30
tags: [trailbase, guest, quickjs, rust, refactoring]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[file-router-conventions-not-a-data-dag]]", "[[guest-bridges-are-function-new-not-export]]", "[[three-reference-docs-lost-their-line-structure]]", "[[compiled-artifacts-are-generic-capabilities]]", "[[report-logic-stays-runtime-file-based]]"]
---

# Generic route helpers live in the guest, but only pure stateless ones are worth Rust

## Context

The file-router work needs four helpers that the 1785-line `route.ts` wrote by hand at ~80 call
sites, and it was worth asking whether writing them in Rust and exposing them to QuickJS was better
— since `api.rs` already exposes `sqlite`, `kv`, `fs`, `http`, `time` and `render` to the
interpreter, so it is the existing architecture, not a new capability.

Counted: `write()`-class `invalidate` sites 16 (11 adjacent to a write), `page(req, shell(...), tpl,
data)` triple-nests 25, `getViews(["refs"])` 9, `base64ToHex` 24, `hexToBase64` 4.

## Decision

**Split by whether the code needs a cache with invalidation or a conversation with the app — not by
whether it is "generic".**

In the guest (QuickJS):

| Helper | Why JS |
|---|---|
| `write(fn)` | Invalidate-on-commit is a *control-flow* rule. It is also currently held by discipline — `[[reports.no_precomputation]]` requires a write to drop the snapshot, and nothing enforces that but remembering. `write` makes it the call's type. |
| `refs()` | Ergonomic only — `getViews` **already** memoises (`state.views.refs`), so there is no cache to win. It removes 9 handlers' worth of `refs.parties ?? []`. |
| `renderRoute()` | Derives `active`/`title` from the route. Revisit once templates can see the route table as data. |

In Rust (`tb-ah-run-js/src/api/ids.rs`):

| Helper | Why Rust |
|---|---|
| `hex`/`b64` | Pure, stateless, bit-twiddling, 28 call sites — and it replaced **three** divergent JS copies (`route.ts`'s local `hexToBase64`, `management.base64ToHex`, and `route-kit`'s). `route.ts:303-309` documented a padding bug that made an id decode to a value matching *nothing*, silently. That class of bug is worth writing once in a bounds-checked language. |

**Implementation note that makes the decision cheap.** The component does not use `#[export]` at
all: every bridge is registered by hand with `Function::new` (`api.rs:17`, `api.rs:70`). So "write
it in Rust and expose it to JS" is not a macro question at all — a pure sync function needs no
`wit_bindgen` support, and it is registered exactly like `render.html`. The JS side keeps a
fallback for an older component, and `tools/id-codec-check.mjs --compare` runs both against the
same vectors so the two implementations cannot drift silently.

**Fan-out stays in JS.** `lib/queue.js:204-256` is a claim-batch-dispatch loop; its parallelism is
already Rust (each `/worker/1/step` POST is a host worker thread), and `jobs.rs` schedules one
minutely job. The concurrency cap is `Math.min(4, …)` — a tuning knob behind the ~20 s WASM
deadline, and a one-character edit in JS is the reason it belongs there.

## Consequences

- **Rust once it stabilises, JS while it churns.** Every Rust helper is a `build.bat` → WASM →
  `clear_db.bat` → restart cycle. A 20-line function edited weekly is a poor candidate; a 30-line
  bit-fiddler edited twice is a clear one.
- **Moving boilerplate to Rust is a pessimisation.** The router, manifest reader and param coercion
  run once per request; compiling them into the host buys nothing and costs a redeploy.
- **`refs()` was originally planned as "memoised on `snap.version`".** That was wrong and was
  corrected on implementation: `getViews` already caches, so the helper is ergonomic only.
- The id codec needed a test the moment it moved, and got one (`tools/id-codec-check.mjs`) — see
  [[a-base64-alphabet-error-is-silent]].

## Related

- [[guest-bridges-are-function-new-not-export]] — the mechanism this decision relies on; see it
  before assuming a Rust move needs a macro.
- [[a-base64-alphabet-error-is-silent]] — the concrete bug this rule was written against.
- [[report-logic-stays-runtime-file-based]] — the hot path (33k–60k rows through QuickJS) is report
  arithmetic, not router boilerplate; that is the opposite trade.
- [[compiled-artifacts-are-generic-capabilities]] — compiled artifacts stay app-agnostic, which is
  why the router deliberately does *not* become one.