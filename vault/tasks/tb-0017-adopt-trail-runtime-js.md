---
title: TB-0017 Evaluate and adopt tb_ah_run_js as the runtime-JS engine
type: task
status: doing
priority: high
created: 2026-09-26
tags: [trailbase, wasm, rquickjs, quickjs, runtime, phase-1]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[trail-runtime-js-reference]]", "[[trailbase-guest-wasm-runtime-defaults]]", "[[tb-0016-guest-wasm-phase0-spikes]]"]
---

# TB-0017 Evaluate and adopt tb_ah_run_js as the runtime-JS engine

`github.com/abdulhakam/tb_ah_run_js` already runs dynamic TypeScript inside a TrailBase guest
using a Rust host + QuickJS (`rquickjs`) + `swc`, with file routing, init scripts and a `minutely`
job scheduler — the plan's D2/D4 premise, on a faster engine than the `jco`/StarlingMonkey guest
that Phase 0 measured. Fold it into this repo as the platform's runtime-JS host.
See [[trail-runtime-js-reference]] for the full assessment.

## Why

- Phase 0 confirmed runtime-evaluated JS and filesystem `app/` ([[tb-0016-guest-wasm-phase0-spikes]])
  but measured the StarlingMonkey guest at ~1×10⁶ loop iterations/s with a ~20 s call deadline
  ([[trailbase-guest-cpu-js-limits]]). QuickJS should be materially faster and supports TS natively.
- It is a worked example of the exact player/engine architecture the plan needs, so it turns
  Phase 1/4 from "design and build" into "adapt, measure and complete".

## Subtasks

- [x] Confirm the reference builds here (`cargo build --target wasm32-wasip2 --release`)
- [x] Bring the crate into this repo as `trailbase/src/` (attribution + README added); builds clean
      there (`target/wasm32-wasip2/release/tb_ah_run_js.wasm`, 5,875,367 B)
- [x] Run it in a scratch depot and exercise a `.ts` route end-to-end (self-test 6/6)
- [ ] Fix `init`/`jobs` to accept `.ts` and run `init` at startup (upstream filters `.js` only
      and runs init from the minutely job — see [[trail-runtime-js-reference]] § Gaps)
      **AUDITED 2026-10-06.** *Startup path:* **DONE** — `runtime.rs:113` calls
      `init::run_init_scripts` when the guest context is created, and `jobs.rs:29` calls
      `ensure_global_init` from the minutely job. *`.ts` acceptance:* **NOT done** — `init.rs:106` and
      `jobs.rs:95` still filter `extension == "js"`. **But it is moot for this app:** there is no
      `ahscripts/init` or `ahscripts/jobs` directory (verified absent in `runtime/` and the synced
      depot, and no git history ever had one), so nothing runs through either path and the `.ts` gap is
      never hit. Left open only as an upstream-shape item.
      **On the 2026-10-06 request to use this to "recreate all reports every morning":** that assumed a
      persistent report/invoice KV cache to regenerate, and **there is none** — KV is a transient spool
      handoff plus a one-string data stamp, and the reports are SQL over base tables in ~0.05–1.2 s. A
      timer rebuild would also reverse `reports.no_precomputation`. See
      [[kv-is-a-handoff-not-a-report-cache]]. The init/jobs mechanics are not needed for it.
- [x] Measure JS throughput, per-request latency and load time vs the Phase 0 StarlingMonkey numbers
- [ ] Close the gaps: real `fetch`, typed/transactional DB params, handler cache
      **AUDITED 2026-10-06 — 2 of the 3 are done.**
      *real `fetch`:* **DONE** — `api/fetch.rs` exposes `http.request`, which returns
      `{status, headers, body}` (the response-with-headers client the worker fan-out needs) alongside
      `http.postJson`.
      *handler cache:* **DONE** — `runtime.rs` has `CODE_CACHE`, the processed (TS-stripped) route
      source keyed by path and content hash, so a route is compiled once per unchanged file.
      *typed/transactional DB params:* **NOT done**, and this is the one with a correctness edge.
      `api/sqlite.rs:267,302` send **every** parameter as `Value::Text` — harmless for this app, which
      passes hex into `unhex(?)` and lets SQLite coerce numbers, but it is not "typed". More
      importantly there is **no transaction support**: no `BEGIN`/`COMMIT` in the bridge, and
      `routeKit.write` (`app/lib/route-kit.js`) runs its statements untransacted, so a multi-statement
      write (a management create + its link sync) that fails partway can commit a partial one.
- [x] HTML response shape + Rust `minijinja` rendering (`render.html`), driven from a route
      (`GET /page` → `text/html`); filters ported — see [[runtime-js-single-host]]
- [x] Decide how this host relates to the plan's `app-host`/`compute`/`worker` components and
      record the decision — [[runtime-js-single-host]] (single host; D3 amended)
- [x] Vault: update [[trail-runtime-js-reference]] with measured results — done 2026-09-26

## Related

- [[trail-runtime-js-reference]] — what the project is and how it maps to the plan.
- [[trailbase-guest-wasm-runtime-defaults]] — the decision this may amend.
