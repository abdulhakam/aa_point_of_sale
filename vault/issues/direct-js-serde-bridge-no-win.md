---
title: Direct JS-to-serde render bridge shows no speed win (large contexts may be slower)
type: issue
status: wontfix
severity: low
created: 2026-09-28
updated: 2026-09-28
tags: [performance, rendering, minijinja, rquickjs, serde, bridge, disproved]
related_to: ["[[report-performance-baseline]]", "[[snapshot-persistence-hits-the-20s-deadline]]", "[[compiled-artifacts-are-generic-capabilities]]", "[[runtime-js-single-host]]"]
---

# Direct JS-to-serde render bridge shows no speed win

## What was tried (2026-09-28)

To remove the render-context JSON round-trip — JS `JSON.stringify(ctx)` → Rust
`serde_json::from_str` — the host bridge was changed to accept the **JS value** and convert it
directly to `serde_json::Value` via a generic recursive walker (`js_to_json` in
`src/host/src/api.rs`), with `Renderer::render_value` taking serde directly
(`src/host/src/render.rs`). `app/lib/http.js` was switched to pass the object
(`render.html(name, ctx)`). Behaviour was preserved: `guest-smoke` stayed **71/71**.

## Result: no win, and a regression on the largest context

| report (cold, fresh filter) | JSON-string path (baseline) | direct JS→serde path |
|---|---|---|
| salesreport | 2,175 ms | 2,227 ms |
| payments | 5,528 ms | **9,277 ms** |
| ledgers/general | 12,967 ms | 500 @ 20 s |

Reverting the caller (`http.js` back to `JSON.stringify(ctx)`) restored the numbers
(`payments` 9,277 → 6,143 ms cold), confirming the walker was the cost.

## Why

QuickJS's `JSON.stringify` is optimized C over a contiguous object graph, and Rust's
`serde_json::from_str` is a fast single pass. Walking the same object **property by property
through the rquickjs C API** (a call per key and per value, recursively) costs more for a large,
wide context (21k rows × many fields). The JSON string is not the bottleneck here — the same
conclusion as the earlier disproved "ship rows columnar to avoid JSON stringification" idea
(`corrections` → `runtime_js.warm_cost_json_boundary`).

## Decision

- **Keep the string path** (`render.html(name, JSON.stringify(ctx))`) — it is measurably as good or
  better.
- **Keep the bridge capability** (it still accepts a JS value and converts it): it is a generic,
  rule-compliant capability ([[compiled-artifacts-are-generic-capabilities]]) that a *small* context
  may prefer, and it cost only the one build already done. It is simply not the default.
- Do not pursue further JSON-boundary micro-optimisation; the cold-path cost is row shaping +
  minijinja rendering ([[guest-report-performance-options]]).

## Evidence

- `src/host/src/api.rs` — `js_to_json`, `ctx_json_value`, the `render.html`/`render.string` bridge.
- `src/host/src/render.rs` — `render_value`, `render_string_value`.
- `app/lib/http.js` — the caller (string path kept, with a pointer here).
- Measurements in [[report-performance-baseline]]; `guest-smoke` 71/71 both ways.
