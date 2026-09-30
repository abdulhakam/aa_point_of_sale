---
title: Guest bridges are hand-registered Function::new, not #[export]
type: reference
status: current
created: 2026-09-30
tags: [trailbase, guest, quickjs, rust, bridge]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[guest-helpers-pure-vs-cached]]", "[[compiled-artifacts-are-generic-capabilities]]", "[[a-base64-alphabet-error-is-silent]]", "[[build-and-run]]", "[[performance-and-caching]]"]
---

# Guest bridges are hand-registered `Function::new`, not `#[export]`

## The fact

`tb-ah-run-js` exposes host capabilities to QuickJS by building objects with
`rquickjs::Function::new` inside `init_api` (`src/api.rs:11`), **not** through a
`#[export]` attribute or `wit_bindgen`'s generated export macro.

```rust
render.set(
    "html",
    Function::new(ctx.clone(), |name: String, ctx_val: Opt<JsValue>| -> Result<String> { … }),
)?;
```

Only the *world entry point* uses the macro machinery (`lib.rs:92` — `export!(Endpoints)`); the
JS-facing bridges are ordinary Rust functions installed onto globals.

## Why this matters

It makes "write it in Rust and expose it to JS" a **non-question** for helper code. There is no
`#[export]` attribute to satisfy, no async signature requirement, no macro expansion to satisfy —
a pure synchronous function is registered exactly like `render.html`.

So the decision of whether a helper belongs in Rust or in the guest is decided purely by *what it
does*, not by what the bridge mechanism can express. See [[guest-helpers-pure-vs-cached]] for the
split that follows from this: stateful or cache-carrying helpers stay in JS, and only pure
stateless ones (currently just the id codec, `src/api/ids.rs`) move to Rust.

## The pattern

| Kind | How | Example |
|---|---|---|
| Async I/O | `Function::new(ctx, Async(f))` | `db.query`, `db.execute` (`api.rs:17`, `:25`) |
| Pure/sync | `Function::new(ctx, closure)` | `render.html`, `ids.b64ToHex` (`api.rs:70`, `api/ids.rs`) |
| Namespaced | an `Object` then `globals.set(name, obj)` | `render`, `ids`, `kv`, `fs` |
| Logging | closure over `Rest<JsValue>` | `console.log` (`api.rs:30`) |

An `Async(..)` wrapper on a pure function adds a promise tick per call for no benefit — which
matters for the id codec, called 28 times per request.

## Registered bridges

| Global | Source | Notes |
|---|---|---|
| `db.query` / `db.execute` | `api/sqlite.rs` | the guest's only mutation path |
| `render.html` / `render.string` | `api.rs:67-90` | minijinja; context passed as a JS value, not a JSON string |
| `ids.b64ToHex` / `ids.hexToB64` | `api/ids.rs` | the id codec; JS fallback retained in `route-kit.js` and `management.js` |
| `kv`, `fs`, `http`, `time` | `api/*.rs` | |

## Caveats found while doing this

- **`app/lib/*.js` is cached on `globalThis`** (`route.ts:20-24`). `ahscripts/` is re-read per
  request; `app/` is not. Editing a lib module and re-requesting serves the old one — **restart the
  server**.
- **The host coerces guest booleans** through the response serializer in ways that can surprise a
  JS assertion; compare with `String(x).trim() === 'true'` rather than encoding the quirk.
- Adding a bridge with a JS fallback means **two implementations of the same thing**. For a codec
  that is genuinely dangerous, so `tools/id-codec-check.mjs --compare` runs both against the same
  vectors instead of assuming equivalence ([[a-base64-alphabet-error-is-silent]]).

## Related

- [[guest-helpers-pure-vs-cached]] — the JS-vs-Rust rule this mechanism makes possible.
- [[compiled-artifacts-are-generic-capabilities]] — why the router stays out of a component.