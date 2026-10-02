---
title: tb-0031 — Remove the dead code the reference graph proves unreachable
type: task
status: done
priority: medium
created: 2026-10-01
tags: [trailbase, cleanup, dead-code, rust]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[tb-0030-retire-the-route-ts-dispatcher]]", "[[trailbase-host-jobs-module-never-called]]", "[[trailbase-runtime-js-scheduler-not-running-jobs]]", "[[direct-js-serde-bridge-no-win]]"]
---

# tb-0031 — Remove the dead code the reference graph proves unreachable

## Goal

Every deletion here is backed by a repo-wide occurrence count of **1** — the declaration itself.
Anything with a live caller was left alone, including code that looks dead at first glance.

## What was deleted

### Guest JS exports (13 symbols, 9 files)

| File | Removed |
|---|---|
| `app/compute/format.js` | `fmtDate` (and its private `MONTHS` table) |
| `app/compute/views.js` | `buildViews`, `buildSelectedViews` |
| `app/lib/invoice-lifecycle.js` | `lineNet` |
| `app/lib/invoices.js` | `itemChoices`, `ENTRY_TYPES`, `DIFFERENCE_PARTY` |
| `app/lib/invoicing.js` | `lockHolder`, `updateLine` |
| `app/lib/management.js` | `touchedTables` |
| `app/lib/paths.js` | `dirname` |
| `app/lib/route-kit.js` | nothing — see the `editorItems` correction below |
| `app/lib/sqlviews.js` | `invalidate` |

Also two **pre-existing** unused imports, unrelated to the above: `qtyDisplay` in
`compute/views.js` and `renderTemplate` in `lib/http.js` (`page()` calls the `render.html`
global, so the import was never read).

### Rust (`cargo check --workspace --all-targets` warnings)

- `tb-ah-run-js/src/lib.rs` — `json_handler`, the scaffold example returning `"msg": "foo"`.
  Private and absent from the `http_handlers()` routing vec.
- `tb-ah-run-js/src/render.rs` — `Renderer::context`, `::render`, `::render_string`.
- `tb-ah-render-jinja/src/render.rs` — `render_value`, `render_string_value`, and `with`.
  `lib.rs` now calls `render::with(..)` instead of inlining the same poisoned-lock recovery,
  so the helper is live rather than deleted.

### Tools (5 files, `git rm`)

`tools/bench-ab.mjs` (an A/B between a pre- and post-refactor `route.ts`; the pre-refactor arm
no longer exists), `tools/report-bench-current.mjs`, `tools/sql-bench.mjs`,
`tools/run-report-sweep.ps1` (superseded by `run-spool-sweep.ps1`) and the stale artifact
`tools/bench-results-warm.ndjson`. None was named in `references/build-and-run.md`, any vault
document, the README, or the `.bat` launchers.

## Corrections to earlier analysis

- **`route-kit.editorItems` was not dead code to delete — it was duplicated.** `route.ts:1261`
  carried a byte-identical local `editorItems`. The local copy was deleted and all three call
  sites now use `A.routeKit.editorItems`, so one implementation survives.
- **`spoolreports.totalsParts` / `totalsParameters` / `totalsSpec` are live.** The export scanner
  calls them dead because no app module imports them, but `tools/verify-spool-reports.mjs:181,282,666`
  calls all three. They stay.
- **`partials/page_body.html` is live.** It is reached by every `pages/**/page.html` through
  `{% include %}`, not by any path-string reference — a filename-only scan reports it orphaned.
- **`compute/reports.js` and `compute/views.js` stay.** No `meta.json` sets `compute.useJs`, so
  the JS report engine is dormant, but it is the documented escape hatch
  (`report-pages.useJsFor`) and the parity reference the `verify-spool-*` gates import.
- Every one of the 26 app JS modules is transitively loaded by the dispatcher's `loadModule`
  block, including `paths.js` and `sqlviews.js`, which a filename scan also called orphaned.
  (`sqlviews.js` was deleted 2026-10-02 with the legacy view layer — see
  [[legacy-parity-checks-waived]] — so the count is **25** today. The count was 26 when measured and
  is left as the historical figure.)

## `jobs.rs` deliberately kept

`tb-ah-run-js/src/jobs.rs` is genuinely dead — the host never calls it
([[trailbase-host-jobs-module-never-called]], [[trailbase-runtime-js-scheduler-not-running-jobs]])
— and it still contains scratch working notes (`// Actually user said unused. Let's comment them
out or remove.`). It was **kept on purpose**: it encodes the intended TrailBase scheduler, and
deleting it would discard the only record of that design. Its eight dead-code warnings are
therefore expected and must not be "fixed" by a future sweep.

For the same reason `init.rs::ensure_global_init` was kept: cargo reports it unused, but its only
caller is `jobs.rs:29`. Deleting it would break a file that is being kept.

## Verification

- `cargo check --workspace --all-targets` — clean, zero errors, and no new warnings. The only
  remaining `dead_code` warnings are the eight in `jobs.rs` plus `ensure_global_init`.
- `node --check` on all 22 app JS modules — parse clean.
- Re-ran the orphan scan: no newly-orphaned file. The `reports/sql/views/*.sql` fixtures are read
  dynamically by `verify-legacy-views.mjs`, `translate-enums.mjs`, `view-equivalence.mjs`,
  `verify-guest-only-views.py` and `verify-translated-views.py`, so removing `sql-bench.mjs`
  orphaned none of them.
  **2026-10-02:** those five readers, the fixtures and `sqlviews.js` were all deleted with the
  legacy view layer — see [[legacy-parity-checks-waived]]. The sweep above could not see through a
  constant-false flag, so it never classified this layer as dead; the numbers it recorded stand.
- **Behavioural parity, measured before/after.** `trailbase/build.bat` (wasm32-wasip2 release) then
  `guest-smoke.mjs`, run on HEAD with every change stashed and again with the sweep applied:

  | Run | Result |
  |---|---|
  | HEAD (stashed) | 66/76 |
  | Sweep applied | 66/76 |

  The failing sets are identical, and the failures are the pre-existing ones recorded in
  [[guest-smoke-report-total-checks-fail-on-pristine-checkout]] — not caused by this change. The
  build also confirmed the 13 dead-code warnings exist at HEAD and are gone after the sweep
  (11 → 9 in `tb_ah_run_js`, 2 → 0 in `tb_ah_render_jinja`).

  **Caveat worth carrying forward:** the suite cannot detect this class of regression, because it
  already fails 10 checks on unmodified HEAD. An intermediate run scored 67/76 purely because one
  documented flaky cache check flipped. "The smoke suite passed" is therefore not evidence that a
  change is behaviour-preserving — a before/after pair is the only reliable signal here.

## Boundary that was respected

Two `render` modules with the same method names are **not** interchangeable, and only one side of
each pair was touched:

- `tb-ah-run-js/src/render.rs` is reached by the **guest app's JS** through `api.rs`, which
  registers `render.html`, `render.string`, `render.spooled` and `render.json` on the QuickJS
  global. That file keeps `with`, `render_value`, `render_string_value`, `render_spooled` and
  `json_spooled`.
- `tb-ah-render-jinja/src/render.rs` is reached by the **host** through the `aa_render` envelope;
  `lib.rs:172-173` calls `guard.render(..)` and `guard.render_string(..)`. Those two stay. Only
  the serde-bridge twins — the direct JS→serde path measured as no win in
  [[direct-js-serde-bridge-no-win]] — were removed.

## Related

- [[tb-0030-retire-the-route-ts-dispatcher]] — the larger structural change to the same file.