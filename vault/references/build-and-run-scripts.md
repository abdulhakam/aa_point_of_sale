---
type: Reference
status: Active
created: 2026-09-19
updated: 2026-09-19
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
