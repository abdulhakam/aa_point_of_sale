---
title: Batch build scripts carried six defects found in a full audit
type: issue
status: fixed
severity: medium
created: 2026-10-12
updated: 2026-10-12
resolved: 2026-10-12tags: [pos, build, scripts, bat, batch, run-bat, control-panel, defect, fixed]
related_to: ["[[build-and-run]]", "[[control-panel]]", "[[controlpanel-build-needs-cgo]]", "[[trailbase-ipv6-loopback-default-bind]]"]
---

# Batch build scripts carried six defects found in a full audit

**Verified and fixed 2026-10-12.** An audit of every `.bat` entry point and the
scripts they invoke (`aa.bat`, `trailbase\build.bat`, `RUN.BAT`, `clear_db.bat`,
`devreset.bat`, `import.bat`, `controlpanel\build.bat`, `controlpanel\run.bat`,
`dist.bat`/`dist.ps1`, `sfx.bat`/`sfx.ps1`) found the six defects below. All are
fixed; the files were uncommitted at audit time.

## 1. `RUN.BAT` ignored the bind override and left the LAN default dead

`trailbase\RUN.BAT` had:

```bat
set "ADDRESS=127.0.0.1:4000"                       rem e379f4d added this
...
if not defined ADDRESS set "ADDRESS=0.0.0.0:4000"  rem dead: ADDRESS is always set
```

Commit `e379f4d` ("chore(run): bind RUN.BAT to 127.0.0.1 by default") intended to
change the *default* from `0.0.0.0` to `127.0.0.1`, but implemented it by
**replacing a documentation-comment line** with an unconditional `set`. That made
the guard below it unreachable and **discarded any caller's `ADDRESS`**, so the
override documented in this file's own header (`set "ADDRESS=…" && RUN.BAT`) and
in `README.md` silently did nothing. Net effect: every start was loopback-only
and widening was impossible without editing the file.

**Fixed** to a single guarded default (`if not defined ADDRESS set
"ADDRESS=127.0.0.1:4000"`) so the override works; see
[[default-bind-is-loopback]] for the chosen default.

## 2. `RUN.BAT`'s rebuild guard did not match its comment

The comment said it builds the components when "the source copies **or the wasm
component** are missing", but the guard only tested `%DEPOT%\config.textproto`.
A depot whose config survived but whose `wasm\` was deleted started the server
with no app to serve.

**Fixed** by adding an `else if not exist "%DEPOT%\wasm\tb-ah-run-js.wasm"`
branch that runs `build.bat` alone (without the destructive `clear_db.bat`).

**Follow-up 2026-10-12 (code review).** That branch called `build.bat`, which `cd`s to
`trailbase\` and wrote to a **hardcoded** `traildepot\wasm` — so with a custom depot
(`set "DEPOT=…" && RUN.BAT`, which this file's own header documents) the rebuild landed in
the wrong depot, the wasm was still missing, and the server started with no app host.
`build.bat` now honours `DEPOT` (default `traildepot`), and `RUN.BAT` re-checks
`%DEPOT%\wasm\tb-ah-run-js.wasm` after the build and aborts with a clear error if it is
still absent.

## 3. `controlpanel\build.bat` never changed to its own directory

Every sibling build script does `cd /d "%~dp0"` first; this one did not. It
worked through `controlpanel\run.bat` (which already `cd`s, line 4) but **failed
via `aa panelbuild` / the menu**, because `aa.bat` sets the cwd to the repository
root before calling it and there is **no `go.mod` at the root**, so `go mod tidy`
and `go build .` had nothing to build.

**Fixed** by adding `cd /d "%~dp0"` after `setlocal`.

## 4. `clear_db.bat` masked a robocopy failure

Two `robocopy /MIR` calls (migrations, runtime) ran back-to-back and only the
**last** one's exit code was tested, so a migrations-sync failure (exit ≥ 8) was
overwritten by the runtime sync's success.

**Fixed** by testing each robocopy immediately (the pattern `RUN.BAT` and the
`.ps1` scripts already use).

## 5. `aa.bat` labelled option `[6]` "Dev reset + import"

Option `[6]` calls `devreset.bat`, which resets the depot and re-places the wasm
but does **not** import (`import.bat` is a separate step, and `devreset.bat`
prints exactly that). The label was misleading.

**Fixed** to "Dev reset + re-place wasm".

## 6. `sfx.ps1` left the staged payload behind on a failed build

`Fail` calls `exit 1` before the `Clear-Payload` near the end, so a failed
`go build` left the large staged payload under
`controlpanel\internal\sfx\payload\` (git-ignored, so only disk clutter). The
`go mod tidy` exit code was also unchecked (the same class as defect 3's file).

**Fixed** by moving `Clear-Payload` into the `finally` block (which runs even
when `Fail` exits) and checking `go mod tidy`.

## Evidence

- `trailbase\RUN.BAT` — the address block and the depot-prep guard; git blame
  shows `e379f4d` (2026-10-10) replaced the comment line
  `rem     set "ADDRESS=127.0.0.1:4000" && RUN.BAT` with the active `set`.
- `trailbase\controlpanel\build.bat` — no `cd`, and `%CD%` is the repo root when
  reached from `aa.bat:26`; `git ls-files go.mod` finds only
  `trailbase/controlpanel/go.mod`.
- `trailbase\clear_db.bat` — the two robocopy calls and the single guard.
- `trailbase\aa.bat` — the menu dispatch (`[6]` → `devreset.bat`) and `:usage`.
- `trailbase\sfx.ps1` — `Fail`/`exit` and the payload cleanup ordering.

## Related

- [[default-bind-is-loopback]] — the decision behind defect 1's chosen default.
- [[controlpanel-build-needs-cgo]] — the earlier, separate `controlpanel\build.bat`
  defect (a missing `CGO_ENABLED=1`), same file, different failure.
- [[build-and-run]] — the script-by-script reference these fixes were applied against.
