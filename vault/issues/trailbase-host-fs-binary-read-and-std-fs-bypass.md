---
title: The guest's `fs` bridge has no binary read and bypasses the WASI bridge for half its API
type: issue
status: open
severity: low
created: 2026-09-28
updated: 2026-09-28
tags: [trailbase, wasm, host, fs, assets, wasi, limitations]
related_to: ["[[tb-0018-port-app-host-on-runtime-js]]", "[[guest-app-host-port]]", "[[runtime-js-guest-platform]]"]
---

# The guest's `fs` bridge has no binary read and bypasses the WASI bridge for half its API

## The finding

`trailbase/host/src/api/fs.rs` exposes `readFile`, `writeFile`, `exists` and `readdir` to scripts, and
they are not consistent with each other:

- **`readFile` with `encoding: "binary"` silently returns a UTF-8 string.**
  `api/fs.rs:51`: `// Need to check rquickjs docs or just map to string for now.` The option is
  accepted and ignored; the result is a string, so a caller asking for bytes gets mangled data
  rather than an error.
- **`writeFile` is a blocking `std::fs::write`** (`api/fs.rs:68`), not the async
  `trailbase_wasm::fs` path `readFile` uses.
- **`exists` and `readdir` use `std::fs` directly** (`api/fs.rs:14-30`) rather than the
  `trailbase_wasm` bridge. Same class of concern as `/getscripts`: the preopen and sandbox
  behaviour of   `std::fs` inside a guest is not guaranteed to match the bridge the SDK provides
  ([[trailbase-host-getscripts-reads-wrong-root]] is the concrete case where it did not).

## What it costs

- **No binary asset path.** `tb-0018` already lists "binary static assets" as an open item and notes
  "current assets are all text" — that is still true. Today the app's own assets
  (`runtime/app/public/`: `app.js`, `page.js`, `app.css`, `favicon.svg`) are all text, so nothing is
  broken, but the *silent* fallback means the day someone adds a PNG it fails as corrupt data
  rather than as a clear error.
- **Mixed sandbox semantics.** Two ways to reach the same filesystem, one of which is the SDK's
  and one of which is not, is a latent source of "works in one place, not the other".
- Nothing documents any of it: [[runtime-js-guest-platform]] mentions the globals only in passing.

## The fix

- Make `encoding: "binary"` either return bytes or reject loudly; do not accept an option and
  ignore it.
- Route `exists` / `readdir` / `writeFile` through the same `trailbase_wasm` bridge as `readFile`,
  or state in the README why `std::fs` is the deliberate choice.
- When the app needs binary assets, decide then whether the guest needs to serve them at all — the
  `{ body, contentType }` response shape in `lib.rs:289-303` already handles content types, so
  serving a binary file may need no bridge work beyond a byte path.

## Evidence

- `trailbase/host/src/api/fs.rs:14-30` — `exists` / `readdir` on `std::fs`.
- `trailbase/host/src/api/fs.rs:51` — the binary-encoding comment.
- `trailbase/host/src/api/fs.rs:68` — the blocking `std::fs::write`.
- `trailbase/host/src/lib.rs:13,115` — `trailbase_wasm::fs::read_file` is what `readFile` uses, in
  contrast.
- `vault/tasks/tb-0018-port-app-host-on-runtime-js.md:46` — the open "binary static assets" item.

## Related

- [[runtime-js-guest-platform]] — the globals list this belongs in.
- [[tb-0018-port-app-host-on-runtime-js]] — the task that already flags the binary gap.
