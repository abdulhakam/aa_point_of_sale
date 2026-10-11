---
title: "Control panel GUI is pure Go (go-gui), not Fyne"
type: decision
status: accepted
created: 2026-10-10
decided_on: 2026-10-10
tags: [pos, trailbase, gui, go, fyne, go-gui, control-panel, importer]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[control-panel]]", "[[pos-0030-control-panel-gui-importer]]", "[[v1-direct-import-tool]]", "[[go-module-proxy-blocked]]"]
---

# Control panel GUI is pure Go (go-gui), not Fyne

The owner asked for the v1 import tool to be **recreated as a Go GUI** using
`fyne.io`, as part of a **startup control panel** that also monitors TrailBase
(CPU/RAM) on one tab and drives the native importer on another. The GUI toolkit
choice was changed mid-task: **the UI uses `github.com/go-gui-org/go-gui`
(pure Go) instead of Fyne.**

## Why Fyne was abandoned

Fyne's Windows backend is **CGO-only** (GLFW + OpenGL), and this machine has no
C compiler at all (`gcc`, `cc`, `clang`, `cl`, `tcc` all absent; `CGO_ENABLED=0`).
A portable MinGW-w64 (`w64devkit` 2.10.0) was fetched and does compile CGO, but
the first Fyne build compiles a very large C/GL dependency tree and **did not
complete within a 20-minute budget** — it is impractical here. This is a
measurement, not a preference: the build was attempted, not assumed.

Two environment facts made the toolchain the deciding constraint:

- No C compiler preinstalled — `go env CGO_ENABLED` was `0`, and `where gcc`
  found nothing.
- `proxy.golang.org` is **unresolvable** on this machine (DNS), so Go modules
  come from `goproxy.io` — see [[go-module-proxy-blocked]].

## The decision

- **GUI:** `go-gui` v0.86.0 — pure Go, **CGO-free on Windows**, Go 1.26+. It is
  a retained/immediate-mode toolkit (`gui.NewWindow`, a per-frame view function,
  typed `gui.State[T]`, `w.QueueCommand` for cross-goroutine updates).
- **SQLite access stays on `github.com/mattn/go-sqlite3`** (CGO), because the
  destination schema's `CHECK (is_uuid_v7(id))` and `DEFAULT (uuid_v7())` need
  functions registered on the connection. That keeps **one** small C dependency
  (the SQLite amalgamation, which builds in seconds with `w64devkit`), not a GL
  tree.
- The importer logic is the direct Go port of `trailbase/tools/import-v1-tui.mjs`
  ([[v1-direct-import-tool]]), so the schema mapping, id/timestamp preservation
  and `invoice_maker` attribution are unchanged — see [[control-panel]] and
  [[pos-0030-control-panel-gui-importer]].

## Consequences

- The binary builds without a GL/compositor toolchain but still needs a C
  compiler **for the SQLite driver**; `w64devkit` gcc is the working recipe
  (build script records it).
- The control panel is one window with two tabs (`TrailBase`, `Import`), not a
  native-OS-specific app; it renders with go-gui's software backend, which also
  gives a headless `--screenshot` path used to verify the UI without a display.
