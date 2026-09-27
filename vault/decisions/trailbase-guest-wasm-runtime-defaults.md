---
title: Run the app platform as TrailBase guest-WASM components
type: decision
status: accepted
decided_on: 2026-09-26
created: 2026-09-26
tags: [trailbase, wasm, guests, architecture, runtime]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[trailbase]]", "[[frontend-ssr]]", "[[trailbase-guest-wasm-spike-results]]", "[[offline-local-deployment]]"]
---

# Run the app platform as TrailBase guest-WASM components

## Context

`frontend-ssr` ([[frontend-ssr]]) is a Node/Express process that renders pages, runs report
arithmetic in `worker_threads`, and keeps a warm in-memory snapshot. The wasm app-platform plan
(`.kilo/plans/1790438607199-trailbase-wasm-app-platform.md`) proposes replacing that process with
TrailBase **guest-WASM** components that run on TrailBase's built-in wasmtime: architecture
compiled once, business logic (pages, templates, report/ledger code) loaded and evaluated from an
`app/` directory at runtime, and parallel work sharded into jobs.

Phase 0 spikes S1–S8 were run to decide whether the premise holds before any build-out
([[trailbase-guest-wasm-spike-results]]).

## Decision

Adopt TrailBase guest-WASM as the app platform, with these locked choices:

| # | Choice | Settled by |
|---|---|---|
| D1 | **TrailBase built-in guests only** — JS/TS components built with `jco componentize` against `trailbase-wasm/wit`, auto-loaded from `<depot>/wasm/`, routes on TrailBase's one Axum server (one port). | S1 |
| D2 | **Business logic is runtime-evaluated JS** in `app/compute/*.js`, loaded and executed at runtime — no component rebuild to add a report/page. | S4, S4b |
| D3 | **Rendering is a Rust `minijinja` guest** (the real crate), so the existing templates + filters port byte-for-byte. | not yet spiked |
| D4 | **App content lives in a filesystem `app/` directory** read at runtime with `readFileSync`. | S3 |
| D5 | **Jobs = durable SQLite queue + HTTP fan-out** to worker components, with leases, retries and idempotent steps. | S6, S7 |
| D6 | **No custom WIT between our components** — they speak HTTP+JSON; only TrailBase's own `trailbase:component` world is used. | S1 |

Runtime defaults established by the spikes:

1. **Do not pass `--aot`.** It roughly doubles size and is 2.3× slower to cold-load; no
   persistent compiled-artifact cache was observed. ([[trailbase-guest-aot-startup-cost]])
2. **Set `--runtime-root-fs=<absolute app dir>`** (env `RUNTIME_ROOT_FS`). This is the WASI
   sandbox root: `app/` is then readable as `/`, files outside it are `no-entry`, and `..`
   traversal is `not-permitted`. Without it the app directory is unreadable, so this flag is
   load-bearing for D4.
3. **Use `--runtime-threads` for CPU parallelism.** A single component already handles concurrent
   requests in parallel, so N copies are only needed to isolate long/blocking handlers and to
   bound the blast radius of the ~20 s per-call deadline.
4. **Never block the JS thread.** The guest clock does not advance within a single turn, so a
   `Date.now()` busy-wait never ends and a long synchronous handler trips a ~20 s timeout
   (`500 component responded unexpectedly`). CPU-bound business JS must yield or be sharded.
   ([[trailbase-guest-cpu-js-limits]])
5. **Treat `app/` as trusted, reviewed code.** Evaluated business JS runs with the guest's
   capabilities in scope; expose a narrow `ctx` API rather than reaching for raw host functions.
6. **Auth is TrailBase's own.** Cookie login sets `auth_token`/`refresh_token` (`SameSite=Strict`)
   and `req.user()` is `{id,email,csrf}`. CSRF tokens are not enforced server-side; do not build a
   second session layer on the guest side.

## Why not the alternatives

| Alternative | Why not |
|---|---|
| Keep the Node/Express `frontend-ssr` process | Works today (55/55 smoke) but is a second runtime, a second deploy step, and a process-local snapshot that cannot be shared across copies. The platform goal is one binary, one depot, offline. |
| Build a build-time bundle of the report logic into the component | Rejected once S4 passed: it would mean a rebuild for every report/page, losing the authoring model. Kept only as the D2-B fallback. |
| Sync `app/` into DB/KV instead of the filesystem | Unnecessary once S3 passed (`--runtime-root-fs`). Kept as the D4-B fallback. |
| `--aot` components | Strictly worse on this runtime (size + cold start). |

## Consequences

**Accepted**

- The platform is a set of `*.wasm` files in the depot plus an `app/` directory; deployment is a
  file copy, matching [[offline-local-deployment]].
- Adding a report or a whole feature is adding files under `app/` (plus TrailBase migrations); no
  component rebuild.
- Jobs get a durable queue with `UPDATE … RETURNING` leases; failure handling uses `err.payload`,
  not `Error.message` ([[trailbase-guest-error-string-opaque]]).
- The route table is fixed at startup, so every authorable feature goes through generic routes
  (`/p/<slug>`, `/compute/{pool}`, …); only a new *architecture* route needs a restart.

**Given up / open**

- Long CPU-bound handlers are dangerous on the guest (single-threaded, ~1·10⁶ iter/s, ~20 s
  deadline). Heavy aggregation should stay in SQL or move to sharded job steps.
- The Node `frontend-ssr` stays as the reference and rollback until parity
  ([[frontend-ssr-feature-parity-gaps]], and the cutover decision
  [[pos-0028-decide-cutover-plan]]).
- D3 (the Rust `minijinja` guest) is the main unproven piece; it is Phase 2 of the plan.

## Evidence

- [[trailbase-guest-wasm-spike-results]] — S1–S8 commands and observed output.
- `.kilo/plans/1790438607199-trailbase-wasm-app-platform.md` — the full plan and gates.
- `guests/src/index.ts` — the throw-away spike guest.
- `guests/spikes/depot/config.textproto` — the scratch depot's config.
