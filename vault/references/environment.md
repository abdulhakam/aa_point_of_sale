---
title: Environment reference
type: reference
status: active
system: both
created: 2026-09-26
updated: 2026-10-03
tags: [pos, environment, ports, env-vars, credentials, configuration]
related_to: ["[[build-and-run]]", "[[cutover-is-guest-only]]", "[[route-snapshot-was-snapshotting-redirects]]"]
---

# Environment reference

Ports, environment variables and credentials for the workspace, in one place.

> **Rebuilt 2026-10-03.** This document had lost every newline in its body — the whole thing was one
> 9,160-character line, which made it unreadable and unmaintainable. It has been re-split into
> blocks, re-wrapped, and corrected against the tree. See
> [[three-reference-docs-lost-their-line-structure]].
>
> **Corrected at the same time, because the collapse hid errors:**
>
> - **Ports `3000`, `8090` and `6006` are no longer live services.** `frontend/` and `backend/` were
>   deleted from git on 2026-09-29. The compiled bundle in `legacyforparity/standalone/` is the only
>   thing that ever listened on `:3000`, and it cannot be rebuilt; PocketBase can still be started by
>   hand against `legacyforparity/backend/p_data/`. **Storybook on `:6006` is unreachable** — it
>   needs `npm run storybook` in a `frontend/` that no longer exists. See [[cutover-is-guest-only]].
> - **`:4003` is not a port anything serves on.** It is only the default `GUEST_BASE` of three
>   harnesses. The guest is a component of the single TrailBase server on `:4000`.

## Ports

| Port | Bound by | Reachable at |
|---|---|---|
| `4000` | TrailBase **and** the guest app ([[trailbase]], [[runtime-js-guest-platform]]) | `http://127.0.0.1:4000` — API, admin UI at `/_/admin/`, and the whole app. Served on **all interfaces** (`0.0.0.0:4000`) since 2026-10-02 so LAN devices can reach it — [[serve-the-app-on-all-interfaces]] |
| `4100` | a throw-away verification depot (created by hand; **not** part of the source) | used by `route-snapshot.mjs --base` when the production depot's admin password is unavailable |
| `8090` | PocketBase ([[backend]]) — ⚠️ **frozen**, startable by hand only | `http://127.0.0.1:8090` — API; admin UI at `/_/` |
| `3000` | the compiled legacy Next.js bundle ([[frontend]]) — ⚠️ **no source, cannot rebuild** | `http://127.0.0.1:3000` if `legacyforparity/standalone/server.js` is started directly |
| `4003` | ⚠️ **nothing** — a harness convention, not a server | only the default `GUEST_BASE` of `management-check.mjs`, `jobs-check.mjs` and `invoice-check.mjs` |
| `6006` | ⚠️ **unreachable** — Storybook needs `npm run storybook` in `frontend/` | dev-only, and that directory no longer exists |

⚠️ **TrailBase always needs an explicit bind address.** Its own default is `[::1]:4000` (IPv6 loopback
only), which a client at `127.0.0.1` cannot reach. `trailbase/RUN.BAT` always passes one; since
2026-10-02 the default is `ADDRESS=0.0.0.0:4000` so other devices on the LAN can use the app (it then
needs an inbound Windows firewall rule for TCP 4000 — [[serve-the-app-on-all-interfaces]]). To keep it
local, pass `ADDRESS=127.0.0.1:4000` or start it with `--address=127.0.0.1:4000`. If you start the
server by hand, pass an address or point the client at `[::1]`. See
[[trailbase-ipv6-loopback-default-bind]].

## Guest-WASM platform

The guest platform ([[runtime-js-guest-platform]]) is served **by TrailBase itself** — there is no
separate frontend process, so it uses the TrailBase port. Development and verification use extra
ports and throw-away depots:

| Port | Used for |
|---|---|
| `4000` | the real TrailBase depot ([[trailbase]]) — **the one and only server** |
| `4001` | Phase-0 spike depot — **retired**; the `guests/` tree was deleted on 2026-09-28 |
| `4002` | render/spike depot during the port |
| `4003` | **not a server** — only the default `GUEST_BASE` of `management-check.mjs`, `jobs-check.mjs` and `invoice-check.mjs`, which point at a depot you started yourself |
| `4100` | a hand-built throw-away depot, used when the production admin password is unavailable |
| `4322` | the depot `guest-smoke.mjs` boots for itself |

> **There is one server, not two.** The old docs described a "TrailBase on :4000" and a "guest
> frontend on :4003". In fact `trailbase/RUN.BAT:45` starts a single `trail run` with
> `--runtime-root-fs=%DEPOT%\runtime`, so the guest is a component of that server and the whole app
> is served from `127.0.0.1:4000` — same origin as the record APIs (`guest-smoke.mjs` says so
> outright: `FE = TB`). `:4003` and `:4322` are harness conventions only.

### Key paths

| Path | Role |
|---|---|
| `trailbase/target/wasm32-wasip2/release/tb_ah_run_js.wasm` | the built host (git-ignored). ⚠️ **Not** `tb-ah-run-js/target/` — the three `tb-ah-*` crates are one cargo workspace and share a single `target/` at `trailbase/target/` |
| `trailbase/runtime/` | the editable app: `ahscripts/` dispatcher and `app/` (views, pages, compute, lib, SQL) the host reads. **Edit here**, then re-sync |
| `trailbase/traildepot/runtime/` | **what `--runtime-root-fs` is actually given** — a generated copy of the above, produced by `clear_db.bat`. Editing `trailbase/runtime/` alone does nothing until that re-sync (the failure in [[plugin-directory-url-404]]) |
| `trailbase/.tbdemo-guest/depot` | the throw-away depot `guest-smoke.mjs` creates and deletes |
| `trailbase/traildepot/` | the **production** depot — 60,245 imported records, `main.db` ≈ 175 MB. ⚠️ **not** covered by any automated harness; see the credentials section below |
| `%TEMP%\kilo\aa-perf-depot` | the production-sized depot `view-equivalence.mjs` and `verify-legacy-views.mjs` read **read-only** via `DEPOT_DB` (both harnesses deleted 2026-10-02 with the legacy view layer, so nothing reads it that way now). ⚠️ Its `migrations/main/` holds only 3 migrations — it predates `U1790300200__create_invoice_entry_tables` and is one schema behind the source |
| `guests/` | **deleted 2026-09-28** — was the Phase-0 spike guest (TS + Vite + `jco`) and its scratch depot |
| `trailbase/tools/` | the verification harnesses (`guest-smoke`, `route-snapshot`, `jobs-check`, `management-check`, `invoice-check`, `verify-spool-reports`, `uuid`; `view-equivalence`, `extract-legacy-views` and `verify-legacy-views` were deleted 2026-10-02 with the legacy view layer) |

`--runtime-root-fs=<dir>` is the WASI sandbox root: `app/` must live under it, and `..` escapes are
refused ([[trailbase-guest-wasm-runtime-defaults]], S3). Bind `127.0.0.1` explicitly — TrailBase
defaults to IPv6-only (see above).

## Environment variables by system

### `frontend/` — `.env.local` (git-ignored; `.env.local.example` is the template)

⚠️ **Historical.** The file is gone with `frontend/`. These values are recovered from git history and
are recorded here because the guest deliberately reproduces the printout identity.

| Variable | Value in this repo | Effect |
|---|---|---|
| `NEXT_PUBLIC_PB_URL` | `http://127.0.0.1:8090` | base URL for `src/app/pocketbase.js` |
| `NEXT_PUBLIC_NAME` | `SAMPLE TRADERS` | business name in the header / on printouts |
| `NEXT_PUBLIC_ADDRESS` | `123 Sample Street, Sample City` | printed address |
| `NEXT_PUBLIC_PHONE` | `000-0000000` | printed phone |

All four are `NEXT_PUBLIC_*`, so they are compiled into the browser bundle — never put a secret here.

### Guest app (`trailbase/`) — no `.env`

The guest app is served by TrailBase and reads no `.env`: its settings are the depot's
`config.textproto` (below) plus the runtime files under `trailbase/runtime/app/`. The former Node
`frontend-ssr` `.env` — including its inert `CACHE_TTL_SECONDS` and its `SESSION_SECRET` — was
removed with that app on 2026-09-27 ([[guest-ui-is-a-direct-shift-of-legacy]]). The guest uses
TrailBase's own auth cookies, so there is no second session secret to rotate
([[guest-outbound-http-and-login]]). The `APP_NAME` shown in its header comes from the
`config.textproto` application name.

### `trailbase/config.textproto` — not environment variables

TrailBase is configured by file, not by env vars. The values that behave like environment settings:

| Setting | Value | Meaning |
|---|---|---|
| `server.application_name` | `AA Point of Sale` | shown in the admin UI / email templates |
| `server.site_url` | `http://localhost:4000` | ⚠️ **placeholder** — used to build links in emails and OAuth redirects; change before production |
| `server.enable_record_transactions` | `true` | atomic multi-record requests (invoice + its transactions) |
| `server.request_size_limit_bytes` | `5242880` | 5 MB request body cap (default is 10 MB) |
| `server.auth_ip_rate_limit` | `20` | auth POSTs per IP |
| `server.logs_retention_sec` | `604800` | 7 days |
| `auth.user_identifier` | `REQUIRE_EMAIL` | username is optional |
| `auth.password_minimal_length` | `8` | no upper/lower or digit requirement |
| `auth.enable_anonymous_signin` | `false` | |
| `auth.enable_otp_signin` | `false` | needs working SMTP anyway |
| `auth.auth_token_ttl_sec` | `3600` | 1-hour access token |
| `auth.refresh_token_ttl_sec` | `2592000` | 30-day refresh token |

Secrets (SMTP password, OAuth client secrets) belong in `traildepot/secrets/secrets.textproto`, which
is git-ignored. `config.textproto` contains none, and there is **no `schemas:` block** — see
[[trailbase-scalar-json-schema-columns-rejected]].

### `backend/` — no env file

PocketBase reads no `.env`. `pocketbase.exe serve` uses its own flags and defaults to
`127.0.0.1:8090`. The three `.BAT` files are the only configuration ⚠️ and all three are **dead**,
because each one `cd ../frontend` and runs `npm`, and `frontend/` no longer exists.

## Credentials

| System | Credential | Where |
|---|---|---|
| TrailBase ([[trailbase]]) | `admin@localhost` / `administrator-0ne` | set by `RUN.BAT` on first run **only**; change with `trail … user change-password` |
| TrailBase | application users | `/api/auth/v1/register` or `trail … user`; email required, ≥ 8 characters |
| PocketBase ([[backend]]) | admin account | PocketBase's own admin UI at `http://127.0.0.1:8090/_/` |
| guest frontend sessions | TrailBase's own cookies | the guest uses `auth_token` / `refresh_token` directly; there is no separate session layer ([[guest-outbound-http-and-login]]) |

Neither `.env` file nor `config.textproto` holds a production secret in this repository. The
TrailBase admin password in `RUN.BAT` **is** a fixed development default and is documented as such;
it only applies to a freshly created depot and is never re-applied to one you have already changed.

### ⚠️ The development depot's admin password is not the documented default

**Verified 2026-10-03.** `trailbase/traildepot/` is the **development** depot — `main.db` ≈ 175 MB,
holding an imported *copy* of the production ledger (measured: 8,930 invoices, 26,526 payments, 23,415
transactions, 943 parties). ⚠️ Older notes in this vault call it "the production depot"; they mean
*this* depot, and "production" describes the **data** in it, not that it is the production system —
the production system is [[backend]] + [[frontend]] running from `legacyforparity/`.

A login as `admin@localhost` / `administrator-0ne` returns **400**, so:

- **`route-snapshot.mjs` cannot currently be pointed at `:4000`.** Its default `--password` is that
  value. This is why the gates in [[tb-0032-manifest-first-refactor]] and
  [[tb-0030-retire-the-route-ts-dispatcher]] must run against a throw-away depot until the real
  password is supplied. See [[route-snapshot-was-snapshotting-redirects]].
- `guest-smoke.mjs` is **unaffected** — it boots its own depot on `:4322` and creates its own admin,
  so it is the one harness that always works. That is why the smoke count could be established
  without the credential.

The live password is **not** recorded here. `vault/credentials/` exists for that and is empty; the
directory is git-ignored because it holds plaintext secrets ([[cutover-is-guest-only]] notes the
consequence).

## Business identity mismatch

Three different business identities appear in configuration:

| Where | Value |
|---|---|
| `frontend/.env.local` (deleted) | `SAMPLE TRADERS` + a Sample City address + phone |
| `frontend/.env.local.example` (deleted) | `AA_W_POS` + `abc 123 xyz` + `123 abc 789` |
| guest app (`trailbase/runtime/app/config/business.json`) | `SAMPLE TRADERS` + the same Sample City address + phone |
| guest app (`trailbase/config.textproto` application name) | `AA Point of Sale` |

**Resolved 2026-09-28.** The earlier statement that "the new side has no equivalent variables yet"
was stale: `trailbase/runtime/app/config/business.json` carries the legacy values verbatim
(`SAMPLE TRADERS`, the Sample City address, the phone) and the `tb-0023` box for reproducing the
printout header is ticked. Two identities remain, both benign:

- the `config.textproto` application name is still `AA Point of Sale`, used for the header / app label
  while `business.json` carries the printout identity — worth collapsing, not a blocker;
- `frontend/.env.local.example` was the legacy *template*, and its `AA_W_POS` placeholder was never
  the running value.

⚠️ **Confirm the printout reads `business.json` and not the application name** whenever invoice
printing is changed ([[guest-ui-is-a-direct-shift-of-legacy]]).

## Related

- [[build-and-run]] — the scripts that consume all of this.
- [[frontend]] / [[runtime-js-guest-platform]] / [[trailbase]] / [[backend]] — per-system detail.
- [[cutover-is-guest-only]] — why the legacy entries above are historical rather than live.