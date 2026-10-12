---
title: "pos-0032 control panel as a self-extracting single-file executable"
type: task
status: done
priority: high
created: 2026-10-12
updated: 2026-10-12
tags: [pos, control-panel, trailbase, packaging, distribution, sfx, release, done]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[control-panel]]", "[[pos-0031-distributable-build]]", "[[pos-0030-control-panel-gui-importer]]", "[[control-panel-is-a-self-extracting-executable]]", "[[build-and-run]]"]
---

# pos-0032 control panel as a self-extracting single-file executable

**Done and verified 2026-10-12.** The control panel now doubles as a **self-extracting
archive (SFX)** and launcher: one `.exe` embeds the whole runtime payload and, on first launch,
writes it next to itself, seeds `traildepot\`, and starts normally. A payload-less `go build`
still behaves exactly as before, so the dev workflow is unchanged.

## What was built

- `trailbase/controlpanel/internal/sfx/` — a Go package that:
  - embeds the payload with `//go:embed all:payload` (`payload/` staged at build time, holding
    `trail.exe`, `config.textproto`, `metadata.textproto`, `migrations/`, `runtime/`, `wasm/`,
    `docs/`);
  - `HasPayload()` — true only when a real `payload/trail.exe` was embedded;
  - `DefaultDir()` — the exe's own directory when writable, else `%LOCALAPPDATA%\AA Point of Sale`;
  - `Ensure()` / `Extract()` — writes the payload tree out (temp-file + rename per file) and
    records the build version in `.aa-pos-payload`, so an upgraded build re-extracts and an
    unchanged one is skipped;
  - `SeedDepot()` — mirrors `dist\start.bat`: copies config/metadata/migrations/runtime/wasm into
    `traildepot\` (keeping a generated `vaulter-lite` store), no-op when `config.textproto` is
    already there.
- `main.go` — new flags `--sfx-dir`, `--sfx` (force), `--no-sfx`; the SFX block runs before any
  path defaulting and points `--depot` / `--trail` / `--source-root` / `--dest` at the extracted
  tree. Startup failures route through `fatal()`, which logs to `%TEMP%\aa-pos-error.log` and
  shows a Windows message box (`fatal_windows.go`; `fatal_other.go` off Windows) because the
  binary is GUI-subsystem and has no console.
- `trailbase/sfx.ps1` — stages the payload from `trailbase\`, builds with cgo and
  `-ldflags "-H=windowsgui -s -w -X aa-pos/controlpanel/internal/sfx.Version=<stamp>"`, then
  clears the staged payload. `.gitignore` keeps `internal/sfx/payload/*` out of history while
  tracking the `.gitkeep` that keeps a payload-less build valid.
- `sfx_test.go` — `testing/fstest` coverage of extraction, version/force semantics and depot
  seeding.

## Evidence

- `go vet ./...` clean; `go test ./internal/sfx/` — 3 tests pass.
- **End-to-end** (2026-10-12): `pwsh -File trailbase\sfx.ps1 -Trail <fake> -Wasm <fake> -Out %TEMP%\sfxout`
  produced `aa-pos.exe` **21,895,168 bytes**; running it with `--sfx-dir %TEMP%\sfxtarget --screenshot <png>`
  exited 0, extracted the full tree next to the exe, wrote the `.aa-pos-payload` marker, seeded
  `traildepot\{config,metadata,migrations,runtime,wasm}`, and rendered the panel. Test inputs and
  output were removed afterwards; a real build uses the real `trail.exe` and `tb-ah-*.wasm`.
- Dev build (payload-less) still compiles to a working 20,350,464-byte binary.

## Not done / caveats

- The real single-file artifact (≈112 MB: ~20 MB panel + ~92 MB payload) was not built here; the
  end-to-end run used a fake `trail.exe`/wasm so extraction and seeding could be proven without
  shipping the 79 MB server binary through a test.
- Not code-signed, so Windows SmartScreen/AV may warn on a large self-extracting `.exe`.
- Any `trail.exe` / wasm / runtime change requires rebuilding the panel, since the payload is
  baked in.
- `dist.ps1` still produces the loose multi-file distribution with `start.bat`; the SFX is a
  parallel artifact. See [[control-panel]] and [[pos-0031-distributable-build]].
