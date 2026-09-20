---
type: Subsystem
status: Active
created: 2026-09-19
updated: 2026-09-19
belongs_to:
  - "[[AA Point of Sale]]"
related_to:
  - "[[Frontend — Next.js Application]]"
  - "[[Build & Run Scripts]]"
tags:
  - deployment
  - tauri
  - standalone
  - windows
  - build
---

# Desktop & Deployment

## Purpose

How the app is installed and launched for a single-machine shop: Windows batch scripts
for the normal (Node + PocketBase) flow, plus optional Tauri desktop packaging and a
prebuilt standalone server.

## Responsibilities

- Provide one-click install and run on Windows.
- Bundle the frontend as either a served Next.js app (`next start`), a static export
  served over HTTP, a Tauri desktop app, or a prebuilt standalone Node server.
- Keep PocketBase and the frontend in one repository so the app is self-contained.

## Modes

| Mode | Entry point | Frontend | Notes |
|---|---|---|---|
| Standard run | `RUN.BAT` | `next start` | PocketBase + Next.js server on :3000 |
| Minimal run | `RUN MINI.BAT` | `node ./standalone/server.js` | Uses the prebuilt `standalone/` server |
| Dev | `backend/DEV.BAT` | `next dev` | PocketBase in `--dev` mode |
| Static serve | `backend/RUN SERVE.BAT` | `http-server ./out/` | Requires a static export |
| Desktop | `backend/TAURI BUILD.BAT` | Tauri | `npm run tauri build` |
| First install | `FIRST_RUN.BAT` | install + build | Seeds `pb_data`, writes `.env.local`, `npm install`, `npm run build` |

## Key files

- Root: `FIRST_RUN.BAT`, `RUN.BAT`, `RUN MINI.BAT`, `BUILD.BAT`, `UPDATE.BAT`, `PULL.BAT`.
- `standalone/server.js` + `standalone/.next` + `standalone/package.json` — prebuilt
  Next.js standalone output.
- `frontend/src-tauri/tauri.conf.json` — product name `aa_pos`, identifier
  `com.abdulhakam.aapos`, `distDir: ../out`, window 800×600.
- `frontend/.env.local.example` — `NEXT_PUBLIC_PB_URL`, `NEXT_PUBLIC_NAME`,
  `NEXT_PUBLIC_ADDRESS`, `NEXT_PUBLIC_PHONE`.

## Caveats

- `next.config.js` has `output: 'export'` commented out, yet `tauri.conf.json` points
  `distDir` at `../out` and `RUN SERVE.BAT` serves `./out/` — the static-export path is
  only valid if that option is re-enabled.
- The committed `standalone/` build is **not** reproducible from the current source; see
  [[Issue — Standalone Build Drift]].
- `.env.local` is environment-specific and not committed; copy it from the example.

## Related

- Script-by-script detail: [[Build & Run Scripts]].
- Why this shape was chosen: [[Decision — Local Offline Desktop Deployment]].
- Known drift in the packaged build: [[Issue — Standalone Build Drift]] and the fix task
  [[Reconcile the standalone build with source]].
- Static-export gap tracked in [[Verify the static export path for Tauri and RUN SERVE]].
