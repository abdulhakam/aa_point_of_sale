---
title: The vendored runtime-js crate has no LICENSE and no recorded license
type: issue
status: open
severity: medium
created: 2026-09-28
updated: 2026-09-28
tags: [trailbase, wasm, licensing, provenance, host, legal]
related_to: ["[[trail-runtime-js-reference]]", "[[trailbase-flat-source-layout]]", "[[runtime-js-guest-platform]]"]
---

# The vendored runtime-js crate has no LICENSE and no recorded license

## The finding

`trailbase/host/` is adapted from `github.com/abdulhakam/trail_runtime_js`. Its own README says so
and adds the caveat verbatim (`trailbase/host/README.md:88-89`):

> The upstream repository publishes no `LICENSE` file; confirm licensing before any redistribution.

That caveat has never been resolved, and it is recorded nowhere in the vault — a grep of `vault/`
for `license`, `LICENSE` and `redistribut` returns nothing on this subject. The uncertainty has
been carried in a code comment for the life of the crate.

## Why it matters here specifically

The host is **not** an internal-only artefact. It ships as a compiled WASM component
(`trailbase/traildepot/wasm/runtime_js.wasm`, ~7 MB) and the plan is to keep the compiled artifacts
generic and shareable ([[compiled-artifacts-are-generic-capabilities]]). Redistributing a build of
a crate whose upstream terms are unknown is exactly the case the README warns about.

Two facts that make this smaller than it looks, and should be stated in the resolution:

- **The upstream is the same author as this project** (`abdulhakam`), so it is not a third-party
  dependency in the usual sense. `tb-0017` records the adoption with attribution and a README for
  that reason.
- What is actually unresolved is the *record*, not necessarily the *right*: a same-author
  published repo with no LICENSE file is under-exclusive by default in most jurisdictions, and the
  fix is likely a one-line license file upstream plus a note here.

## The fix

1. Add a LICENSE to the upstream repository (or an explicit statement in its README that it is
   public-domain / unlicensed-but-owned-by-the-author).
2. Record the outcome in [[trail-runtime-js-reference]] and in `trailbase/host/README.md`, replacing
   "confirm before any redistribution" with the actual answer and its date.
3. Until then, treat the built component as not-for-redistribution.

## Evidence

- `trailbase/host/README.md:88-89` — the caveat, verbatim.
- `trailbase/host/README.md:8` — the base repository.
- `trailbase/host/README.md:5-6` — the two vault notes that cite this README as the provenance
  record.
- Grep of `vault/**/*.md` for `license|LICENSE|redistribut`, 2026-09-28: no note covers this.
- `trailbase/tasks/tb-0017-adopt-trail-runtime-js.md:31` — the adoption line, which records
  attribution but not terms.

## Related

- [[trail-runtime-js-reference]] — the provenance and licensing section this belongs in.
- [[compiled-artifacts-are-generic-capabilities]] — why redistribution is contemplated at all.
- [[trailbase-wasm-osl-3-0-licence]] — the **separate** finding for the `trailbase-wasm`
  *dependency*, which declares `OSL-3.0`. This note is about the host crate's own upstream. Both
  must be resolved before the split in [[component-split-and-sql-materialised-tables]] ships.
