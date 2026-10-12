---
title: The control panel is a self-extracting single-file executable
type: decision
status: accepted
decided_on: 2026-10-12
created: 2026-10-12
tags: [pos, control-panel, distribution, packaging, sfx, decision]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[control-panel]]", "[[pos-0032-control-panel-sfx]]", "[[pos-0031-distributable-build]]", "[[offline-local-deployment]]"]
---

# The control panel is a self-extracting single-file executable

**Accepted 2026-10-12.** The control panel executable carries the whole runtime payload and
extracts it on first launch, so the product ships as **one file** instead of a folder of
siblings. This is a distribution decision, not a change to how the server runs.

## Decision

`controlpanel.exe` embeds `trail.exe`, `config.textproto`, `metadata.textproto`,
`migrations/`, `runtime/`, `wasm/` and `docs/`, and on launch:

1. writes them next to the executable (or `%LOCALAPPDATA%\AA Point of Sale` if that is not
   writable), preserving the tree, recording the build version in `.aa-pos-payload`;
2. seeds `traildepot\` from them, exactly as `dist\start.bat` did;
3. starts the server and drives the importer against those paths as usual.

The embedded payload is optional to the code: a payload-less `go build` leaves `HasPayload()`
false and the panel behaves as before. The build step that stages the payload is `trailbase/sfx.ps1`
(wrapped by `trailbase/sfx.bat`, exposed as `aa sfx`).

## Why this, over the loose distribution

- **One file to hand over.** The operator copies a single `.exe`; there is no folder to keep
  together and no risk of a mismatched `trail.exe` beside an old panel. This fits the
  single-machine, offline deployment target ([[offline-local-deployment]]).
- **Version-locked payload.** The `trail.exe` and wasm the panel starts are the ones it was
  built with, so the console and the server cannot drift apart.
- **Reuses, does not replace, the existing launcher.** The panel already seeded the depot and
  started the server; the SFX only adds "materialise the files first". `dist.ps1` still ships the
  loose folder for anyone who prefers it.

## Consequences

- The unified payload pushes the artifact to roughly **one panel + one server + wasm** in a
  single file (order 110 MB), and any server/wasm/runtime change requires rebuilding the panel.
- It is a large, unsigned, self-extracting executable, so SmartScreen/AV may warn until it is
  signed.
- Extraction writes ~90 MB on first run; the per-file temp+rename keeps an interrupted first run
  from leaving a half-written `trail.exe`.
- The depot and database stay **outside** the executable: this makes a single-file *distribution*,
  not a stateless or self-contained data file. Backing up `traildepot\` remains the backup story.

## Alternatives considered

- **Append the payload to the exe as a custom trailer** instead of `//go:embed`: rejected —
  `go:embed` is stdlib, needs no bespoke reader, and the payload is static per build.
- **Extract to `%TEMP%` every launch**: rejected — paths would change between runs and nothing
  would clean up; extracting beside the exe (or a per-user stable dir) keeps paths stable.
- **Keep the folder distribution only**: rejected as the primary shape, but retained (`dist.ps1`)
  as a parallel artifact.

See [[pos-0032-control-panel-sfx]] for the implementation and [[control-panel]] for how the panel
operates it.
