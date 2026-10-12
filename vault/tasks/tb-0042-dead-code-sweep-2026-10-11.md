---
title: tb-0042 — Dead-code sweep, 2026-10-11
type: task
status: done
priority: medium
created: 2026-10-11
updated: 2026-10-11
tags: [trailbase, cleanup, dead-code, guest]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[tb-0031-remove-proven-dead-code]]", "[[tb-0032-manifest-first-refactor]]", "[[settle-structural-claims-with-the-owning-artifact]]", "[[trailbase-host-jobs-module-never-called]]", "[[ui-parity-discrepancies-2026-10-05]]"]
---

# tb-0042 — Dead-code sweep, 2026-10-11

## Goal

A repo-wide review for code that no longer has a live consumer, in the spirit of
[[tb-0031-remove-proven-dead-code]]: **every deletion is backed by a repo-wide reference count, and
anything with a live caller, a documented intent, or a template/dynamic reference is left alone.** This
sweep only removed clusters that are *unambiguously* dead — an unused export whose docstring claims it is
"kept", or a route/template that is a deliberate example, was **not** touched (see *Left in place*).

Method: the Rust signal is `cargo check --workspace --all-targets`; the JS signal is a `rg`-based
reference graph over `trailbase/runtime`, `trailbase/tools` and `vault/**`, excluding the vendored
`tools/_src/` copies and each symbol's own declaration. Three parallel audits covered (1) `app/lib`,
`app/compute` and `app/public/js`, (2) routes / views / pages, (3) `tools/**`.

## What was removed

| Location | Removed | Evidence |
|---|---|---|
| `runtime/app/lib/baseviews.js` | `counts()`, `invalidate()`, `COUNT_COLUMNS`, `COUNTS_SQL`, `countsCache` | `/dashboard` no longer computes the "Overview" card — its own comment says so (`dashboard/route.ts:14-15`); `A.baseviews.counts` and `A.baseviews.invalidate` have **zero** call sites. Only `itemsReport()` survives. |
| `runtime/app/sql/counts.sql` | the whole file | referenced only by the deleted `COUNTS_SQL`; no tool or vault document reads it |
| `runtime/app/manifests/index.js` | `jobs()`, `all()`, `invalidate()`, and (with them) `entities()`/`schema()` | `jobs()` read `/app/manifests/jobs.json`, **which does not exist** (so `all()`, its only caller, would throw); `entities()`/`schema()` were called **only** by `all()`, so removing it orphaned them too; `invalidate()`'s "used by the harnesses" comment is stale — no harness calls it. The live path is `loadAll()`, which never read `jobs` and reads `entities`/`schema` itself (`context.js:122-130`). |
| `runtime/app/views/partials/report_meta.html` | the whole file | no `{% include %}`/`{% import %}`/`{% extends %}`/`render.html` reference anywhere; the include that used it was removed on 2026-10-05 ([[ui-parity-discrepancies-2026-10-05]]) |
| `tb-ah-run-js/src/lib.rs:352` | the unnecessary `mut` on `file_path` | `cargo check` `unused_mut` warning; the value is never mutated |
| `tools/sweep-guest-2026-10-06.{json,log}` | the two files | untracked, git-ignored dated run output (`*.log`, `sweep-*.json`), not source |

After the change `cargo check --workspace --all-targets` reports **9** `tb_ah_run_js` warnings, all of
which are the deliberately-kept `jobs.rs`/`init.rs` items below; the `unused_mut` warning is gone.

## Left in place — and why

| Item | Why not deleted |
|---|---|
| `tb-ah-run-js/src/jobs.rs` (8 warnings) and `init.rs::ensure_global_init` (1) | kept on purpose since 2026-10-01 as the only record of the intended scheduler design ([[trailbase-host-jobs-module-never-called]]); a future sweep must **not** delete them |
| `runtime/ahscripts/routes/mode/route.ts` | no in-app link, but it is the **smallest complete example of the route-folder authoring contract**, cited by `decisions/runtime-js-minimal-file-authoring-contract.md`. A deliberate artifact, not dead code. |
| `app/lib/invoice-lifecycle.js` `restoreInvoice`, `assertHasLines`, `releaseLease`; `app/lib/refs.js` `rawPairs`, `invalidate`; `app/lib/dates.js` `invalidate`; `app/lib/spoolreports.js` `bindManifests`; `app/lib/entities.js` `ready`; `app/lib/data.js` `ready` | each has **zero** callers, but each carries a docstring asserting an intent ("kept because…", "called on a write", "for tests"). That is the "loaded but never called" class [[tb-0032-manifest-first-refactor]] names — a missing call site is as likely as a dead symbol, so they are **flagged, not removed** (see *Open candidates*). |
| `runtime/app/lib/render-client.js`; `app/lib/spoolreports.js` `totalsParts`/`totalsParameters`/`parameters`/`totalsSpec` | reached only through the `/bench/render` escape hatch or the `tools/verify-spool-reports.mjs` parity gate — deliberately kept |
| `runtime/app/pages/**/page.html.jinja` and `partials/page_body.html.jinja` | every page manifest has a `spool` block, so `/p/<slug>` short-circuits to the report renderer and the declarative `meta.template` branch is never taken. The templates are structurally unreachable but deleting them (and the still-live-looking `meta.template`) is a **design decision**, not a dead-code removal. |
| `tools/gen-manifests.mjs`, `tools/dedupe-manifests.mjs`, `tools/_src/runtime/**` | one-shot migration fixtures; `_src/legacy-views.js` is still a live `verify-prelude.mjs` import. `_src/runtime/app/lib/http.js` is a stale duplicate. Retiring them needs a decision about the parity gates, so they are reported only. |

## Open candidates (recorded, not actioned)

These have zero external references and are the most likely to be genuinely dead on a second look. Each
needs a ruling: delete, or wire the missing call.

- `counts` is gone; confirm nothing else expected `app/sql/counts.sql`.
- The `invalidate()` hooks in `refs.js` and `dates.js` are never called — if that is intentional, delete
  them; if a write should drop those caches, the call site is missing.
- `spoolreports.bindManifests` was the pre-manifest injection seam; the registry is now built from the
  manifest walk. If no test uses it, it is dead.

## Verification

- `cargo check --workspace --all-targets` — `Finished`, `unused_mut` gone, 9 expected `dead_code`
  warnings (`jobs.rs` + `init.rs`) remain.
- `node --check` on the edited JS modules — parse clean.
- ⚠️ No behavioural gate was run in this turn: `guest-smoke`/`route-snapshot` need a rebuilt WASM guest
  and a running depot, and the deleted symbols are unreachable by construction. The removal of
  `counts()` is the one item that changes a module the `/dashboard` route loads, and that route did not
  call it; a before/after `guest-smoke` run is the recommended confirmation before a release.

## Related

- [[tb-0031-remove-proven-dead-code]] — the first sweep, and the reference-count rule reused here.
- [[tb-0032-manifest-first-refactor]] — names the "loaded but never called" class the open candidates
  belong to.
