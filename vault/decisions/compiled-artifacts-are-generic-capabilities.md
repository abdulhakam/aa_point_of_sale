---
title: Compiled artifacts are generic capabilities; runtime files carry all app and data logic
type: decision
status: accepted
decided_on: 2026-09-28
created: 2026-09-28
tags: [architecture, wasm, rust, genericity, no-build, platform, minijinja, ironcalc]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[runtime-js-single-host]]", "[[report-logic-stays-runtime-file-based]]", "[[trailbase-guest-wasm-runtime-defaults]]", "[[trailbase-guest-cpu-js-limits]]", "[[guest-report-performance-options]]", "[[tb-0017-adopt-trail-runtime-js]]"]
---

# Compiled artifacts are generic capabilities; runtime files carry all app and data logic

## Decision (owner, 2026-09-28)

**Every compiled artifact in this system must be generic.** A compiled artifact provides a
*function or feature* — never app logic and never data logic. All business meaning lives in the
runtime scripts and files under `app/` and `ahscripts/`, which **call** those generic capabilities
to speed up processing and conversion.

The goal is a general platform: the same generic host can be used to build **any** kind of app with
**any** kind of data logic. The point-of-sale is the first app built on it, not the shape of the
artifact.

Concretely:

1. **The compiled surface is a catalogue of generic verbs, not nouns.** Today that is: execute SQL
   (`trailbase-wasm` `db`), evaluate/transpile runtime JS/TS (rquickjs + swc), render a template
   (minijinja), HTTP `fetch`, the KV store, and the durable job/queue. Words like *invoice*,
   *party*, *profit*, *report*, *money-is-2dp* must not appear in Rust — those are runtime data and
   runtime logic.
2. **Runtime files compose the capabilities.** A report/page/edit flow is a runtime script that
   resolves its own filters, emits SQL, shapes the result, and hands it to a template. The script
   decides *what* and *how*; the artifact only provides the *ability*.
3. **Packaging is not part of the app contract.** A capability may be compiled into the main guest
   or moved behind a separate component (HTTP or WIT boundary) — and moved back — without a single
   change to app logic. This is why rendering (minijinja) is a **generic capability that can be
   decoupled** from the main guest: extraction is a packaging change, not a logic change.
4. **A new capability is a one-time rebuild; using it never is.** Adding a generic feature (a
   concurrent multi-query runner, a spreadsheet-formula evaluator such as ironcalc, a new
   transpiler target) recompiles the artifact once. After that, every *use* of it is a runtime file
   or data edit ([[report-logic-stays-runtime-file-based]]).
5. **Performance work happens *inside* generic capabilities.** SQL aggregation, Rust rendering,
   worker fan-out, materialised tables and multi-connection reads are all legitimate generic
   features; the app opts into them by calling them, not by changing to a bespoke build.

## Relationship to earlier decisions

- **Amends the framing of [[runtime-js-single-host]].** That decision folded rendering into
  `runtime-js` for the first cut and already noted "extracting a `render` crate later means moving
  `render.rs` behind an HTTP or WIT boundary". This decision makes that explicit: the renderer is a
  *generic capability that is decouplable*, so single-host packaging is an optimization, not a
  constraint on the app model.
- **Generalises [[report-logic-stays-runtime-file-based]].** That note already says the Rust
  renderer stays `render(templateName, data)` and that only a *new native capability* forces a
  rebuild. This decision states the same invariant for **all** artifacts, not just the renderer.

## Invariants to hold (review checklist)

1. No business/data nouns in compiled code — only generic verbs and shapes.
2. Every capability is reachable from runtime scripts through a documented, stable, generic interface.
3. Changing pages, routes, report/SQL logic, filters, formulas, templates or table definitions is a
   runtime file edit (or a migration apply) — never a rebuild.
4. A capability's *packaging* can change (in-host ↔ separate component) without changing any caller's
   app logic.
5. The host's route table stays a generic file router; it does not grow app-specific routes.

## Consequences

**Accepted**

- Portability and reuse: one generic host can back the POS, a retail/wholesale variant, or an
  unrelated app, by swapping runtime files and data.
- The no-build authoring property ([[trailbase-guest-wasm-runtime-defaults]], D2) holds for the whole
  app, not just rendering.
- Speed work is decoupled from app logic: optimizing SQL/Rust/concurrency never risks business
  behaviour.

**Given up / to watch**

- **Indirection cost.** A generic capability is usually a little slower and more awkward than a
  bespoke compiled path; the discipline buys flexibility at the margin.
- **Boundary overhead if decoupled.** Moving a capability out of the host (as minijinja *could* be)
  adds HTTP/WIT + JSON round-trips and a second artifact to deploy — which is exactly why the
  single-host cut exists. Decoupling is a capability, to be exercised only when a real need
  (isolation, deadline, reuse by a non-JS component) appears.
- **Over-generality.** A capability forced to serve every possible app can become slow and complex;
  the catalogue should stay small and sharp ([[trailbase-guest-cpu-js-limits]] for the size/deadline
  budget).
- **Discipline required.** The rule is only worth anything if a reviewer rejects a PR that hardcodes
  app meaning into Rust.

## Evidence

- `trailbase/tb-ah-run-js/src/render.rs` — minijinja + the ten ported filters, exercised as a generic
  `render.html/render.string` capability.
- `trailbase/tb-ah-run-js/src/api.rs`, `trailbase/tb-ah-run-js/src/lib.rs` — the generic bridges (render,
  SQL, response shaping); the host is described as "architecture only" in
  [[runtime-js-single-host]].
- `trailbase/runtime/ahscripts/routes/_app/route.ts` — the generic runtime file router; all app
  routes and report dispatch are runtime JS/TS.
- `trailbase/runtime/app/compute/*.js`, `app/reports/sql/views/*.sql` (deleted 2026-10-02),
  `app/views/**` — the runtime authoring surface that composes the capabilities.
- [[runtime-js-single-host]] — the accepted single-host packaging this reframes as an optimization.

## Related

- [[report-logic-stays-runtime-file-based]] — the report-level form of the same invariant.
- [[guest-report-performance-options]] — the performance work that must live inside generic
  capabilities.
- [[tb-0017-adopt-trail-runtime-js]] — the host adoption this constrains.
