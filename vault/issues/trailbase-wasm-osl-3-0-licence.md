---
title: trailbase-wasm declares OSL-3.0, not MIT
type: issue
status: open
created: 2026-09-28
tags: [trailbase, licensing, wasm, legal]
related_to: ["[[compiled-artifacts-are-generic-capabilities]]", "[[component-split-and-sql-materialised-tables]]", "[[runtime-js-single-host]]"]
---

# trailbase-wasm declares OSL-3.0, not MIT

## Finding

The vendored crates declare **`OSL-3.0`**, not a permissive licence, and neither ships a `LICENSE`
file:

```toml
# trailbase-wasm-0.6.1/Cargo.toml:25
license = "OSL-3.0"
# trailbase-wasm-common-0.3.1/Cargo.toml:25
license = "OSL-3.0"
```

Both are at
`%USERPROFILE%\.cargo\registry\src\index.crates.io-*\trailbase-wasm-0.6.1\` and
`…\trailbase-wasm-common-0.3.1\`. Each directory contains only `src/`, `wit/`, `Cargo.toml*`,
`Cargo.lock`, `README.md` and `.cargo_vcs_info.json` — **no `LICENSE` file is vendored**, so the
SPDX field in `Cargo.toml` is the only licence statement available locally.

Repository is declared as `https://github.com/trailbaseio/trailbase`.

## Why it matters

An earlier claim in conversation was that the licence "was MIT before, and might have been deleted
by the owner while vibe coding". That claim is **not supported** by what is on disk. The declared
licence is OSI weak copyleft with a network-use clause, not a permissive licence, and the
difference is material:

- `[[compiled-artifacts-are-generic-capabilities]]` requires compiled artifacts to be **generic and
  shareable**. OSL-3.0 is compatible with that goal but is not permissive; it attaches a
  copyleft obligation when the software is made available over a network, and it permits relicensing
  of your own modifications but not of the upstream code.
- `[[component-split-and-sql-materialised-tables]]` plans to split the host into three separately
  distributed components. Splitting makes distribution more likely, so the licence question moves
  from theoretical to blocking.
- `trailbase/tb-ah-run-js/Cargo.toml` itself has **no `LICENSE` file**, so this repo's own licensing posture
  is also unstated.

## What is unresolved

Whether TrailBase upstream is currently MIT, OSL-3.0, or unlicensed is **not determined here** — the
local evidence is the crates.io metadata and the vendored crate contents only, and no `LICENSE` file
is present to cross-check the SPDX field against. This needs checking against the upstream repository
and possibly with the author, not inference from the crate tarball.

## Next step

Confirm the upstream licence directly, then decide explicitly whether the split components may be
shared and under what terms. Do not treat "no LICENSE file" as "permissive".

## Related

- [[compiled-artifacts-are-generic-capabilities]] — the invariant this constrains.
- [[component-split-and-sql-materialised-tables]] — the change that makes it blocking.
- [[trailbase-host-upstream-crate-license-unresolved]] — the *other* licence gap: the host crate's
  own upstream, not the dependency.
