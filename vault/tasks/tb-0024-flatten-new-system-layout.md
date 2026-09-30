---
title: TB-0024 Flatten the new-system directory layout and delete the guests spike
type: task
status: done
priority: medium
created: 2026-09-28
updated: 2026-09-28
tags: [trailbase, layout, structure, cleanup, navigation, build]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[trailbase-flat-source-layout]]", "[[trailbase-src-depot-layout]]", "[[runtime-js-guest-platform]]", "[[build-and-run]]", "[[environment]]", "[[trailbase-host-getscripts-reads-wrong-root]]", "[[tb-0025-host-endpoint-hygiene]]"]
---

# TB-0024 Flatten the new-system directory layout and delete the guests spike

The request was: *"what is the current state of the project? I am having trouble understanding the
directory structure… what is `guests/`? if this is the main wasm component then what is
`trailbase/src/host/`?"* — i.e. `src/` was hiding the one distinction that matters, and a dead spike
directory was sitting next to the live system. Rationale and the alternatives rejected:
[[trailbase-flat-source-layout]].

## Move

- [x] `trailbase/src/host/` -> `trailbase/tb-ah-run-js/` (the compiled Rust guest crate)
- [x] `trailbase/src/runtime/` -> `trailbase/runtime/` (the editable app: `ahscripts/` + `app/`)
- [x] `trailbase/src/tools/` -> `trailbase/tools/` (the Node verification harnesses)
- [x] `trailbase/src/migrations/` -> `trailbase/migrations/`
- [x] `trailbase/src/{config,metadata}.textproto` -> `trailbase/`
- [x] `trailbase/src/.gitignore` merged into `trailbase/.gitignore` (`host/target/`, `.tbdemo-guest/`)
- [x] `trailbase/src/` removed

## Delete

- [x] `guests/` — the Phase-0 TypeScript spike ([[trailbase-guest-wasm-spike-results]]), superseded
      by the Rust `tb_ah_run_js` host. Nothing loaded it.
- [x] The dead `trailbase_auth_ui_component.wasm` copy step in `build.bat` and the matching lookup
      in `tools/guest-smoke.mjs` — both pointed at `guests/spikes/depot/wasm/`, a path that no longer
      existed, so neither ever ran. TrailBase falls back to its built-in auth UI.

## Repoint

- [x] `build.bat` — `pushd "host"`, copy from `host\target\…`
- [x] `clear_db.bat` — no `SRC` variable; copies `migrations/` and `runtime/` -> `traildepot/runtime/`
- [x] `RUN.BAT` — comment only
- [x] `tools/*.mjs` — `../runtime/app/…` imports, `resolve(here, "../..")` repo roots,
      `trailbaseRoot`-relative `config.textproto` / `metadata.textproto` / `migrations`
- [x] `trailbase/README.md`, `trailbase/tb-ah-run-js/README.md`, `host/src/render.rs` comment
- [x] `AGENTS.md` — the two paths it named as the new system

## Vault

- [x] 61 documents repointed from `trailbase/src/…` to `trailbase/…`
- [x] `systems/runtime-js-guest-platform`, `references/environment`, `references/build-and-run`,
      `vault/README`, `projects/aa-point-of-sale`, `notes/system-status-overview`,
      `notes/vault-guide` — locators and the `guests/` rows
- [x] `decisions/trailbase-src-depot-layout` marked superseded, not rewritten
- [x] New `decisions/trailbase-flat-source-layout`
- [x] `links.mjs` exit 0, `check.mjs` 0 errors, `stats.mjs --write-report` refreshed

Historical notes that cite `guests/` as *evidence* for a past measurement
([[trailbase-guest-aot-startup-cost]], [[trailbase-guest-cpu-js-limits]],
[[trailbase-guest-request-headers-bytes]], [[trailbase-guest-error-string-opaque]],
[[tb-0016-guest-wasm-phase0-spikes]]) still point at `guests/` on purpose: the file is gone, the
measurement is not.

## What the flatten missed

An audit run immediately afterwards found one thing the path-based verification could not reach:
`trailbase/tb-ah-run-js/src/lib.rs:115` hard-codes the WASI path `/traildepot/ahscripts` in the upstream
`/getscripts` handler, which no `.bat` file controls and which has never existed under the current
`--runtime-root-fs=traildepot/runtime` wiring — the route always returns an empty list. Recorded as
[[trailbase-host-getscripts-reads-wrong-root]] and scheduled for removal in
[[tb-0025-host-endpoint-hygiene]]. The lesson worth keeping: **moving a tree and grepping for its
paths does not audit a Rust/WASM component**, whose paths are string literals in source.

## Verify

- [x] `cmd /c trailbase\build.bat` — component built, copied to `traildepot/wasm/tb-ah-run-js.wasm`
- [x] `cmd /c trailbase\clear_db.bat` — exit 0
- [x] `node trailbase/tools/guest-smoke.mjs` — **71/71**
- [x] `node trailbase/tools/view-equivalence.mjs` — resolves its imports and runs;
      `transactionView` / `invoiceView` / `transactionsReport` identical, `paymentsView` DIFFers
      (the pre-existing [[legacy-sql-views-differ-from-js-views]] finding, not a regression)

## Side effect worth knowing

`clear_db.bat` does what it always did: it wipes `traildepot/data/`. Running it during this task
deleted the local dev database, so the next `RUN.BAT` starts from an empty depot and the shop data
must come back through the `import-from-v1` plugin. The separate perf depot
(`%TEMP%\kilo\aa-perf-depot`, what the harness defaults point at) was untouched.
