---
type: Decision
status: Accepted
created: 2026-09-19
updated: 2026-09-19
belongs_to:
  - "[[AA Point of Sale]]"
related_to:
  - "[[Desktop & Deployment]]"
  - "[[Build & Run Scripts]]"
affects:
  - "[[AA Point of Sale]]"
tags:
  - deployment
  - offline
  - windows
---

# Decision — Local Offline Desktop Deployment

## Status

Accepted (in force; recorded retroactively on 2026-09-19).

## Context

The app is installed on shop hardware by non-developers. There is no IT staff, no cloud
budget, and connectivity is unreliable. Installation and start-up must be one click, and
data must stay on the machine.

## Decision

- Ship both halves in one repository and launch them with Windows batch files
  (`FIRST_RUN.BAT`, `RUN.BAT`, `RUN MINI.BAT`, `DEV.BAT`).
- Run PocketBase locally on `127.0.0.1:8090` and the frontend on `127.0.0.1:3000`,
  both bound to the local machine.
- Keep the data in a local SQLite file seeded from `backend/p_data` into `backend/pb_data`.
- Offer optional desktop packaging via **Tauri** and a prebuilt Next.js **standalone**
  server for machines without a build toolchain.

## Consequences

- Data is local and portable (copy the `pb_data` folder); no network dependency.
- Launch scripts are the de-facto deployment interface, so they are part of the contract
  and brittle to path/script changes.
- The `standalone/` artifact and Tauri `distDir: ../out` create a second build path that
  can drift from source — see [[Issue — Standalone Build Drift]].
- No central backup/sync; backup is a manual file copy.

## Alternatives considered

- Cloud-hosted deployment — rejected (offline requirement, cost, complexity).
- Electron instead of Tauri — heavier; Tauri chosen for a smaller footprint.
- Docker — rejected; Windows shop machines are not container hosts.

## Evidence

- Root and `backend/` batch scripts (see [[Build & Run Scripts]]).
- `frontend/src-tauri/tauri.conf.json` (`distDir: ../out`, identifier
  `com.abdulhakam.aapos`).
- `standalone/server.js` and `RUN MINI.BAT`.

## Revisit when

- Multi-machine or remote access is required.
- A supported installer/updater replaces the batch-file workflow.
- Backup/retention requirements become formal.

## Related

- Mechanics: [[Build & Run Scripts]], [[Desktop & Deployment]].
- Companion stack decision: [[Decision — Use PocketBase and Next.js]].
- The drift this packaging enables: [[Issue — Standalone Build Drift]] → fix in
  [[Reconcile the standalone build with source]].
