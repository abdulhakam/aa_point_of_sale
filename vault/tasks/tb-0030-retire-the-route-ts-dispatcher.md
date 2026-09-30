---
title: tb-0030 — Retire the route.ts dispatcher in favour of file-router conventions
type: task
status: doing
priority: high
created: 2026-09-30
tags: [trailbase, routing, refactoring, manifest]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[file-router-conventions-not-a-data-dag]]", "[[guest-helpers-pure-vs-cached]]", "[[a-base64-alphabet-error-is-silent]]"]
---

# tb-0030 — Retire the `route.ts` dispatcher in favour of file-router conventions

## Goal

`trailbase/runtime/ahscripts/routes/_app/route.ts` (1785 lines) is deleted. Every route is a
directory with a `route.json` manifest and handler files, following
[[file-router-conventions-not-a-data-dag]].

Adding a route becomes `mkdir` + write `route.json` + write a handler, with no dispatcher edit.

## Sequence

Each step is separately reversible and must leave the app byte-identical.

- [x] **0. Delete the dead `/bench/*` capability probes.** `/bench/ping`, `t1`–`t4` and
      `/bench/pragma` removed (37 lines, 1785 → 1748).
      **Correction:** `/bench/payload`, `/bench/report` and `/bench/reportkeys` are **kept** —
      `tools/split-bench.mjs` calls all three (lines 52, 58, 84, 89), so `/bench/*` is a
      `bench/` route directory in step 5, not a deletion. Verified: 45-route fingerprint unchanged.
- [ ] **1. Extract three JS guest helpers** into `app/lib/route-kit.js` — `write()`,
      `renderRoute()`, `refs()` — and migrate every call site.
      - [x] `refs()` — 10 sites migrated (6 two-line collapses, 3 wider-snapshot kept as-is).
            Verified: no differences across 45 routes.
      - [x] `write()` — 15 of 16 sites migrated. The 16th is `/reports/refresh`'s deliberate
            `if (full) invalidate()`, which is a full drop rather than write-coupled and must stay.
            Verified: 45-route parity plus 13 write-path checks.
            The write paths needed their own gate: `route-snapshot.mjs` only issues GETs, so it
            cannot see a regression in a helper whose entire job is to run *after* a mutation.
      - [ ] `renderRoute()` — 25 sites. One migrated (`/login`); the rest are the same shape.
            Verified byte-identical output (SHA-256 `0C06C535234B26F6`, 1036 bytes).

**The gate itself had to be fixed first.** Three defects in it, each of which produced a *false*
signal before it was caught:

1. **A 500 was reported as a regression.** The ~20 s WASM deadline makes `/reports/profit`,
   `/reports/paymentsbycompany`, `/reports/salesreport`, `/cashmemo` and `/p/reports/profit/data`
   genuinely load-dependent — 200 on a quiet server, 500 when several run back to back. The probe
   now retries a 500 twice before recording it. **A gate that cries wolf trains you to ignore
   diffs**, which is worse than having no gate.
2. **The retry silently dropped successful routes.** `if (res.status !== 500) return;` returned
   from `probe()` *without* pushing to `results`, so a snapshot held only its failures — 2 routes
   instead of 45, and the diff then cheerfully reported "no differences across 2 routes".
3. **Module edits need a server restart.** `route.ts` is re-read per request, but `app/lib/*` is
   cached on `globalThis` (`route.ts:20-24`). Changing `route-kit.js` and re-requesting served the
   OLD module, which showed up as `/login` returning a JSON array of character indices — the host
   had received a string where it expected `{ html }`. **Restart the server after editing anything
   under `app/`; only `ahscripts/` is live.**

**Never compare snapshots taken under different load.** `/reports/salesreport` read 500 in one
baseline and 200 in the run after it, which looks exactly like a regression. For a single route the
cheapest honest check is a direct byte comparison of the HTML.
- [x] **2. Rust `#[export]` hex/b64**, replacing the two divergent JS copies
      (`route.ts:311` and `management.js`).
      **The spike question is moot: this component does not use `#[export]` at all.** Bridges are
      registered manually with `Function::new` (`api.rs:17`, `:70`), so a pure sync function needs
      no macro. Added `tb-ah-run-js/src/api/ids.rs` and registered it as `ids.b64ToHex` /
      `ids.hexToB64` — a sync closure, matching `render.html`, because the functions do no I/O.
      `route-kit.js` and `management.js` prefer the bridge and keep their JS as a fallback.
      4 Rust unit tests pass; `cargo build --offline --release --target wasm32-wasip2` succeeds.
      **`--compare` verifies the Rust and JS paths agree** on 7 vectors including the recorded one.
      All 28 call sites now go through one codec (24 `b64ToHex`, 3 `hexToB64`); the local
      `hexToBase64` and its 14-line alphabet are deleted.
- [ ] **3. Split the 3-in-1 invoice routes in place**, while `route.ts` is still the reference:
      `/invoices/{id}/{header|line|complete}` (14 form fields) and `/invoices/{id}/lines`.
- [ ] **4. Host routing** (`tb-ah-run-js/src/lib.rs`): `{param}` matching plus a `[...path]`
      catch-all for `/static/*`, `/compute/*`, `/plugins/*`, `/favicon.svg`; delete the `_app`
      fallback in favour of a Rust 404; repoint `lib.rs:78` and `get_scripts_handler`.
- [ ] **5. Split the ~78 method+path pairs into ~30 route directories** with `route.json`.
- [ ] **6. Delete `_app/route.ts`**; add `app/lib/router.js` (manifest reading, param extraction,
      query coercion, auth gate) as a *module*, not a route.
- [ ] **7. `meta.json` column/filter presets**, separately — 11 lines saved on each of 15 page
      folders. Independent of the route work; not to be bundled with it.

## Acceptance gate

`node trailbase/tools/route-snapshot.mjs --out before.json`, make the change, then
`--out after.json` and `node trailbase/tools/route-snapshot-diff.mjs before.json after.json`.

**The gate is a live-server fingerprint of 45 routes: status, row counts, title and link set per
route.** Any difference is a regression to explain before the step is accepted.

It has a companion, because the read gate alone is not enough for `write()`:
`node trailbase/tools/write-paths-check.mjs` drives the POST endpoints (13 checks) and asserts that
each write is *visible on the next read* — which is only true if `invalidate()` ran. It creates and
removes its own fixtures; `node trailbase/tools/probe-cleanup.mjs` removes any left by a run that
failed partway.

## Verification tools added

| Tool | Purpose |
|---|---|
| `tools/route-snapshot.mjs` | 45-route fingerprint (status, rows, title, link set), JSON out; retries a 500 twice |
| `tools/route-snapshot-diff.mjs` | Before/after diff of two snapshots; exit 1 on any difference |
| `tools/write-paths-check.mjs` | 13 POST checks incl. read-after-write; self-cleaning |
| `tools/probe-cleanup.mjs` | Removes `refactor-probe-*` fixtures by row-scoped id |
| `tools/id-codec-check.mjs` | Asserts the base64 alphabet byte-for-byte, then round-trips; `--compare` also runs the Rust bridge against the JS fallback through the server |
| `tools/brace-check.mjs` | Delimiter balance for a guest route script, with strings/templates/comments blanked first |

**`brace-check.mjs` exists because a raw count is misleading.** A plain `Select-String` count of `{`
and `}` in `route.ts` reads 406/408 — unbalanced — purely from braces inside template literals
and strings. After blanking, it is 346/346. The guest compiles `route.ts` through a regex ESM
transform, so a genuinely missing brace surfaces as a runtime error on an unrelated route rather
than at load time, which is exactly the failure this catches cheaply.

**Two routes fail this gate in steady state** — `/reports/paymentsbycompany` and
`/p/reports/profit/data` — both the ~20 s deadline on a full depot. They are recorded in every
snapshot, so they are visible rather than hidden; they are not caused by any refactor here.
`/reports/profit` and `/reports/salesreport` also exceed the deadline when run back to back with
other heavy reports, which is why the retry exists.

**Row-scoped id extraction matters.** Taking the nearest preceding `?edit=<id>` link on the whole
page picks up the *previous* row's link; an early version of the check did that, deleted a real
`areas` row, and leaked its own fixture instead. Split on `<tr` and match within the row.

## Evidence / gotchas found so far

- **Cold vs warm matters.** The same depot returns 6 extra HTTP 500s (~20 s WASM deadline) on a
  cold run that vanish once `[mview]` has persisted its views. A cold snapshot is not comparable to
  a warm one; this nearly read as a regression from step 0.
- **`/ahscripts/init directory not found`** is logged on several requests and is harmless — the
  depot has no init scripts.
- **`route.ts` in `runtime/` is not what the server runs.** `RUN.BAT` passes
  `--runtime-root-fs traildepot\runtime`, so every edit needs
  `robocopy runtime traildepot\runtime /MIR` before it takes effect. `clear_db.bat` does this but
  **wipes the database**, so sync by hand during development.
  **This failed silently and read as a regression:** a `robocopy` issued from the repo root (rather
  than `trailbase/`) printed an ERROR and copied nothing, and the resulting run showed 7 routes
  500-ing with `cannot read property 'refs' of undefined`. Always run the sync with the Bash tool's
  `workdir` set to `trailbase/`, and confirm with a count grep on the depot copy
  (`Select-String ... traildepot/runtime/...`) before trusting a result. The guest also caches
  loaded modules on `globalThis`, so a stale depot is not corrected by re-requesting.
- The id codec needs `node trailbase/tools/id-codec-check.mjs` — see
  [[a-base64-alphabet-error-is-silent]].

## Related

- [[file-router-conventions-not-a-data-dag]] — the design.
- [[guest-helpers-pure-vs-cached]] — why only the id codec goes to Rust.
- [[manifest-driven-routing-and-data-dag]] — the superseded predecessor.