---
title: "Rendering is a component behind a versioned envelope — a name, not a value"
type: decision
status: accepted
decided_on: 2026-09-30
created: 2026-09-30
tags: [render, components, envelope, pipeline, minijinja, wasm, guest]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[runtime-js-single-host]]", "[[client-side-live-recalculation]]", "[[component-split-and-sql-materialised-tables]]", "[[manifest-driven-routing-and-data-dag]]", "[[trailbase-loads-multiple-components-flat-router]]", "[[guest-db-bridge-text-params-only]]", "[[report-render-row-cap]]"]
---

# Rendering is a component behind a versioned envelope — a name, not a value

## Context

[[runtime-js-single-host]] folded minijinja into the app host as an in-process bridge
(`render.html(name, ctx)`), and its packaging has been "actively being revisited" since. The
question this settles: **can the renderer be a separate component, with any renderer swapped in
behind a standard message?**

It can, and the pieces are already proven. What has never existed is the **contract** — a shape
both sides agree on, so the renderer is replaceable rather than merely extractable.

## Decision

### The renderer is a component, addressed over HTTP, under a versioned envelope

Rendering is one stage of a pipeline and nothing more:

```
request ─▶ data (x.sql) ─▶ render (any component) ─▶ response
              │ address          │ address
              ▼                   ▼
         shared KV store ──────────┘
```

**Every stage boundary carries an address, not a value.** The data stage writes its artefact to the
KV store and answers with `{ store, key, bytes, format }`; the render stage receives that address,
pulls the bytes itself, and renders. The response stage does the same in reverse when the body is
large enough to be worth not carrying through the hop.

This is the owner's design, and it is the reason the split is affordable: the measured cost of a
component boundary (**+71%, ~1.4 s per 60k rows**, [[component-split-and-sql-materialised-tables]])
was measured for **acquisition**, where 60k rows are pushed *through* the hop as a value. With an
address, the render hop carries a few hundred bytes of envelope and the payload never crosses it.
**That is a prediction, not a measurement** — §Consequences says what must be measured.

### The envelope

Request, `aa_render` is the envelope version and is required:

```json
{
  "aa_render": 1,
  "request_id": "r-8f2c…",
  "template": { "name": "invoices/document.html" },
  "context":  { "address": { "store": "kv", "key": "render-ctx:8f2c", "bytes": 120433, "format": "json" } },
  "options":  { "paper": "a5" },
  "requires": ["extends", "import", "filters:money", "filters:date"]
}
```

Response:

```json
{
  "aa_render": 1,
  "status": "ok",
  "body": "<!doctype html>…",
  "content_type": "text/html",
  "diagnostics": { "renderer": "minijinja", "template_ms": 3, "bytes": 15793 }
}
```

Rules that keep it renderer-agnostic, which is the whole point:

1. **No template-engine vocabulary.** `template` is a name and an optional source; the envelope
   never says "extends", "macro" or "block". Those appear only in **`requires`**, which is a
   *declaration of what the job needs*, not of how it is done.
2. **`requires` is checked, not assumed.** A renderer advertises its capabilities and the caller
   either finds one that satisfies the job or **refuses** — it never silently renders a template
   whose `{% extends %}` quietly does nothing. A wrong answer here is worse than an error.
3. **The context is JSON, or an address to JSON.** No engine-specific value types cross the
   boundary, so a renderer written in another language needs no knowledge of this one.
4. **`diagnostics` is mandatory on both success and failure.** A renderer that cannot say which
   template and how long is not replaceable in practice — this is the fix for the opaque
   `component responded unexpectedly` failure mode.
5. **`aa_render` is versioned and required.** An older renderer answers with its own version rather
   than guessing.

### Disjoint URL space, because the router is flat

TrailBase merges every component's handlers into **one flat axum router** and panics at startup on
an identical method+path ([[trailbase-loads-multiple-components-flat-router]]). The renderer
therefore owns **`/render/*`** and must never claim `/{*wildcard}`, which the app host already has.
The main component's wildcard and a static segment coexist; two identical routes do not.

### Sequencing: envelope first, in-process second, component third

The envelope is the deliverable. `minijinja` stays the **in-process default** until the split is
measured, and the component becomes the default only if the measurement supports it. Swapping a
renderer is then a configuration value, not a rewrite — which is what "replaceable" has to mean in
practice.

## Why

- **A renderer you cannot swap is a renderer you cannot choose.** minijinja is a fine choice; it is
  the *only* choice that cannot be questioned, and the only replacement path that requires editing
  Rust in the app host is a replacement nobody will actually make.
- **The envelope is the reusable asset.** The pipeline shape, the address convention and the
  capability negotiation are useful whatever renders the page — and they are the part
  [[manifest-driven-routing-and-data-dag]] needs for its `render` step kind, which it does not have
  today.
- **It is the honest answer to the report deadline.** Rendering off the request thread is one of
  only two ways to stop a heavy report holding a runtime thread
  ([[heavy-report-blocks-runtime-threads]]); the other is moving the compute to SQL. This is the
  cheaper of the two and composes with it.
- **An unmeasured split is not a decision.** Composing the components measured *faster*
  ([[component-split-and-sql-materialised-tables]]) — but for acquisition, and with values crossing
  the hop. Assuming the same answer for a render stage that passes an address would be repeating
  that category of mistake.

## Consequences

**Accepted**

- minijinja's ten custom filters, its template roots and its globals move to (or are mirrored by)
  the renderer component; a second renderer must reimplement them to be a drop-in.
- Rendering is one HTTP hop deeper when the component path is used, bounded by the ~20 s per-call
  deadline that applies to every component.
- Two components to build and two to deploy; the renderer is small (the SQL component was 0.78 MB
  against the host's 6.86 MB), but the operational count doubles.

**Given up / to watch**

- **The measurement is the deliverable, not the split itself.** Until the render split is measured
  with an address handoff, "+71%" is the only number on record and it was for a different stage. If
  the hop costs more than expected, the component stays off the request path and the envelope is
  used for choosing among in-process renderers — which is still worth having.
- **Envelope drift.** Two components can disagree about the shape and only fail at render time. The
  version field is the mitigation; a conformance check in the smoke suite is the missing piece.
- **`requires` is a real negotiation surface** and will grow. It starts with what minijinja actually
  offers, and it must be additive — a renderer that does not recognise a requirement must refuse,
  not ignore it.

## Evidence

- `trailbase/host-sql/` — the working second component: disjoint `/rpc/*`, KV address handoff,
  0.78 MB.
- `trailbase/host/src/render.rs` — the renderer to be moved, including the ten filters and the
  read-only-WASI loader note.
- `trailbase/runtime/app/lib/http.js` — `page()`, the current caller.
- [[component-split-and-sql-materialised-tables]] — the +71% measurement and what it did and did
  not cover.

## Related

- [[runtime-js-single-host]] — the decision this supersedes on packaging.
- [[manifest-driven-routing-and-data-dag]] — the pipeline this gives a `render` step kind.
- [[client-side-live-recalculation]] — the other place a "same formula, two runtimes" boundary
  exists, and the cautionary tale about keeping the two in step by hand.
