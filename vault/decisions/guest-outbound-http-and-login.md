---
title: The guest has an outbound HTTP bridge; the app's own /login sets the cookies
type: decision
status: accepted
decided_on: 2026-09-26
created: 2026-09-26
tags: [trailbase, wasm, rquickjs, auth, http, login, phase-3]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[guest-app-host-port]]", "[[runtime-js-single-host]]", "[[trailbase-guest-wasm-runtime-defaults]]"]
---

# The guest has an outbound HTTP bridge; the app's own /login sets the cookies

## Context

The guest app-host had no outbound HTTP: the runtime-JS host's `fetch` was a stub returning 501,
so `/login` POST simply redirected to TrailBase's auth UI. That is functional but not parity — the
Node app has its own login page that posts credentials and returns a session. The SDK's `auth`
module has no `login` (only `require_admin`), and its `fetch` returns **only the response body**
(status/headers are dropped), so it cannot relay `Set-Cookie` directly.

## Decision

1. **Add an outbound bridge.** `trailbase/tb-ah-run-js/src/api/fetch.rs` exposes `http.postJson(url, body)`
   built on `trailbase_wasm::fetch::fetch`, and `trailbase-wasm`'s `wstd` is added as a dependency
   **pinned to the exact version the SDK uses (`=0.5.6`)** so the component has one `wstd`.
   `String` is turned into a body with `wstd::http::body::IntoBody`.
2. **The dispatcher owns `/login`.** POST exchanges the form fields for tokens via TrailBase's
   JSON login (`POST /api/auth/v1/login {"email","password"}`) against its own origin, then
   answers `303` with `Set-Cookie: auth_token=…` and `refresh_token=…` (HttpOnly, SameSite=Strict),
   redirecting to `next`. A bad password renders the login page with an error at **401**.
3. **Response shapes grew to support that.** The host's `{ html }` shape now honours `status`, and
   `headers` values may be a **list**, so multiple `Set-Cookie` headers survive
   (`apply_extra_headers` appends).

## Consequences

**Accepted**

- Full login parity: `POST /login` with a wrong password → `401`; with the right one → `303` +
  `auth_token`/`refresh_token` cookies; the dashboard then renders. The guest smoke asserts all
  three, and replaced its TrailBase-API login with the app's own form.
- The guest can now reach the network at all, which is what a `worker` fan-out needs.

**Given up / to watch**

- `http.postJson` is **body-only** — enough for login, where the tokens are in the body. A second
  bridge, `http.request({ method, url, headers, body }) -> { status, headers, body }`, gives the
  guest a response-with-headers client; it is what the worker fan-out uses
  ([[jobs-in-process-durable-queue]]).
- Adding `wstd` is a direct dependency; it must stay pinned to the SDK's version or the component
  will carry two copies of the WASI HTTP bindings.
- The login proxy assumes TrailBase's JSON login remains available at `/api/auth/v1/login`.

## Evidence

- `trailbase/tb-ah-run-js/src/api/fetch.rs` — `http.postJson`; `trailbase/tb-ah-run-js/Cargo.toml` — pinned `wstd`.
- `trailbase/tb-ah-run-js/src/lib.rs` — `{html}` honours `status`; `headers` may be a list.
- `trailbase/runtime/ahscripts/routes/_app/route.ts` — the `/login` POST.
- Verified by hand (401 + error page; 303 + both cookies; dashboard 200) and by the guest smoke:
  **71/71 checks pass** (69/69 when this was written; the suite has since grown).

## Related

- [[guest-app-host-port]] — the app host this belongs to.
- [[runtime-js-single-host]] — why there is one component (and where a worker would extend it).
