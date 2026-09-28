---
title: `/getscripts` reads `/traildepot/ahscripts`, a path the runtime root never provides
type: issue
status: open
severity: low
created: 2026-09-28
updated: 2026-09-28
tags: [trailbase, wasm, host, endpoints, paths, dead-code, layout]
belongs_to: "[[tb-0024-flatten-new-system-layout]]"
related_to: ["[[trailbase-guest-wasm-runtime-defaults]]", "[[trail-runtime-js-reference]]", "[[runtime-js-guest-platform]]", "[[tb-0025-host-endpoint-hygiene]]"]
---

# `/getscripts` reads `/traildepot/ahscripts`, a path the runtime root never provides

## The finding

`trailbase/host/src/lib.rs:109-115`, the upstream host's script-listing handler:

```rust
// We look in /jscripts.
if let Ok(entries) = fs::read_dir("/traildepot/ahscripts") {
```

The WASI sandbox root is `traildepot/runtime` — `RUN.BAT:45` passes
`--runtime-root-fs=%DEPOT%\runtime`, and the dispatcher itself resolves `/ahscripts` at
`lib.rs:191-216`. There is no `/traildepot` prefix inside the sandbox and never was once the runtime
root became a subdirectory of the depot ([[trailbase-guest-wasm-runtime-defaults]]). The read
always fails, `entries` is `Err`, and the handler returns `{"status":"ok","scripts":[]}`.

The comment above it still says `/jscripts`, which is the spelling from an even earlier spike — the
directory was renamed to `ahscripts` before this host was adopted
([[trail-runtime-js-reference]]).

## Why it is being recorded now

It was missed by the 2026-09-28 flatten ([[trailbase-flat-source-layout]]), which moved the new
system out of `trailbase/src/` and repointed `build.bat`, `clear_db.bat`, `RUN.BAT` and every
harness. The Rust source has a hard-coded WASI path that no `.bat` file controls, so a path audit
of the scripts could not see it. [[tb-0024-flatten-new-system-layout]] is amended to list it.

## What it costs

Nothing today — no app route, harness or doc calls `/getscripts`, and the empty response is
harmless. The cost is that it is a live route that can only ever answer one thing, which is
misleading to anyone probing the host.

## The fix

Either delete the route, or point it at `/ahscripts` and use it as the intended introspection
endpoint ("which scripts did the guest actually load?") — which is a genuinely useful thing to have
next to a 20-line dispatcher.

Tracked in [[tb-0025-host-endpoint-hygiene]].

## Evidence

- `trailbase/host/src/lib.rs:109-115` — the path and the stale `/jscripts` comment; read
  2026-09-28.
- `trailbase/RUN.BAT:45` — `--runtime-root-fs=%DEPOT%\runtime`.
- `trailbase/host/src/lib.rs:191-216` — the dispatcher using `/ahscripts`.
- `trailbase/clear_db.bat:31` — copies `runtime/` to `traildepot/runtime`, so the sandbox root
  contains `ahscripts/` and `app/` and nothing else.

## Related

- [[tb-0024-flatten-new-system-layout]] — the flatten that missed it.
- [[runtime-js-guest-platform]] — the routing this is the leftover of.
