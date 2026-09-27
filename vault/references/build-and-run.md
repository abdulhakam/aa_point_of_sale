---
title: Build and run
type: reference
status: active
system: both
created: 2026-09-26
tags: [pos, build, run, windows, bat, scripts]
related_to: ["[[environment]]", "[[backend]]"]
---

# Build and run

Every system in the workspace, how it is started, and what it needs first. All four run on
Windows; the `.BAT` files are the supported entry points.

## Start order

```text
1. backend\DEV.BAT                (development)   PocketBase :8090  +  Next.js dev :3000
   — or —
1. backend\RUN NEXTJS.BAT         (production)    PocketBase :8090  +  Next.js start :3000
   — or —
1. backend\RUN SERVE.BAT          (static)        PocketBase :8090  +  http-server :3000

2. trailbase\RUN.BAT                              TrailBase :4000
3. guest frontend                                 TrailBase :4003   (needs 2 to be up)
   trail --depot=<depot> run --address=127.0.0.1:4003 --runtime-root-fs=runtime-js/site
```

Steps 1 and 2/3 are independent stacks — you can run the legacy pair, the new pair, or both at
once. Ports do not collide. Port table: [[environment]]. The guest frontend has no separate
process: the TrailBase server serves it ([[runtime-js-guest-platform]]).

## Legacy pair (production)

### `backend\DEV.BAT` — development

```bat
start "" .\pocketbase.exe serve --dev
timeout /t 1 >nul
cd ../frontend
start "" npm run dev
timeout /t 3 >nul
```

Starts PocketBase in dev mode, then Next.js dev mode. The `start` calls are non-blocking, so
two windows appear. The `timeout` lines are the only synchronisation — PocketBase's admin UI is
at `http://127.0.0.1:8090/_/`. Notes: the trailing `start "" http://127.0.0.1:3000` line is
commented out (`@REM`), so the browser is not opened automatically.

### `backend\RUN NEXTJS.BAT` — production-style

Same shape, but `pocketbase.exe serve` (no `--dev`) and `npm run start` (the Next.js production
server, which requires a prior `npm run build`). Opens `http://127.0.0.1:3000` after a 3-second
wait.

### `backend\RUN SERVE.BAT` — static serve

`npm run serve` → `http-server ./out/ -p 3000`, i.e. serving a **static export** rather than
the Next.js server. This needs `out/` to exist; `next.config.js` does not set
`output: 'export'`, so check that a static export is actually what you want before using it.

### Frontend build commands

| Command | Purpose |
|---|---|
| `npm run dev` | dev server |
| `npm run build` | production build |
| `npm run lint` | ESLint |
| `npm run build:standalone` | `next build` then three `robocopy` calls into `../standalone` — the deployable bundle |
| `npm run storybook` | component workshop on `:6006` |

## New pair (experimental)

### `trailbase\RUN.BAT`

```bat
if not defined DEPOT set "DEPOT=traildepot"
if not defined ADDRESS set "ADDRESS=127.0.0.1:4000"
set "ADMIN_USER=admin@localhost"
set "ADMIN_PASSWORD=administrator-0ne"
```

What it does:

1. **First run only** (when `%DEPOT%\data` does not exist): calls
   `trail user change-password %ADMIN_USER% %ADMIN_PASSWORD%`. That command initialises the
   depot from `config.textproto` + `migrations/`, creates the admin user **and** sets the fixed
   password — all before a server starts, so nothing races initialisation. If it fails it
   prints a warning with the manual command instead of dying.
2. Starts the server with `start "" trail "--depot=%DEPOT%" run --address=%ADDRESS%`.
3. Polls `netstat -a -n -p tcp | findstr %ADDRESS% | findstr LISTENING` up to 30 times
   (~30 s), then opens `http://%ADDRESS%/_/admin/`. If nothing is listening it prints a
   warning telling you to check the TrailBase console — rather than opening a tab that cannot
   be reached.

Environment overrides, each quoted so no trailing space is kept:

```bat
set "DEPOT=C:\some\depot" && RUN.BAT
set "ADDRESS=127.0.0.1:4001" && RUN.BAT
```

⚠️ **Delete `traildepot\data\` before a re-scaffold** if you previously ran an older version of
this scaffold. Refinery silently *skips* a migration whose checksum changed, so a stale depot
keeps the old schema. See [[trailbase-stale-depot-skips-migration]].

First-run credentials: `admin@localhost` / `administrator-0ne`. Change them before real use:

```sh
trail --depot=./traildepot user change-password admin@localhost <pw>
trail --depot=./traildepot user change-email   admin@localhost <email>
```

Other useful CLI commands:

| Command | Purpose |
|---|---|
| `trail --depot=./traildepot run` | plain start (no credential bootstrap, no bind override) |
| `trail --depot=./traildepot schema items` | export a record API's JSON schema |
| `trail --depot=./traildepot schema invoices` | `invoices.type` is `{"type":["null","integer"]}` |
| `trail --depot=./traildepot user change-password …` | set a password without running the server |

Installing the binary, once: `iwr https://trailbase.io/install.ps1 | iex` (Windows) or
`curl -sSL https://trailbase.io/install.sh | bash` (Unix).

The Node `frontend-ssr` process that used to sit here was removed on 2026-09-27
([[guest-ui-is-a-direct-shift-of-legacy]]); its `RUN.BAT`, `.env` and `npm run smoke` no longer
exist. The new frontend is the guest-WASM platform below.

## Guest-WASM platform (the new frontend, experimental)

There is no script yet; the loop is build → deploy → run → verify
([[runtime-js-guest-platform]]).

```powershell
# 1. build the Rust host (Rust + wasm32-wasip2 target + QuickJS via rquickjs + minijinja)
cd runtime-js
cargo build --target wasm32-wasip2 --release        # -> target/wasm32-wasip2/release/trail_runtime_js.wasm

# 2. start a scratch depot against the site directory (the guest is served by TrailBase itself)
#    copy the built wasm into <depot>/wasm/ first; a fresh depot also needs the base migration
trail --depot=<depot> run --address=127.0.0.1:4003 --runtime-root-fs=runtime-js/site
```

- `--runtime-root-fs=runtime-js/site` is **load-bearing**: it is the WASI sandbox root, so the
  `app/` directory must live under it (S3, [[trailbase-guest-wasm-runtime-defaults]]).
- Do **not** pass `--aot`: it doubles the size and is 2.3× slower to cold-load
  ([[trailbase-guest-aot-startup-cost]]).
- The Phase-0 spike guest is separate: `cd guests; npm install; npm run build:wasm`, then start
  `guests/spikes/depot` with `--runtime-root-fs=guests/spikes/app` (port `4001`).
- Ports, depot paths and the harness list are in [[environment]].

### Verify

All harnesses live in `runtime-js/tools/`. The Node-comparative ones (`guest-parity.mjs`,
`perf-compare.mjs`) were deleted with `frontend-ssr`; the parity results they produced are
recorded in [[guest-app-host-port]].

| Command | Checks |
|---|---|
| `node runtime-js/tools/guest-smoke.mjs` | boots its own depot, seeds the smoke dataset and runs **71/71** checks |
| `node runtime-js/tools/jobs-check.mjs` | durable queue, idempotency, worker fan-out, poller (`POLLER_TEST=1`) |
| `node runtime-js/tools/management-check.mjs` | management create/update/delete |
| `node runtime-js/tools/invoice-check.mjs` | context + ETag, idempotent create/lines, lease, complete |
| `node runtime-js/tools/view-equivalence.mjs` | ported report SQL vs `compute/views.js` |

## Prerequisites

| System | Needs |
|---|---|
| `backend` | Windows; `pocketbase.exe` is bundled (0.22.55, 44 MB, committed) |
| `frontend` | Node.js (Next 14 / React 18); `npm install` in `frontend/` |
| `trailbase` | the `trail` binary on `PATH` (`iwr https://trailbase.io/install.ps1 \| iex`) |
| `runtime-js` (guest) | Rust with the `wasm32-wasip2` target; `cargo build --target wasm32-wasip2 --release` in `runtime-js/`; Node for the tools |

## Data directories (do not commit)

| Path | Status |
|---|---|
| `backend/pb_data/` | git-ignored — the dev/admin data directory |
| `backend/pb_data_bench/` | git-ignored — benchmark data |
| `backend/p_data/` | ⚠️ **committed** (`data.db`, `data.db-shm`, `data.db-wal`, `logs.db`, `types.d.ts`) — see [[pocketbase-data-dirs-in-git]] |
| `trailbase/traildepot/data`, `backups`, `uploads`, `secrets`, `wasm` | git-ignored by `trailbase/.gitignore` |
| `runtime-js/target/`, `runtime-js/.tbdemo-guest/` | build output and the smoke test's throw-away depot; git-ignored |
| `frontend/.env.local`, `.next/`, `out/` | git-ignored by the root `.gitignore` |

## Credentials

The logins each system needs are in the `credentials/` collection:

| System | Environment | Document |
|---|---|---|
| PocketBase (`backend/`) | production | `credentials/production-pocketbase.md` |
| Next.js (`frontend/`) | production | `credentials/production-nextjs.md` |
| TrailBase (`trailbase/`) | experimental | [[experimental-trailbase]] |
| Guest frontend (`runtime-js/`) | experimental | — (no separate secret; uses TrailBase auth) |

They are plaintext and tracked; see `credentials/README.md` for the warning.

## Related

- [[environment]] — ports, env vars and credentials in one table.
- [[trailbase]] — what the server actually exposes once it is up.
- [[backend]] / [[frontend]] — the legacy scripts in context.
- [[runtime-js-guest-platform]] — the new frontend being started.
