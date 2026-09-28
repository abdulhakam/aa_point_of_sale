---
title: Environment reference
type: reference
status: active
system: both
created: 2026-09-26
tags: [pos, environment, ports, env-vars, credentials, configuration]
related_to: ["[[build-and-run]]"]
---

# Environment reference

Ports, environment variables and credentials for all four systems, in one place.

## Ports

| Port | Bound by | Reachable at |
|---|---|---|
| `8090` | PocketBase ([[backend]]) | `http://127.0.0.1:8090` — API; admin UI at `/_/` |
| `3000` | Next.js ([[frontend]]) | `http://127.0.0.1:3000` |
| `4000` | TrailBase ([[trailbase]]) | `http://127.0.0.1:4000` — API; admin UI at `/_/admin/` |
| `4003` | guest frontend ([[runtime-js-guest-platform]]), served by TrailBase | `http://127.0.0.1:4003` |
| `6006` | Storybook (`npm run storybook` in `frontend/`) | dev-only |

⚠️ **TrailBase binds IPv4 loopback explicitly.** Its own default is `[::1]:4000` (IPv6 only),
which a client at `127.0.0.1` cannot reach. `trailbase/RUN.BAT` sets `ADDRESS=127.0.0.1:4000`
for exactly this reason. If you start the server by hand, pass `--address=127.0.0.1:4000` or
point the client at `[::1]`. See [[trailbase-ipv6-loopback-default-bind]].

## Guest-WASM platform (experimental)

The guest platform ([[runtime-js-guest-platform]]) is served **by TrailBase itself** — there is no
separate frontend process, so it uses the TrailBase port. Development and verification use extra
ports and throw-away depots:

| Port | Used for |
|---|---|
| `4000` | the real TrailBase depot ([[trailbase]]) |
| `4001` | Phase-0 spike depot (`guests/spikes/depot`, `--runtime-root-fs=guests/spikes/app`) |
| `4002` | render/spike depot during the port |
| `4003` | the app depot used by the smoke / jobs / management / invoice checks |

Key paths:

| Path | Role |
|---|---|
| `trailbase/src/host/target/wasm32-wasip2/release/trail_runtime_js.wasm` | the built host (git-ignored) |
| `trailbase/src/runtime/` | the `ahscripts/` dispatcher and `app/` (views, pages, compute, lib, SQL) the host reads — pass this as `--runtime-root-fs` |
| `guests/` | the Phase-0 spike guest (TS + Vite + `jco`); `guests/spikes/depot` is a scratch depot |
| `trailbase/src/tools/` | the verification harnesses (`guest-smoke`, `jobs-check`, `management-check`, `invoice-check`, `view-equivalence`, …) |
| `%TEMP%\kilo\aa-*-depot` | throw-away depots used by those harnesses |

`--runtime-root-fs=<dir>` is the WASI sandbox root: `app/` must live under it, and `..` escapes are
refused ([[trailbase-guest-wasm-runtime-defaults]], S3). Bind `127.0.0.1` explicitly — TrailBase
defaults to IPv6-only (see above).

## Environment variables by system

### `frontend/` — `.env.local` (git-ignored; `.env.local.example` is the template)

| Variable | Value in this repo | Effect |
|---|---|---|
| `NEXT_PUBLIC_PB_URL` | `http://127.0.0.1:8090` | base URL for `src/app/pocketbase.js` |
| `NEXT_PUBLIC_NAME` | `SAMPLE TRADERS` | business name in the header / on printouts |
| `NEXT_PUBLIC_ADDRESS` | `123 Sample Street, Sample City` | printed address |
| `NEXT_PUBLIC_PHONE` | `000-0000000` | printed phone |

All four are `NEXT_PUBLIC_*`, so they are compiled into the browser bundle — never put a secret
here.

### Guest frontend (`trailbase/src/`) — no `.env`

The guest app is served by TrailBase and reads no `.env`: its settings are the depot's
`config.textproto` (below) plus the runtime files under `trailbase/src/runtime/app/`. The former Node
`frontend-ssr` `.env` — including its inert `CACHE_TTL_SECONDS` and its `SESSION_SECRET` — was
removed with that app on 2026-09-27 ([[guest-ui-is-a-direct-shift-of-legacy]]). The guest uses
TrailBase's own auth cookies, so there is no second session secret to rotate
([[guest-outbound-http-and-login]]). The `APP_NAME` shown in its header comes from the
`config.textproto` application name.

### `trailbase/src/config.textproto` — not environment variables

TrailBase is configured by file, not by env vars. The values that behave like environment
settings:

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

Secrets (SMTP password, OAuth client secrets) belong in
`traildepot/secrets/secrets.textproto`, which is git-ignored. `config.textproto` contains none,
and there is **no `schemas:` block** — see
[[trailbase-scalar-json-schema-columns-rejected]].

### `backend/` — no env file

PocketBase reads no `.env`. `pocketbase.exe serve` uses its own flags and defaults to
`127.0.0.1:8090`. The three `.BAT` files are the only configuration.

## Credentials

| System | Credential | Where |
|---|---|---|
| TrailBase ([[trailbase]]) | `admin@localhost` / `administrator-0ne` | set by `RUN.BAT` on first run only; change with `trail … user change-password` |
| TrailBase | application users | `/api/auth/v1/register` or `trail … user`; email required, ≥ 8 characters |
| PocketBase ([[backend]]) | admin account | PocketBase's own admin UI at `http://127.0.0.1:8090/_/` |
| guest frontend sessions | TrailBase's own cookies | the guest uses `auth_token` / `refresh_token` directly; there is no separate session layer ([[guest-outbound-http-and-login]]) |

Neither `.env` file nor `config.textproto` holds a production secret in this repository. The
TrailBase admin password in `RUN.BAT` **is** a fixed development default and is documented as
such; it only applies to a freshly created depot and is never re-applied to one you have
already changed.

## Business identity mismatch

Three different business identities appear in configuration:

| Where | Value |
|---|---|
| `frontend/.env.local` | `SAMPLE TRADERS` + a Sample City address + phone |
| `frontend/.env.local.example` | `AA_W_POS` + `abc 123 xyz` + `123 abc 789` |
| guest frontend (`trailbase/src/config.textproto` application name) | `AA Point of Sale` |

Before a cutover, confirm which is correct: the legacy app prints the business name, address
and phone on invoices, while the guest app only has an application name in its header. Losing
the address/phone from the printout would be a real regression — the new side has no equivalent
variables yet, which the direct-shift work must fix ([[guest-ui-is-a-direct-shift-of-legacy]]).

## Related

- [[build-and-run]] — the scripts that consume all of this.
- [[frontend]] / [[runtime-js-guest-platform]] / [[trailbase]] / [[backend]] — per-system detail.
