---
title: Control panel (go-gui) — TrailBase monitor and importer GUI
type: system
status: experimental
created: 2026-10-10
updated: 2026-10-10
locator: trailbase/controlpanel/
tags: [pos, trailbase, gui, go, go-gui, importer, monitor, control-panel]
related_to: ["[[trailbase]]", "[[v1-direct-import-tool]]", "[[control-panel-gui-is-pure-go]]", "[[pos-0030-control-panel-gui-importer]]", "[[go-module-proxy-blocked]]"]
---

# Control panel (go-gui) — TrailBase monitor and importer GUI

`trailbase/controlpanel/` is a **Go + go-gui** desktop control panel for
TrailBase, and the native replacement for the Node direct-import TUI
([[v1-direct-import-tool]]). One window, two tabs:

| Tab | What it does |
|---|---|
| **TrailBase** | Start / Stop / Attach the `trail` server; watch the process's **CPU % and RSS** (and the machine's CPU/RAM), PID, uptime and console output. |
| **Import** | Drive the v1 (PocketBase) → TrailBase import: source `data.db`, destination `main.db` (both accept a typed path or the **Browse…** native file picker), the `invoice_maker` user, wipe / dry-run / per-collection limit; live progress, per-collection stats, post-import verification and a log. |

The GUI toolkit is pure Go ([[control-panel-gui-is-pure-go]]); the only CGO
dependency is the SQLite driver. The window is **fixed at 640×460 and
non-resizable** (`FixedSize`), with a compact theme and per-field padding; each
tab is a single **scrollable column** (primary controls first, then metrics, then
the console/log) so every control is reachable at that size.

## How it supervises the server

`internal/monitor` mirrors `RUN.BAT`: on **Start** it initialises the depot with
`trail --depot=<depot> user change-password` if `data\` is missing, optionally
mirrors `runtime\` (keeping the generated `vaulter-lite\` store) and
`migrations\` (`robocopy /MIR` semantics), then runs
`trail --depot=<depot> run --address=<addr> --runtime-root-fs=<depot>\runtime`,
captures stdout/stderr into a ring buffer, and polls the TCP port until it
listens. **Stop** uses `taskkill /PID <pid> /T /F` (whole tree). **Attach** finds
an already-running `trail.exe` (e.g. started by `RUN.BAT`) via gopsutil and
observes it without owning it. Metrics come from `gopsutil/v4`
(`process.Times` deltas for CPU %, `MemoryInfo().RSS`, `cpu.Percent`, `mem.VirtualMemory`).

## The importer

`internal/importer` is the Go port of the Node tool: same plan
(`categories`→`companies`, `party_companies`/`order_booker_companies` link
tables, enums as integer codes, booleans as 0/1, amounts rounded to 2 dp,
`created`/`updated` preserved verbatim, UUIDv7 ids seeded from `created`).
It is **schema-aware**: at `Open` it reads the actual table/column lists from the
source and the destination and **refuses to run on a destination missing any
column the plan writes** (so it cannot silently mismatch the live schema). It
registers `is_uuid_v7`/`uuid_v7`/`is_uuid`/`uuid_v4` on the connection, which the
destination's CHECK/DEFAULT clauses require. `--wipe` re-seeds the schema's
`Difference` party and verification excludes it, exactly as the Node tool does.

## Build and run

Requires a C compiler for the SQLite driver. Working recipe (w64devkit fetched to
`%USERPROFILE%\w64devkit`, `GOPROXY` to work around [[go-module-proxy-blocked]]):

```sh
set CGO_ENABLED=1
set CC=C:\Users\<user>\w64devkit\w64devkit\bin\gcc.exe
set GOPROXY=https://goproxy.io,direct
set GOSUMDB=off
go build -o controlpanel.exe .          # run from trailbase/controlpanel
```

Flags: `--cli` (headless import, exit code 1 on errors), `--screenshot <png>`
(render the window headlessly — used to verify the UI without a display),
`--tab monitor|import`, `--source`, `--dest`, `--depot`, `--address`, `--trail`.
Repo root is auto-detected (a directory holding both `trailbase` and
`legacyforparity`), so the default source is
`legacyforparity/backend/pb_data/data.db` and the default destination is
`trailbase/traildepot/data/main.db`.

## Verified behaviour (2026-10-10)

Against the **real** source (`legacyforparity/backend/pb_data/data.db`, 15 MB) and
a throw-away depot built from the real migrations:

- `--dry-run`: read counts match the source exactly — `parties` 1129 (13
  `party_companies`), `order_bookers` 4 (5 links), `items` 235, `expenses` 88,
  `invoices` 12791, `invoices_return_reference` 62, `transactions` 34393,
  `payments` 32782.
- `--wipe` full import: **all 11 collections verify, 0 failures**, 575 s.
- Independent source↔destination diff: per-collection counts equal (the only
  extra row is the seeded `Difference` party), **money sums equal at whole
  paisas** (`payments` 5,783,700,391; `expenses` 273,811,300; `transactions`
  discount 2,004,100; `invoices` discount 5,276,425), `created`/`updated`
  min/max **byte-identical**, `invoice_maker` attributed on all 12,791 invoices,
  every `transactions.invoice`/`payments.invoice` resolved, `inv_doc` 12,791 for
  12,791 live invoices.
- Both tabs render (headless `--screenshot`): `vault/attachments/control-panel-2026-10-10/panel-monitor.png`
  and `.../panel-import.png`.

## Not done (recorded, not hidden)

- Same gaps as the Node tool: no vaulter-lite `documents` / job-queue import, and
  the HTTP import plugin still exists separately.
- The GUI's live controls were exercised through the CLI path and headless
  screenshots; a full interactive click-through on the owner's display is the
  remaining manual check.
