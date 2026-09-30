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
- [x] Measure JS throughput, per-request latency and load time vs the Phase 0 StarlingMonkey numbers
- [ ] Close the gaps: real `fetch`, typed/transactional DB params, handler cache
- [x] HTML response shape + Rust `minijinja` rendering (`render.html`), driven from a route
      (`GET /page` → `text/html`); filters ported — see [[runtime-js-single-host]]
- [x] Decide how this host relates to the plan's `app-host`/`compute`/`worker` components and
      record the decision — [[runtime-js-single-host]] (single host; D3 amended)
- [x] Vault: update [[trail-runtime-js-reference]] with measured results — done 2026-09-26

## Related

- [[trail-runtime-js-reference]] — what the project is and how it maps to the plan.
- [[trailbase-guest-wasm-runtime-defaults]] — the decision this may amend.
