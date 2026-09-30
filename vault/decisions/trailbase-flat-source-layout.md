---
title: Flatten the new system: host/ and runtime/ are peers, not src/ children
type: decision
status: accepted
decided_on: 2026-09-28
created: 2026-09-28
tags: [trailbase, layout, structure, build, wasm, navigation]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[trailbase-src-depot-layout]]", "[[runtime-js-guest-platform]]", "[[build-and-run]]", "[[environment]]", "[[trailbase-guest-wasm-spike-results]]", "[[tb-0024-flatten-new-system-layout]]"]
---

# Flatten the new system: host/ and runtime/ are peers, not src/ children

## Context

The new system had been laid out as `trailbase/src/{host,runtime,tools,migrations,config,metadata}`
since [[trailbase-src-depot-layout]] (2026-09-27). In practice that indirection cost more than it
gave: `src/` held five unrelated kinds of thing (a Rust crate, an app, harnesses, migrations, server
config), the compiled engine and the editable app were buried a level apart, and every path a
reader had to type carried the `src/` prefix. Separately, `guests/` — the Phase-0 TypeScript spike
from [[trailbase-guest-wasm-runtime-defaults]] — was still in the tree after the Rust host
superseded it, and its only two remaining references pointed at a scratch depot path that no longer
existed.

## Decision

Flatten the new system. Everything the server needs sits **directly** under `trailbase/`:

```text
trailbase/
  config.textproto   # server/auth settings + record API declarations   <- SOURCE OF TRUTH
  metadata.textproto
  migrations/main/
  host/              # COMPILED engine: the Rust guest crate (build.bat to change it)
  runtime/           # EDITABLE app: ahscripts/ + app/ (read at request time, no rebuild)
  tools/             # the verification harnesses
  traildepot/        # GENERATED: copies + wasm/ + data/ secrets/ uploads/ backups/
  build.bat  clear_db.bat  RUN.BAT
```

`guests/` is **deleted**.

The load-bearing distinction is now the first segment of the path, not a nested one:

| Path | Change cadence |
|---|---|
| `trailbase/tb-ah-run-js/` | Rust -> WASM; needs `build.bat` |
| `trailbase/runtime/` | JS / Jinja / SQL; read per request, no rebuild |
| `trailbase/tools/` | Node harnesses, run with `node` |

## Why

- **The engine/app boundary is the thing that matters.** "Do I need to rebuild?" is answered by the
  first path segment. Before, it was answered by knowing that `src/host` and `src/runtime` were
  different in kind while sitting in the same folder.
- **`trailbase/` names the whole system, so it should hold the whole system.** A single `src/`
  between the directory name and every file is a level that has to be remembered and typed for no
  isolation.
- **The harnesses stop looking like part of the guest.** `tools/` sitting next to `host/` and
  `runtime/` says plainly that they drive both.
- **`guests/` was dead weight** with dangling references, and its findings are preserved in the
  vault, not in a buildable tree.

### Why the editable tree is `runtime/`, not `app/`

The WASI root is passed as `--runtime-root-fs` and the host resolves `ahscripts/` and `app/` directly
under it, so the runtime root already *contains* an `app/`. Naming the tree `app/` would have
produced `trailbase/app/app/compute/`; `runtime/` keeps the existing `runtime/ -> app/` vocabulary
and matches the generated `traildepot/runtime/`.

## Alternatives considered

| Alternative | Why rejected |
|---|---|
| Leave `src/` in place | The confusion that prompted the request. `src/` grouped things by nothing in particular and separated the engine from the app. |
| `trailbase/app/` for the editable tree | `app/app/…` stutter, and it breaks the vocabulary the host README and `--runtime-root-fs` already use. |
| `trailbase/tb-ah-run-js/`, `trailbase/site/`, `trailbase/tools/` | `site/` says nothing about what the directory is (it is a WASI runtime root read by a QuickJS host). |
| Keep `guests/` as a runnable reference | Nothing loaded it; the two remaining references were already broken paths. The spike's value is its findings, which are in [[trailbase-guest-wasm-spike-results]], [[trailbase-guest-aot-startup-cost]] and [[trailbase-guest-cpu-js-limits]]. |
| Keep the auth-UI component copy step in `build.bat` | It looked for `guests/spikes/depot/wasm/…`, which does not exist, so the step never ran. TrailBase falls back to its built-in auth UI. |

## Consequences

- `build.bat` builds in `host/`; `clear_db.bat` copies `migrations/` and `runtime/` (as
  `traildepot/runtime/`); `RUN.BAT` is unchanged apart from its comments.
- `trailbase/src/.gitignore` is gone; its two rules (`host/target/`, `.tbdemo-guest/`) moved up into
  `trailbase/.gitignore` with the paths re-anchored.
- Every harness under `tools/` had its `../runtime/...` imports and `resolve(here, "../../..")` repo
  roots re-derived for one level less; their usage comments now say `node trailbase/tools/…`.
- Vault path references were rewritten from `trailbase/src/{host,runtime,tools,migrations,…}` to
  `trailbase/{host,runtime,tools,migrations,…}`. Notes that cite `guests/` as *evidence* for a
  historical measurement were left pointing at `guests/`; [[trailbase-src-depot-layout]] was
  marked superseded rather than rewritten.
- Editing `trailbase/runtime/` is still not enough on its own to reach a running server: the app is
  served from the generated `traildepot/runtime/` copy, so `clear_db.bat` (or a manual copy) is
  required. This is unchanged from before.

## Evidence

- `cmd /c trailbase\build.bat` — built and copied `traildepot/wasm/tb-ah-run-js.wasm` after the move.
- `cmd /c trailbase\clear_db.bat` — exit 0, `traildepot/` re-assembled from the flattened sources.
- `node trailbase/tools/guest-smoke.mjs` — **71/71** from the new layout.
- `node trailbase/tools/view-equivalence.mjs` — `transactionView` 23,413 identical,
  `invoiceView` 8,927 identical, `transactionsReport` 23,413 identical; `paymentsView` still
  DIFFers, which is the pre-existing [[legacy-sql-views-differ-from-js-views]] finding and is
  unrelated to the move.

## Related

- [[runtime-js-guest-platform]] — the system this lays out.
- [[trailbase-src-depot-layout]] — the 2026-09-27 layout this supersedes.
- [[build-and-run]] / [[environment]] — the commands and directories.
