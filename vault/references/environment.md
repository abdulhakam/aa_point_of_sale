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
| `3100` | frontend-ssr ([[frontend-ssr]]) | `http://127.0.0.1:3100` |
| `6006` | Storybook (`npm run storybook` in `frontend/`) | dev-only |

⚠️ **TrailBase binds IPv4 loopback explicitly.** Its own default is `[::1]:4000` (IPv6 only),
which a browser at `127.0.0.1` — and `frontend-ssr`, whose `TRAILBASE_URL` is
`http://127.0.0.1:4000` — cannot reach. `trailbase/RUN.BAT` sets `ADDRESS=127.0.0.1:4000` for
exactly this reason. If you start the server by hand, pass `--address=127.0.0.1:4000` or point
the client at `[::1]`. See [[trailbase-ipv6-loopback-default-bind]].

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

### `frontend-ssr/` — `.env` (git-ignored; `.env.example` is the template)

| Variable | Default | Value in this repo | Read by |
|---|---|---|---|
| `TRAILBASE_URL` | `http://127.0.0.1:4000` | `http://127.0.0.1:4000` | `src/config.js` (trailing slashes stripped) |
| `HOST` | `127.0.0.1` | `127.0.0.1` | `src/config.js` |
| `PORT` | `3100` | `3100` | `src/config.js` |
| `SESSION_SECRET` | `dev-insecure-secret-change-me` | a dev value — **rotate** | `src/config.js` → session cookie HMAC |
| `APP_NAME` | `AA Point of Sale` | `AA Point of Sale` | `src/config.js` → header title |
| `WORKER_THREADS` | `0` (CPUs − 1) | `0` | `src/config.js` → `workerCount()` |
| `REFRESH_INTERVAL_SECONDS` | `60` | unset (60) | `src/config.js` → report refresh tick |
| `CACHE_TTL_SECONDS` | `60` | `60` | ⚠️ **nothing** — see below |
| `COOKIE_SECURE` | unset | unset | session cookie `Secure` flag; set `true` behind HTTPS |

Two things to know:

- **`CACHE_TTL_SECONDS` is inert.** It is present in `.env` and `.env.example` (with the
  comment "Reference/base-table cache TTL in seconds") but `src/config.js` never reads it, and
  no other module references it. The live cache controls are
  `REFRESH_INTERVAL_SECONDS` and the in-process report cache. Either wire it up or delete it
  from both env files — a variable that looks like it does something is worse than none.
- **`SESSION_SECRET` has a real-looking value committed to `.env`.** `.env` is git-ignored
  (`frontend-ssr/.gitignore`), so it is not in the repository, but it is a fixed 64-hex-character
  string rather than an obvious placeholder, and `RUN.BAT` copies `.env.example` over `.env` on
  a fresh checkout — meaning the *example* file's `change-me-to-a-long-random-string` is what a
  new machine gets. Rotate before real use, and set `COOKIE_SECURE=true` when served over HTTPS.

### `trailbase/traildepot/config.textproto` — not environment variables

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
| frontend-ssr sessions | signed httpOnly cookie | derived from `SESSION_SECRET`; the TrailBase `auth_token` / `refresh_token` are stored inside it |

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
| `frontend-ssr/.env` and `trailbase/traildepot/config.textproto` | `AA Point of Sale` |

Before a cutover, confirm which is correct: the legacy app prints the business name, address
and phone on invoices, while the SSR app only shows `APP_NAME` in its header. Losing the
address/phone from the printout would be a real regression — the SSR app has no equivalent
variables at all.

## Related

- [[build-and-run]] — the scripts that consume all of this.
- [[frontend]] / [[frontend-ssr]] / [[trailbase]] / [[backend]] — per-system detail.
