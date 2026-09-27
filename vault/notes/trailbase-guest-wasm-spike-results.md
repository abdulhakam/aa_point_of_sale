---
title: TrailBase guest-WASM Phase 0 spike results
type: note
status: active
created: 2026-09-26
tags: [trailbase, wasm, guests, spike, evidence, phase-0]
related_to: ["[[trailbase]]", "[[runtime-js-guest-platform]]", "[[trailbase-migration]]", "[[trailbase-guest-wasm-runtime-defaults]]"]
---

# TrailBase guest-WASM Phase 0 spike results

Measured results for the capability spikes S1–S8 of the wasm app-platform plan
(`.kilo/plans/1790438607199-trailbase-wasm-app-platform.md`, Phase 0). Every row below was
run over HTTP against a throw-away depot; the numbers are observed output, not inference.

## Provenance / how to reproduce

- Spike guest source: `guests/src/index.ts` (TS + Vite + `jco componentize`).
- Toolchain: `trail v0.33.22-0-g3dfb2f70`, Node `v24.16.0`, `trailbase-wasm@0.6.0`,
  `@bytecodealliance/jco^1.35.0`, Rust `1.95.0`.
- Build: `guests/` → `npm run build:wasm` (vite bundle → `jco componentize`); deploy by copying
  `dist/component.wasm` to `guests/spikes/depot/wasm/spike_component.wasm`.
- Run: from `guests/spikes/`,
  `trail --depot=depot run --address=127.0.0.1:4001 --runtime-threads=4 --runtime-root-fs=app`.
- Sandbox app dir (the `--runtime-root-fs` root): `guests/spikes/app/`
  (`config.json`, `compute/hello.js`, `pages/demo/meta.json`).
- Component under test: `sha256 276D1E1C041AFC27140FBD6CABA1987CD2FEB97F2FC04C0DF40B92F38FE689CA`
  (non-AOT, 16,272,911 bytes).
- Admin: `admin@localhost` / `administrator-0ne` (form login sets cookies).

A second, board-invisible agent session was mid-way through the same Phase 0 when this work
started; per the user's direction this session took over, stopped its server, and rebuilt
deterministically from the source that session had written. The source's S3 probe set and
`/spike/read` route are that session's; the S4b, S5 (`busy`/`now`) and S7b (`err`) routes were
added here.

## Results

| ID | Question | Verdict | Observed |
|---|---|---|---|
| S1 | Guest loads and serves? | **PASS** | `GET /spike/health` → `ok` `[200]`; TrailBase auto-loads `depot/wasm/*.wasm` |
| S2 | Cookie auth → `req.user()`; CSRF? | **PASS (with caveat)** | Form login sets `auth_token` + `refresh_token` cookies; `req.user()` = `{id,email,csrf}`; CSRF token is **not** enforced (see below) |
| S3 | What can `readFileSync` read? | **PASS** | Sandbox root = `--runtime-root-fs`; `app/` files readable; `../` escapes rejected |
| S4 | Runtime `eval`/`new Function`? | **PASS** | `new Function`=5, `eval`=42, factory=70 |
| S4b | Load business JS from file and eval it? | **PASS** | read `/compute/hello.js` (41 B), eval, `greet()` → `"hi"` |
| S5 | Concurrent or serialized requests? | **PASS** | Two 3.0 s CPU requests finish in **3.5 s**, not 6.0 s; async sleeps overlap |
| S6 | Guest `fetch()` to self? | **PASS** | `http://127.0.0.1:4001/spike/health` → `200` `"ok"`; relative scheme+authority also works |
| S7 | `Transaction` + `UPDATE…RETURNING` claim | **PASS (caveat)** | Atomic claim works (`claim1` wins, `claim2` empty); error strings are opaque — use `err.payload` |
| S8 | Size / startup, AOT vs not | **measured** | non-AOT 16.27 MB / 39.7 s cold / 0.61 s warm; AOT 30.71 MB / 89.9 s cold / 2.08 s warm |

### S1 — baseline

```text
GET /spike/health -> ok [200]
startup log: Created dedicated WASM runtime with 4 threads
             Compiling: "depot\wasm\spike_component.wasm" ...
             Loaded component ... in: 39.7437407s
             Loaded component ... in: 610.055ms   (second, warm load in the same process)
             Listening on http://127.0.0.1:4001
```

The component is loaded twice per start (cold compile, then a warm reload).

### S2 — auth and CSRF

```text
POST /api/auth/v1/login  (application/x-www-form-urlencoded, email_or_username + password)
  -> 200, Set-Cookie: refresh_token=…; HttpOnly; SameSite=Strict; Max-Age=2592000
          Set-Cookie: auth_token=…;    HttpOnly; SameSite=Strict; Max-Age=3600
GET /spike/user (cookie auth_token) -> {"user":{"id":"…","email":"admin@localhost","csrf":"…"},"cookie":true}
GET /spike/user (Authorization: Bearer …) -> same user object
```

- The JSON `POST /api/auth/v1/login` (with `email`) returns tokens in the body and sets **no**
  cookies; the browser flow is the **form-encoded** POST with `email_or_username`/`password`,
  which sets the cookies.
- `req.user()` is `{id, email, csrf}` and populates from **either** the `auth_token` cookie or a
  `Authorization: Bearer` header.
- **CSRF is not enforced**: record-API mutations via cookie succeed with no `X-CSRF-Token`, and
  with an `Origin: http://evil.example` header, with or without the csrf header. The protection is
  the `SameSite=Strict` cookie attribute, not a token check. `req.user().csrf` still exists for a
  client that wants to send it.

### S3 — filesystem sandbox

```json
{
  "/config.json":        {"ok":true,"size":50,"preview":"{ \"appName\": \"AA Point of Sale\", \"probe\": true }"},
  "/pages/demo/meta.json":{"ok":true,"size":21,"preview":"{ \"title\": \"Demo\" }"},
  "/compute/hello.js":   {"ok":true,"size":41,"preview":"export function greet(){ return \"hi\"; }"},
  "/config.textproto":   {"ok":false,"error":"Error: no-entry"},
  "/package.json":       {"ok":false,"error":"Error: no-entry"},
  "/../config.textproto":{"ok":false,"error":"Error: not-permitted"},
  "/pages/../config.json":{"ok":false,"error":"Error: not-permitted"}
}
```

The sandbox root is exactly the `--runtime-root-fs` path. With `--runtime-root-fs=app`, the
`app/` directory is readable as `/`, files outside it are `no-entry`, and `..` traversal is
`not-permitted`. This is what makes D4 (an authorable `app/` read at runtime) work, and it means
the app directory must be the configured root.

### S4 / S4b — runtime JS evaluation

```json
GET /spike/eval      -> {"newFunction":5,"eval":42,"factory":70}
GET /spike/eval-file -> {"path":"/compute/hello.js","sourceBytes":41,"evaluated":"hi"}
```

`new Function`, indirect `eval`, and a file→`new Function`→execute round trip all work in a
`jco` component. **D2's no-rebuild business-JS mechanism is confirmed; the plan's D2-B fallback
is not needed.**

### S5 — concurrency

```text
single  /spike/busy?n=3000000 -> 3004 ms
two concurrent (same)         -> 3521 ms wall  (both returned; serialized would be ~6000 ms)
two concurrent /spike/sleep?ms=1500 -> 1792 ms wall
two concurrent /spike/cpu (clock busy-wait) -> both hit the ~20 s timeout, HTTP 500
```

With `--runtime-threads=4`, requests to a **single** component run in parallel; CPU-bound work
does parallelize without N component copies. Two qualifications, both recorded as issues:

- Throughput per request is very low — `n=3,000,000` simple integer iterations ≈ 3 s, i.e.
  ~1·10⁶ iterations/s. Long CPU-bound handlers are expensive.
- A `while (Date.now() - start < ms) {}` busy-wait **never terminates within one guest turn** —
  the guest clock does not advance while the JS thread is blocked — so it trips the runtime's
  ~20 s call timeout and returns `500 component responded unexpectedly`.
  ([[trailbase-guest-cpu-js-limits]])

### S6 — outbound fetch to self

```json
GET /spike/fetch -> {"url":"http://127.0.0.1:4001/spike/health","status":200,"body":"ok"}
```

A guest can call back into TrailBase over loopback, including deriving the URL from the request's
own scheme+authority. HTTP job fan-out to worker components is feasible (D5).

### S7 — transactions, atomic claim, error shape

```json
POST /spike/tx -> {"globalQuery":"function","setup":"ok",
                   "claim1":{"rows":[[1,"leased",1790445150301]]},
                   "claim2":{"rows":[]},
                   "dupInsertError":"Error: [object Object] (see error.payload)"}
GET /spike/err -> {"s":"Error: [object Object] (see error.payload)",
                   "name":"Error","message":"[object Object] (see error.payload)",
                   "payload":"{\"tag\":\"other\",\"val\":\"Rusqlite: UNIQUE constraint failed: _spike_err.id\"}",
                   "keys":["payload"]}
```

`UPDATE … RETURNING` inside a `Transaction` gives a correct atomic claim (the second claim of an
already-leased row returns no rows). But a raised SQLite error is only readable through
`err.payload` (`{tag, val}`); `String(err)` is `"Error: [object Object] (see error.payload)"`.
Job code must branch on `err.payload.tag`/`val`, never on the string.
([[trailbase-guest-error-string-opaque]])

Also verified: global `query` is a function, `query`/`execute` work, and the `kv` store
round-trips (`set`/`get`/`exists`/`delete`).

### S8 — size and startup

| Build | Size | Cold load | Warm load (same process) |
|---|---|---|---|
| non-AOT | 16,272,911 B (15.5 MiB) | 39.7 s | 0.61 s |
| `--aot` | 30,707,669 B (29.3 MiB) | 89.9 s | 2.08 s |

AOT roughly doubles size and is **2.3× slower to cold-load** on this runtime; no persistent
compiled-artifact cache was observed (a changed component recompiles on every start). Default to
non-AOT. ([[trailbase-guest-aot-startup-cost]])

## Extra findings (not asked for, worth keeping)

- `req.headers()` values are returned as **byte arrays**, not strings: a `content-type` header
  rendered as `{"0":97,"1":112,…}`. Header matching/comparison must decode bytes.
  ([[trailbase-guest-request-headers-bytes]]) — source: `/spike/echo`.
- A guest call that overruns the runtime deadline returns HTTP **500** with body
  `component responded unexpectedly` and logs `WARN trailbase_wasm_runtime_axum Error calling WASM`
  component '…': <route>`.
- Static routes are fixed at startup, as the plan assumed: the guest's route table is declared in
  `defineConfig` and a new route is only visible after a server restart (rebuilding the `.wasm`
  while a route set is unchanged reloads fine on the next start).

## Gate verdicts

| Gate | Outcome |
|---|---|
| D2 (runtime-evaluated business JS) | **Confirmed** — S4/S4b pass; no build step needed for business JS |
| D4 (`app/` on the filesystem) | **Confirmed** — S3 passes with `--runtime-root-fs=<app dir>`; D4-B (DB/KV sync) not needed |
| Parallelism model | Single component already parallel with `--runtime-threads`; N copies remain useful only for isolation and to cap the per-call deadline |
| Jobs durability | `UPDATE … RETURNING` claim is viable; error handling must use `err.payload` |

D3 (Rust `minijinja` guest) and D5/D6 are not settled by Phase 0 and remain to be built.

## Related

- [[trailbase-guest-wasm-runtime-defaults]] — the concrete defaults this settled.
- [[trailbase]] — the depot, schema and record APIs under test.
- [[trailbase-migration]] — the workstream this platform supersedes parts of.
