---
title: "The three components are one cargo workspace — one lockfile, one target"
type: decision
status: accepted
decided_on: 2026-09-30
created: 2026-09-30
tags: [components, cargo, workspace, build, dependencies, trailbase]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[components-are-named-tb-ah]]", "[[rendering-is-a-component-behind-an-envelope]]", "[[component-split-and-sql-materialised-tables]]", "[[trailbase-loads-multiple-components-flat-router]]", "[[render-split-measured]]"]
---

# The three components are one cargo workspace — one lockfile, one target

## Context

Three components, none with a workspace: each had its own `Cargo.lock` and its own `target/`. They
share most of their dependencies — `serde`, `serde_json`, `trailbase-wasm`, `wstd`, `minijinja`,
and behind those the whole `wasm-bindgen`/`wit-bindgen`/`syn` tree. Every one of them was compiled
three times.

## Decision

`trailbase/Cargo.toml` is a **virtual workspace manifest** listing the three members. Nothing is built
from it; each member still emits its own cdylib, which is what TrailBase loads.

## The question this actually answers, precisely

The owner asked whether the common packages could be a single "download", by analogy with a
node_modules workspace. Worth separating two things that are easy to conflate:

- **The download was already shared.** Cargo's registry cache (`~/.cargo/registry`) is global to the
  machine, so `serde` has always been fetched once no matter how many crates depend on it. That was
  never the problem, and a workspace does not change it.
- **What was not shared was the compile and the resolution.** Those are what the workspace fixes.

## Measured (production machine, 2026-09-30, from an empty `target/`)

| | before | after |
| --- | --- | --- |
| `Cargo.lock` files | 3 (2,336 + 1,021 + 1,004 lines) | **1** (2,360 lines) |
| build output | 3 trees: 2,475 + 378 + 357 = **3,210 MB** | 1 tree: **2,473 MB** |
| shared-dependency artefacts | compiled 3× | compiled once |
| rebuild with nothing changed | three independent checks | **2 s** for all three |

A clean build of all three is now **one** invocation (**17m 01s** from an empty target). The honest
caveat: the old three-target layout was not re-measured cold, so no before/after *time* is claimed
— the saving is structural (each shared dependency is built once rather than three times) and the
disk figure is measured.

## Why one lockfile is the more important half

Versions today happen to agree across the three — `serde 1.0.229`, `serde_json 1.0.151`,
`trailbase-wasm 0.6.1` — but that was luck, not a constraint. Three independent resolutions drift the
moment one member takes a new dependency, and then the app host and the renderer can end up compiled
against **different versions of trailbase-wasm in the same process**, which is the class of bug that
produces an unexplainable `component responded unexpectedly`.

The `wstd = "=0.5.6"` exact pin in each member used to be the thing *trying* to prevent exactly that
("so there is one wstd in the component"). With one lockfile it is guaranteed by construction.

## `--offline`, and why it is in build.bat

The workspace lockfile was generated with `cargo generate-lockfile --offline`, which resolves from
the local registry cache in 7 s. Without `--offline`, deleting a lockfile makes cargo resolve to the
newest *cached-compatible* version and then try to **download** it — which failed here on
`proc-macro-crate 3.5.0`. The lockfiles were therefore doing more than pinning: they were pinning to
what is already on the machine. `build.bat` now passes `--offline` so a build never silently needs
the network.

## Consequences

**Accepted**

- One resolution, one compile of each shared dependency, one tree to delete.
- Members share dependencies by **version and feature set**. Cargo unions the features the members
  request, so a member can get *more* of a dependency, never less. Harmless while the three ask for
  nearly identical features; worth remembering if that changes.

**Given up / to watch**

- Members can no longer be built in total isolation. That was never a benefit — it was the duplication.
- `cargo build` from inside a member directory still uses the workspace; there is no per-member
  escape hatch short of `--manifest-path` with a separate workspace, which would reintroduce the
  problem.
