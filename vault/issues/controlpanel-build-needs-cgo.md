---
title: "controlpanel build silently links a stub SQLite driver without cgo"
type: issue
status: active
resolved: 2026-10-12
created: 2026-10-12
updated: 2026-10-12
tags: [pos, control-panel, build, cgo, sqlite, defect, fixed]
related_to: ["[[control-panel]]", "[[go-module-proxy-blocked]]", "[[build-and-run]]"]
---

# controlpanel build silently links a stub SQLite driver without cgo

**Verified 2026-10-12.** Commit `457ebfd` ("simplify build.bat") reduced
`trailbase/controlpanel/build.bat` to:

```bat
go mod tidy
go build -ldflags="-H=windowsgui -s -w" -o controlpanel.exe
```

That dropped the `CC` / `CGO_ENABLED=1` / `GOPROXY` setup the previous script
performed. The `-ldflags="-H=windowsgui -s -w"` part is wanted (GUI subsystem,
stripped) and is kept. The dropped cgo setup is the defect.

## Why it is a defect, not a failure

The importer uses `github.com/mattn/go-sqlite3`, which is **cgo-only**. But the
module ships `static_mock.go` (build tag `!cgo`) that registers an
`sqlite3` driver whose `Open` returns:

```
Binary was compiled with 'CGO_ENABLED=0', go-sqlite3 requires cgo to work. This is a stub
```

So with `CGO_ENABLED=0` the build **succeeds** and produces a `controlpanel.exe`
that starts, shows the GUI and the monitor tab, but whose **Import tab fails at
runtime** the moment a database is opened. A green build hides a broken feature.

## Evidence

- Environment in the shell where the build runs: `CC` empty, `CGO_ENABLED` empty,
  `gcc` not on `PATH` (w64devkit is present at
  `%USERPROFILE%\w64devkit\w64devkit\bin\gcc.exe` but not on `PATH`).
- `go env CC CGO_ENABLED` → `gcc` / `0`.
- A probe `go build -ldflags="-H=windowsgui -s -w"` with `CGO_ENABLED=0`
  (GOPROXY=off) returned exit 0 and wrote an **18,844,672-byte** binary (stub).
- The **same probe with `CGO_ENABLED=1` and `CC=…\w64devkit\bin\gcc.exe`**
  returned exit 0 and wrote a **20,333,056-byte** binary — the same source, now
  with the real SQLite C code linked in (~1.5 MB).
- The shipped `trailbase/dist/controlpanel.exe` (built 2026-10-11 with the old
  script's `CGO_ENABLED=1`, but **not** stripped) is **40,719,121 bytes**; the
  difference from 20.3 MB is the symbol table, not SQLite.

## Fix

`build.bat` was restored to set `CC` (w64devkit, or an existing `%CC%`),
`CGO_ENABLED=1`, `GOPROXY` / `GOSUMDB`, **and** keep
`go build -ldflags="-H=windowsgui -s -w"`. It now **refuses to build** when no C
compiler is found, instead of silently emitting a stub binary.

## Caveat recorded

`-H=windowsgui` detaches the binary from a console, so the `--cli` /
`--screenshot` modes no longer print to a terminal. `--cli` still returns its
exit code. Use redirection, or build a console-subsystem binary, when CLI output
is needed. See [[control-panel]].
