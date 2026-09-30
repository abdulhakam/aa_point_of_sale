---
title: "Measured — the render split costs a fixed hop, and the address form only removes the payload part"
type: issue
status: resolved
severity: medium
created: 2026-09-30
updated: 2026-09-30
tags: [render, components, envelope, performance, measurement, guest]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[rendering-is-a-component-behind-an-envelope]]", "[[component-split-and-sql-materialised-tables]]", "[[trailbase-loads-multiple-components-flat-router]]", "[[client-side-live-recalculation]]", "[[report-render-row-cap]]", "[[heavy-report-blocks-runtime-threads]]", "[[runtime-js-single-host]]"]
---

# Measured — the render split costs a fixed hop, and the address form only removes the payload part

This is the measurement [[rendering-is-a-component-behind-an-envelope]] named as the deliverable of
the split, rather than the split itself. Measured 2026-09-30 on the production depot with
`/bench/render`, median of 9 rounds, 19,770-byte context, 200 rows.

| Arm | Median | Overhead |
| --- | --- | --- |
| **In-process** (`render.html`, no hop) | **6 ms** | — |
| Component, context inline in the envelope | 16 ms | +10 ms (+167%) |
| Component, context as a KV **address** | 13 ms | +7 ms (+117%) |

## What this settles, and what it does not

**The prediction was half right.** The address form does what it was designed to do — it removes the
payload from the hop, worth 3 ms at 19.8 KB — but the dominant cost is a **fixed round trip between
two WASM components**, roughly 7 ms, which no envelope can avoid. That is why the acquisition split
was +71% (a hop carrying 60k rows) while this is +117% of 6 ms.

The honest reading: **the split costs about 7 ms per rendered page, always.** It is not free and it
is not catastrophic. It buys a replaceable renderer and a render step that can run on a different
runtime thread; it does not buy speed.

**It also does not help the report deadline**, which is the hope it was carrying. Rendering is
0.031 ms/row — about **0.7 s** for the 21.8k-row profit report, roughly **3%** of the 20 s budget it
cannot fit inside. The 20 s is in the JavaScript view pipeline, and no amount of moving the
template engine fixes that.

## Consequences

**Accepted**

- **The default stays `inproc`.** 7 ms of fixed overhead on every page buys nothing a shop can see,
  and the component is a second thing to build and deploy. It is one config value away:
  `app/config/renderer.json` → `{"renderer": "component"}`. Every page then renders through
  `renderer.wasm` with **byte-identical output**, verified across the dashboard, invoices,
  payments, cash memo and the invoice document.
- The `address` form is enabled by config and is the right shape for a large document: it is the
  only arm whose cost does not grow with the payload.

**Given up / to watch**

- The 3 ms difference between inline and address at 19.8 KB understates the address form's value. At
  the multi-megabyte payloads a big report produces, the arms would diverge sharply — and reports are
  exactly the case documents do not cover ([[rendering-is-a-component-behind-an-envelope]]).
- Every measurement here is a **median of 9 on one machine, in one process**, with both components
  sharing four runtime threads. It is a direction, not a benchmark.

## Evidence

- `/bench/render?rounds=9` — the three-way comparison, and `rendererStatus` alongside it.
- `trailbase/host-renderer/` — the component; 2.25 MB against the app host's 7.61 MB.
- The byte-identical check: the same pages rendered by each arm returned the same lengths
  (dashboard 11,062; invoices 204,391; payments 264,729; cash memo 10,054).

## Related

- [[rendering-is-a-component-behind-an-envelope]] — the design this measures.
- [[component-split-and-sql-materialised-tables]] — the +71%, and why it does not transfer.
