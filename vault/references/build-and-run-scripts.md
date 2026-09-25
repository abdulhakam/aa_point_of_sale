---
type: Reference
status: Active
created: 2026-09-19
updated: 2026-09-25
belongs_to:
  - "[[AA Point of Sale]]"
related_to:
  - "[[Desktop & Deployment]]"
tags:
  - scripts
  - setup
  - operations
---

# Build & Run Scripts

All entry points are Windows batch files. Read this before running or changing them.

## Root scripts

| Script | What it does |
|---|---|
| `FIRST_RUN.BAT` | First-time setup: `xcopy backend\p_data → backend\pb_data` (seed DB), copy `frontend\.env.local.example` → `.env.local`, `npm install`, `npm run build`. Ends with `pause`. |
| `RUN.BAT` | Normal run: start `backend\pocketbase.exe serve`, wait ~1s, `cd frontend`, `npm run start`, wait ~3s, open `http://127.0.0.1:3000`. |
| `RUN MINI.BAT` | Minimal run: start PocketBase, then `node ./standalone/server.js` (prebuilt server), open the browser. |
| `BUILD.BAT` | `cd frontend` then `npm run build` (starts a new window). |
| `UPDATE.BAT` | `cd frontend`, `git pull origin master`, `npm run build`. |
| `PULL.BAT` | `git pull origin master`, then `pause`. |

## Backend scripts (`backend/`)

| Script | What it does |
|---|---|
| `DEV.BAT` | PocketBase `serve --dev` + `npm run dev` (hot reload for frontend work). |
| `RUN NEXTJS.BAT` | PocketBase `serve` + `npm run start`. |
| `RUN SERVE.BAT` | PocketBase `serve` + `npm run serve` (`http-server ./out/`; needs a static export). |
| `TAURI BUILD.BAT` | `cd ../frontend`, `npm run tauri build`. |
| `TAURI DEV.BAT` / `TAURI RUN.BAT` | Tauri dev/run variants. |

## TrailBase stack

Two more entry points exist for the TrailBase backend and its server-rendered frontend. They need the
`trail` binary on `PATH` and Node 20+, and are documented in [[Backend — TrailBase Server]] and
[[Frontend — TrailBase Server-Rendered App]] rather than repeated here:

| Script | What it does |
|---|---|
| `trailbase/RUN.BAT` | Start TrailBase on `http://127.0.0.1:4000` and open its admin dashboard. On a fresh depot it first creates the depot with `trail user change-password` (which applies that directory's config + migration and sets a fixed admin password), then waits for the listener before opening the dashboard. |
| `frontend-ssr/RUN.BAT` | Install dependencies and `.env` if missing, then `npm start` — the Express + MiniJinja frontend on `http://127.0.0.1:3100`. Needs TrailBase already running on IPv4 loopback. |

Do not rely on TrailBase's default bind: it is `[::1]:4000` (IPv6 only), so anything addressing
`127.0.0.1` is refused — see [[Issue — TrailBase binds IPv6 loopback by default]].

## Requirements

- Node 18+ and Git (per `README.md`).
- No other runtime: PocketBase is a single binary.

## Configuration

- `frontend/.env.local` (from `.env.local.example`):
  - `NEXT_PUBLIC_PB_URL` — PocketBase URL (default `http://127.0.0.1:8090`).
  - `NEXT_PUBLIC_NAME`, `NEXT_PUBLIC_ADDRESS`, `NEXT_PUBLIC_PHONE` — business identity shown
    on printed output.
- Default development login credentials are documented in the root `README.md`. They are
  development defaults and should be rotated for any real deployment; they are deliberately
  not reproduced here.

## Caveats

- `RUN.BAT` relies on fixed `timeout` delays rather than readiness checks; a slow machine
  may load the frontend before PocketBase is ready.
- `RUN SERVE.BAT` and Tauri depend on a static export (`out/`), but `next.config.js` has
  `output: 'export'` commented out — see [[Issue — Standalone Build Drift]].
- `UPDATE.BAT`/`PULL.BAT` assume the `origin` remote and `master` branch.

## Related

- Modes overview: [[Desktop & Deployment]].
- Why the app ships this way: [[Decision — Local Offline Desktop Deployment]].
