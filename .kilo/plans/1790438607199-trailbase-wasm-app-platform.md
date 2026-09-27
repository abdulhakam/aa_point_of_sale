# Re-platform `frontend-ssr` onto TrailBase guest-WASM (runtime-JS app platform)

## Goal

Replace the Node/Express `frontend-ssr` process with a set of TrailBase **guest-WASM
components** running on TrailBase's built-in wasmtime, where:

- **Architecture is compiled once** into a few generic `.wasm` components (routing, rendering,
  job dispatch, data/query).
- **Business logic is not compiled**: pages, templates and report logic live as files in an
  `app/` directory, loaded and evaluated at runtime. Adding a report/page or a whole new
  feature (invoices, landing page, catalog) means adding files + TrailBase tables — **no
  component rebuild**.
- **Parallel work is sharded into jobs** dispatched over HTTP to worker components, with a
  durable queue, leases, retries and idempotent steps.

## Non-goals / out of scope

- Not touching production. The legacy pair (`backend/` PocketBase + `frontend/` Next.js)
  stays live ([[keep-legacy-stack-in-production]]). Nothing routes real traffic to this.
- Not deciding the POS cutover ([[pos-0028-decide-cutover-plan]]) — this is a larger,
  separate re-platform that supersedes parts of it and must be reconciled later.
- Not porting the legacy Next.js report screens ([[tb-0013-rework-report-screens-without-views]]).
- Invoices/cash-memo/printing parity is not delivered here; the platform must merely make
  them *authorable* as new app pages later ([[frontend-ssr-feature-parity-gaps]]).

## Decisions locked (from the design interview)

| # | Decision | Rationale |
|---|---|---|
| D1 | **TrailBase built-in guests only.** Components are JS/TS built with `jco componentize` against `trailbase-wasm/wit`, dropped into `traildepot/wasm/`, routes mounted on TrailBase's single Axum server (one port, `4000`). | Matches "everything on TrailBase's wasmtime"; one binary, one depot, offline. |
| D2 | **Business logic is runtime-evaluated JS** in `app/compute/*.js`. | Keeps JS developers productive and preserves the existing `compute/` code with no rebuild. |
| D3 | **Rendering is a Rust `minijinja` guest.** | `minijinja-js` cannot nest inside a WASM guest; the real crate keeps all 18 templates + custom filters byte-for-byte. |
| D4 | **App content lives in a filesystem `app/` directory**, read at runtime via `readFileSync`. | Mirrors today's `pages/`+`views/`+`compute/`; copy-folder deployment; reviewable files. |
| D5 | **Jobs = durable SQLite queue + HTTP fan-out to worker components**, with leases, retries, idempotency. | Robust across restarts; parallelism does not depend on one component being re-entrant. |
| D6 | **"No WIT" means no *custom* WIT contracts between our components** — they speak HTTP+JSON. TrailBase's own `trailbase:component` WIT world (supplied by `trailbase-wasm`) is still used to compile guests. | This is the only way to be a TrailBase guest; we never author or share our own WIT. |

## Evidence this plan is built on (verified this session)

- Guests are auto-loaded from `<traildepot>/wasm/*.wasm`; a guest registers HTTP routes and can
  be JS/TS (`trailbase-wasm` + `jco componentize -w node_modules/trailbase-wasm/wit`), per
  <https://trailbase.io/documentation/apis_js/> and the `wasm-guest-ts` example.
- Guest capability surface (`trailbase-wasm@0.6.0` d.ts/WIT):
  `HttpHandler` routes + path/query params + `req.json()` + `req.user()`; direct
  `query`/`execute`/`Transaction`; `readFileSync` + WASI filesystem imports; `kv` store;
  `JobHandler.minutely/hourly`; `addPeriodicCallback`/timers; outbound `wasi:http/outgoing-handler`
  (StarlingMonkey `fetch`).
- Route table is fixed at startup; **adding/removing routes requires a server restart**; editing
  a handler can hot-reload via `SIGHUP`. Therefore every authorable feature must go through
  **generic** routes (like today's `/p/<slug>`), never a new route per page.
- `jco componentize` embeds StarlingMonkey (SpiderMonkey, ~8 MB engine per JS component).
  StarlingMonkey has a generic runtime mode for dynamic JS evaluation, but **whether runtime
  `eval`/`new Function` works in a *specialized* `jco` component is UNVERIFIED** (spike S4).
- TrailBase auth: built-in APIs/UI at `/_/auth/*` (`trail components add trailbase/auth_ui`),
  cookies carry tokens in browsers, and guests receive the resolved user via `req.user()`
  (`{id, email, csrf}`).
- Repo facts: `traildepot/wasm/` is already git-ignored/runtime; the current app is
  `frontend-ssr/` (Express + MiniJinja + `worker_threads`, `npm run smoke` = 55/55).

## Target architecture

### Component map (each a `*.wasm` in `traildepot/wasm/`)

| Component | Lang | Owns routes | Responsibility | Maps from today |
|---|---|---|---|---|
| `app-host` | JS/TS | `/`, `/dashboard`, `/reports/*`, `/ledgers/*`, `/management/*`, `/p/*`, `/plugins/*`, `/static/*`, `/healthz` | Front controller: auth gate via `req.user()`, load `app/` manifests + templates, resolve filters, call `compute`/`data`/`render`, serve HTML/static, handle forms (record writes) | `src/server.js`, `src/routes/*`, `src/lib/http.js`, `src/lib/pages.js`, `src/lib/auth.js` |
| `render` | Rust (`minijinja`) | `POST /render` | Render `{template, ctx, roots}` → HTML; template cache by mtime; custom filters | `src/lib/render.js` + `compute/format.js` filters |
| `compute` (×N) | JS/TS | `POST /compute/{pool}` | Load `app/compute/*.js`, evaluate at runtime, run report/ledger calculators against data | `compute/reports.js`, `compute/views.js` (values) + `worker_threads` pool |
| `data` | JS/TS | `GET /data/snapshot`, `POST /data/query`, `POST /data/invalidate`, `GET /data/status` | Data access + derived-view materialization + fingerprint/refresh + TrailBase record proxy | `src/lib/reports/{data,index,pool}.js`, `src/lib/trailbase.js` |
| `jobs` | JS/TS | `POST /jobs`, `GET /jobs/{id}`, `POST /jobs/{id}/cancel`, `GET /jobs/{id}/result` | Durable queue, split into steps, dispatch via `fetch`, reconcile/retry, status API | nothing (new) |
| `worker` (×N) | JS/TS | `POST /worker/{pool}/step` | Execute one idempotent job step (load `app/jobs/*.js` at runtime) | nothing (new) |

Notes:
- **`compute` and `worker` are deployed as multiple copies with distinct route prefixes**
  (e.g. `compute-1.wasm`…`compute-N.wasm`, `POST /compute/1`…). This is the concrete source of
  parallelism if the host serializes a single component (spike S5). Size N from a config knob,
  default `CPUs − 1` to mirror today's `WORKER_THREADS`.
- `data` replaces the in-memory warm snapshot with **SQLite-materialized view tables** plus a
  short-TTL KV cache. In-memory state is unsafe now: a guest has no single "the" instance across
  restarts/copies. Rebuild is still incremental (fingerprint `{count, newest updated}` →
  `viewsAffectedBy`), but the result is persisted, not held in a process.

### Request/data flow (report page)

```text
browser ──HTTP(cookie)──▶ TrailBase :4000
   ├─ /_/auth/*                       (built-in auth; sets cookie)
   ├─ /dashboard,/reports/*,...  ─▶ app-host.wasm
   │        ├─ req.user()? no → 302 /_/auth/login
   │        ├─ read app/pages/<slug>/meta.json + app/views/*.html   (readFileSync)
   │        ├─ filters resolved from manifest
   │        ├─ POST /compute/<pool>  ─▶ compute-N.wasm   (eval business JS)
   │        │                                   └─ query() ▶ SQLite (materialized views)
   │        ├─ POST /render           ─▶ render.wasm (Rust minijinja)
   │        └─ HTML response
   └─ /jobs,...                  ─▶ jobs.wasm ──fetch──▶ worker-N.wasm  (sharded steps)
```

### App directory contract (authoring surface, no rebuild)

```text
app/
  pages/<slug>/meta.json        # title, template, needs, compute, filters, columns, totals  (as today)
  pages/<slug>/page.html        # minijinja template
  views/**/*.html               # layout + partials
  compute/*.js                  # runtime-evaluated report/ledger logic + format helpers
  jobs/*.js                     # runtime-evaluated job step implementations
  plugins/<slug>/{meta.md,index.html}
  assets/**                     # css/js/img served by app-host at /static
  config.json                   # app name, business identity, worker count, cache TTLs
```

- Adding a page/report = add a folder (or `compute/*.js`) — **zero component rebuild**.
- Adding a *whole new feature* = new `app/pages/...`, `app/compute/...`, `app/jobs/...` plus new
  TrailBase migrations/tables. Components stay untouched.
- Business JS runs with the guest's capabilities in scope. Treat `app/` as trusted, reviewed
  code; expose a small `ctx` API (`query`, `fetch`, `kv`, `log`) so pages do not reach for raw
  host functions (see Risks).

## Phase 0 — capability spikes (GATED; do this first)

Each spike is a throw-away guest in a scratch depot. **Do not start Phase 1 until S2–S5 are
decided.** Record every result in the vault (`issues/` or `notes/`) with the exact command and
observed output.

| ID | Question | How | Gate / fallback |
|---|---|---|---|
| S1 | Does a minimal guest load and serve? | Build `jco componentize` hello-route; copy to `traildepot/wasm/`; `curl :4000/…` | Baseline; if it fails, stop and fix toolchain |
| S2 | Does `req.user()` populate from a browser cookie after `/_/auth/login`, and is CSRF required for POST? | Install auth UI; log in; route echoes `req.user()`; POST form | If no cookie auth → app-host implements its own login route exchanging `/api/auth/v1/login` and preserving the current signed-cookie design |
| S3 | What can `readFileSync` read (which preopen root)? Can it read the deployed `app/` dir? | Route reads a known file under depot vs project dir | If no useful preopen → **fallback D4-B**: deploy step syncs `app/` into DB/KV tables read via `query()`/`kv` |
| S4 | **Does runtime `eval`/`new Function` work in a `jco` component?** | Route does `new Function(cfg from file)()` and returns result | If no → **fallback D2-B**: `compute` becomes a build-time-bundled engine with a declarative/SQL path, and any JS change needs a rebuild (violates the goal; must be re-decided); see Open Q1 |
| S5 | Does TrailBase run concurrent requests for one component, or serialize? | Fire 2× slow (busy-loop) requests; measure wall time and CPU | If serialize → parallelism **requires** N component copies (already the plan) and per-copy limits; if concurrent → N may still be used for isolation/CPU-bound JS (single-threaded JS blocks the instance) |
| S6 | Can a guest `fetch()` `http://127.0.0.1:4000/...` (self), including its own/other routes? | jobs→worker round trip | If blocked → jobs fall back to DB-queue-only dispatch; parallelism via `JobHandler` pollers |
| S7 | Is `Transaction` + `UPDATE … RETURNING` usable for atomic job claim, with stable error strings? | Claim/lease test | If not → use `kv` compare-and-set lock or optimistic `version` update |
| S8 | Component size/startup/memory with `--aot` vs not, for a JS guest | Build both, measure | Feeds deployment section; JS engine ~8 MB per component ⇒ budget for N copies |

## Phase 1 — build toolchain + skeleton

> **Runtime-JS engine (2026-09-26):** `runtime-js/` is the adopted runtime-JS host — a Rust
> `wasm32-wasip2` guest embedding QuickJS (`rquickjs`) that runs dynamic `.ts`/`.js` files with
> `swc`, held in a persistent context, with file routing, `init` and `jobs`. It builds against
> `trailbase-wasm 0.6.1`, serves on `trail v0.33.22`, and adds a route with no rebuild. This
> **amends D2/D3** for the JS-compute side: the `compute`/`worker` components are expected to be
> this host (or a sibling Rust crate) rather than `jco` JS components. Evidence and measurements:
> `vault/notes/trail-runtime-js-reference.md`; task `tb-0017-adopt-trail-runtime-js`.

1. New source tree `guests/` (TS, Vite, `jco`): `package.json` with `trailbase-wasm`,
   `@bytecodealliance/jco`, `vite`, `typescript`; per-component entry `src/<name>/index.ts`.
2. Scripts: `build` (vite build → `jco componentize [--aot]`), `dev` (file watch → rebuild →
   `SIGHUP`), `deploy` (copy `*.wasm` → `traildepot/wasm/`, copy `app/` → app dir).
3. `render/` Rust crate (cdylib → component) using `minijinja`; same `build`/`deploy` flow.
4. `healthz` + admin metadata (`Metadata.display_name/version/admin_ui_path`) on each component so
   they show in TrailBase's admin WASM page (`InitManifest`).
5. Config: worker-copy count, app dir path, cache TTLs, timeouts/retries; read from `app/config.json`
   + KV, not env (TrailBase configures by file).

## Phase 2 — `render` (Rust minijinja) — architecture, no business logic

> **Status (2026-09-26): done, folded into `runtime-js`** rather than a separate
> component (see `vault/decisions/runtime-js-single-host.md`): `render.html(name, ctxJson)` /
> `render.string`, views-root-relative name resolution, and the ten filters are ported in
> `runtime-js/src/render.rs`; routes return `{ html }` and the host sends `text/html`. Item 4
> (parity vs `minijinja-js`) **passes**: 34/34 templates byte-identical and 9/10 filters identical
> (`json` diverges only because `minijinja-js` is buggy — Rust is correct). Harness:
> `frontend-ssr/scripts/render-parity.mjs`. Live template reload verified; a stale-cache defect
> was found and fixed (`vault/issues/trailbase-guest-template-cache-wasi-mtime.md`).

1. Route `POST /render` taking `{template, ctx, roots}`; resolve `{% extends %}`/`{% include %}`
   from the views root exactly as `lib/render.js` does (`resolveName` semantics).
2. Port the 10 custom filters from `compute/format.js`: `money`, `num`, `round`, `qty`, `date`,
   `datefmt`, `upper`, `lower`, `json`, `yesno`; `undefinedBehavior = lenient`, `trimBlocks`,
   `lstripBlocks`, `appName` global.
3. Cache templates by mtime (same policy as today).
4. Verify by rendering every existing template with fixture context and diffing against
   `minijinja-js` output.

## Phase 3 — `app-host` (routing, auth, pages, static)

> **Status (2026-09-26): mostly done in `runtime-js`** — see `vault/notes/guest-app-host-port.md`
> and task `tb-0018`. The dispatcher serves `/`, `/dashboard`, `/reports*`, `/management[/<entity>]`,
> `/plugins`, `/static/*`, `/compute/*`, `/p`, `/p/<slug>`, `/p/<slug>/data`, `/login`, `/logout`,
> `/healthz`, with auth gated on TrailBase's `req.user()`. Management **writes** and list cells are
> done (`db.execute` bridge; [[guest-writes-via-sql]]; `runtime-js/tools/management-check.mjs`).
> The app's own `/login` POST works ([[guest-outbound-http-and-login]]). Remaining: gzip, binary
> static (the current assets are text-only, so unnecessary), and record-API ACL parity for writes.

1. Route set mirrors today's URL space exactly; **no route is added per page**.
2. Auth gate: `req.user()` null → `302 /_/auth/login?redirect_uri=…`; else pass `{user}` to
   templates. Delete `SESSION_SECRET`/`src/lib/auth.js`/`session.js` when cut over.
3. Page registry: port `src/lib/pages.js` (`normalizeMeta`, filter defaults via `{fn}`,
   derived `needs.tables`, path-escape rejection) to load from `app/`.
4. Serve `/static/*` and `/plugins/<slug>/` from `app/` (readFileSync + correct content types).
5. Forms: create/update/delete go through TrailBase record APIs (or `data` proxy); handle
   form-urlencoded bodies; carry CSRF per S2.
6. Generic `/p/<slug>/data` returns `{version, slug, filters, result, meta}` (+ select tables),
   ETag/`no-cache`/gzip as today; `PAYLOAD_REVISION` retained.

## Phase 4 — `compute` (runtime JS eval)

> **Status (2026-09-26): done for reports.** The shared `compute/` modules run in QuickJS via the
> runtime-JS host, and all fourteen report/ledger pages match the Node app on the seeded depot
> (`runtime-js/tools/guest-parity.mjs`, 14/14). Two shared fixes were needed: an O(n log n)
> `buildLedgerParty` and an engine-independent `compareText` sort
> (`vault/decisions/deterministic-sort-and-sql-reads-in-guest.md`). The N-copies/worker split is
> not needed — the guest runtime already parallelises (`--runtime-threads`).

1. Route `POST /compute/{pool}` `{module, fn, args}` and `{report, filters}`.
2. Load `app/compute/*.js` via S3 mechanism, evaluate once (S4), cache compiled functions keyed by
   content hash/mtime; invalidate on file change or `SIGHUP`.
3. Port `compute/reports.js` + `compute/views.js` value logic; data comes from `data`/SQL rather
   than an in-process snapshot. `compute/format.js` stays as JS helpers (mirrored by the Rust filters).
4. CPU-bound runs on the guest's single JS thread → the plan's `compute-1..N` copies + job
   fan-out provide parallelism; set per-copy memory/time limits.

## Phase 5 — `data` (views, fingerprints, cache)

> **Status (2026-09-26): fingerprints + incremental refresh + KV report cache done; views are in-memory, not SQL.**
> The guest fingerprints every table (`count:max(updated)`), re-reads only changed tables and
> rebuilds only affected materialised views; report results are cached in the KV store under a
> nonce+version key; `/reports/status` exposes `lastRefresh` and cache hit/miss counters
> ([[guest-fingerprint-refresh]], [[guest-report-result-cache]], task `tb-0020`). The plan's
> stronger option — materialising the derived views as **SQLite tables** — is **not** done: the
> guest builds them in JS and caches in memory, which is adequate at the seeded volumes but is the
> remaining cost item.

1. Materialize derived views as SQLite tables (new migrations) rebuilt incrementally:
   fingerprint `{count, newest updated}` per table → `viewsAffectedBy(tables)` → rebuild only
   affected views → record `build` version.
2. Routes: snapshot metadata, parameterized query, `invalidate(tables)` (called on management
   writes), status (mirrors `reports.status()` for the green indicator).
3. Replace `MAX_CACHED_REPORTS` in-process map with a KV/DB cache with TTL; keep ETag inputs
   (`version` + filters).
4. Keep the inherited arithmetic quirks from [[reports-and-ledgers]] and re-assert them
   (profit = margin; ledger credit/debit no return case; `ledger_journal.stock = 0`; Area Ledger
   filters the source payments).

## Phase 6 — `jobs` + `worker` (durable queue + HTTP fan-out)

> **Status (2026-09-26): queue + opt-in fan-out done.** The durable queue (migration, atomic
> claims, leases, retries, idempotent `job_artifact`, `/jobs` API, tests) is implemented
> ([[jobs-in-process-durable-queue]], `runtime-js/tools/jobs-check.mjs` — idempotency proven by a
> real re-dispatch, plus a worker fan-out path). Steps run **in-process by default** and can be
> dispatched to `POST /worker/{pool}/step` over `http.request` (`?fanout=1&concurrency=N`) so they
> spread across the component's runtime threads — a single component, not separate `worker`
> components. A **background poller** runs on the host's minute `Job`, which calls the app's
> reconcile route directly because the `ahscripts/jobs` file-discovery is broken
> ([[trailbase-runtime-js-scheduler-not-running-jobs]]).

1. Migrations: `job`, `job_step`, `job_artifact`; `job_step` has `idempotency_key UNIQUE`,
   `state`, `attempt`, `lease_until`, `deadline`, `result_ref`.
2. API: `POST /jobs` (submit spec `{name, input, shards?, maxParallel}`), `GET /jobs/{id}`,
   `POST /jobs/{id}/cancel`, `GET /jobs/{id}/result`. Steps carry `idempotency_key` and `deadline`.
3. Dispatcher: split into steps, dispatch each via `fetch` to `POST /worker/{pool}/step` with a
   bounded in-flight window (`maxParallel`); record results; merge (reducer) into the job result.
4. Robustness: lease claim via `Transaction`/`UPDATE … RETURNING` (S7); on `JobHandler.minutely`
   reconcile, expired leases are re-dispatched (**at-least-once** ⇒ every step must be idempotent);
   bounded retries with backoff; terminal `failed`/`cancelled`; GC of finished jobs.
5. `worker`: load `app/jobs/<name>.js` at runtime (S4), execute one step, return result; safe to
   re-run. First consumers: snapshot/view rebuild, report pre-render, v1 import, future invoice
   batch operations.

## Phase 7 — parity validation

> **Status (2026-09-26): smoke + differential done.** The guest smoke
> (`runtime-js/tools/guest-smoke.mjs`) runs the same seed as the Node smoke and passes **61/61**
> checks with the pinned totals; the differential harness (`runtime-js/tools/guest-parity.mjs`)
> matches the Node app on **14/14** report/ledger pages. ETag 304, the page-data payload shape and
> the anonymous redirect are asserted. Not yet asserted: anonymous **403** on record APIs, unknown
> page **404**, and job idempotency/lease recovery (jobs not built).

1. Adapt `frontend-ssr/scripts/smoke.js` to drive the guest app over HTTP on `:4000` with a real
   login against a throw-away depot; keep the **same 55 assertions and pinned totals**.
2. Add differential checks vs the Node app on the same seed (route-by-route HTML/JSON compare
   where stable; always compare report row sets + totals).
3. Assert the invariants: anonymous `403` on record APIs; unknown page `404`; ETag `304`;
   SP payload shape; job idempotency (double-dispatch a step ⇒ one effect); lease expiry recovery.

## Phase 8 — deployment, rollout, rollback

- **Deploy**: copy `app/` + `*.wasm` into the depot; start with `trail run`. Keep `traildepot/data`
  and `wasm/` runtime/ignored. Add a `RUN.BAT` equivalent (offline, no network install except the
  one-time `trail` binary).
- **Dev loop**: `--dev` + watcher → rebuild component(s) → `SIGHUP`; document that **route changes
  need a full restart**.
- **Rollout**: run guests alongside the Node app on different ports; cut over only when Phase 7
  passes and the cutover decision ([[pos-0028-decide-cutover-plan]]) says so. Node app stays as the
  reference/rollback until then.
- **Rollback**: revert to `frontend-ssr` Node process; no production data changes are introduced by
  this work.

## Risks / failure modes

| Risk | Impact | Mitigation |
|---|---|---|
| Runtime `eval` unsupported (S4) | Core goal (no-rebuild business JS) fails | Gate in Phase 0; fallback re-decides D2 before any build-out |
| No usable filesystem preopen (S3) | `app/` unreadable | Fallback: sync `app/` into DB/KV (still no component rebuild) |
| Guest serializes requests; single-threaded JS | "Multithreading" gives no speedup | N worker/compute component copies; keep heavy aggregation in SQL on TrailBase's pool |
| At-least-once jobs cause double effects | Wrong numbers/money | Mandatory idempotency keys + idempotent steps; test double-dispatch |
| ~8 MB JS engine × many components/copies | Memory/startup cost | `--aot`; cap copy count; share work well |
| Business JS has raw DB/fs/fetch in scope | A bad/malicious page can read/exfiltrate | `app/` is trusted, reviewed code; expose a narrow `ctx` API and avoid raw host fns in business JS |
| Route table fixed at startup | New route needs restart | All authorable features go through generic routes; no per-page routes |
| Two runtimes' arithmetic drift | Wrong reports | Differential smoke vs Node + pinned totals |
| Auth/CSRF/session change | Lockout or CSRF gaps | Spike S2 first; explicit login/logout/CSRF tests |
| Conflicts with accepted vault decisions | Contradictory docs | Supersede/annotate [[trailbase-declarative-page-host]], [[trailbase-incremental-report-refresh]], [[offline-local-deployment]] in the vault when implementing |

## Open questions

1. **D2 fallback**: if S4 shows no runtime `eval`, do we (a) accept a build step for business JS,
   (b) fall back to declarative SQL + manifests, or (c) run a generic StarlingMonkey `wasmtime`
   sidecar just for JS compute? (Recommend (b) unless (c) is acceptable operationally.)
2. **D4 fallback**: if S3 shows no useful preopen, DB/KV-synced `app/` (Q5 option C) confirmed?
3. **`data` state**: SQLite-materialized view tables (recommended above) vs recompute-per-request
   with SQL + TTL cache — confirm before Phase 5.
4. **Worker copy count** and per-copy resource limits — confirm the default (`CPUs − 1`) and whether
   TrailBase exposes per-component memory/CPU limits.

## Implementation checklist (ordered)

- [x] P0-S1 baseline guest loads and serves
- [x] P0-S2 cookie auth → `req.user()`; CSRF behavior
- [x] P0-S3 filesystem preopen scope (reads `app/`)
- [x] P0-S4 runtime `eval` works in a `jco` component (**blocking gate for D2**) — PASS
- [x] P0-S5 concurrent vs serialized requests for one component — PASS (parallel with `--runtime-threads`)
- [x] P0-S6 outbound `fetch` to self — PASS
- [x] P0-S7 `Transaction`/`UPDATE … RETURNING` claim + error strings — PASS (use `err.payload`)
- [x] P0-S8 component size/startup, AOT on/off — measured; **do not use `--aot`**
- [x] Record S1–S8 results in `vault/issues/` or `vault/notes/` (evidence, not assertion)
**Phase 0 outcome (2026-09-26):** all eight spikes pass on `trail v0.33.22`; D2 and D4 are
confirmed, no fallback needed. Evidence and measured numbers in the vault:
`notes/trailbase-guest-wasm-spike-results.md`, decision
`decisions/trailbase-guest-wasm-runtime-defaults.md`, issues
`issues/trailbase-guest-{cpu-js-limits,aot-startup-cost,error-string-opaque,request-headers-bytes}.md`
and task `tasks/tb-0016-guest-wasm-phase0-spikes.md`. Phase 1 may proceed.

- [ ] P1 `guests/` TS+Vite+jco toolchain; `render/` Rust crate; build/dev/deploy scripts
      (runtime-js host adopted, builds + serves; build/dev/deploy scripts still to formalize)
- [x] P2 `render` parity harness vs `minijinja-js` (all templates + 10 filters)
      (34/34 templates byte-identical, 9/10 filters; `frontend-ssr/scripts/render-parity.mjs`)
- [ ] P3 `app-host` routes, auth gate, page registry, static/plugins, forms
      (routes/auth/pages/static/plugins served; management **writes**/forms still to do)
- [x] P4 `compute` runtime-JS loader + cache; port `compute/` values; N copies
      (shared compute runs in QuickJS; 14/14 report parity; lazy view closure)
- [ ] P5 `data` materialized views + fingerprint refresh + KV cache + status
      (fingerprint refresh + KV report cache + status done; **materialised SQL views** not done)
- [x] P6 `jobs` + `worker` migrations, API, dispatcher, lease/reconcile, idempotency tests
      (queue + leases + idempotency + API + tests + opt-in self-directed fan-out; single component)
- [ ] P7 smoke parity 55/55 + invariant tests + differential vs Node
      (guest smoke **61/61** and differential **14/14** done; 403/404/job invariants pending)
- [ ] P8 deploy/`RUN.BAT`, rollout alongside Node, rollback documented
- [ ] Update vault: new `systems/` note for the guest platform, `decisions/` for D1–D6, `issues/` for
      every S-spike limitation, and annotate superseded decisions; run `links.mjs`/`check.mjs`/`stats.mjs`
