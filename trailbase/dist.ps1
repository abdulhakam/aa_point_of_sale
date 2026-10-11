# dist.ps1 — assemble a runnable, minimal distribution of the system into `dist\`.
#
# Copies ONLY what the server + control panel need at run time, so the result is a few hundred MB
# instead of the multi-GB working tree:
#
#   controlpanel.exe      the Go control panel (start/stop + monitor + native v1 importer)
#   trail.exe             the TrailBase server binary
#   config.textproto      server/auth settings + record API declarations (source of truth)
#   metadata.textproto
#   migrations\           the 14 .sql migrations
#   runtime\              the application (ahscripts + app), served via --runtime-root-fs
#   wasm\                 the built guest components (tb-ah-run-js / -render-jinja / -query-tbdb)
#   start.bat             seeds traildepot\ on first run, then launches the control panel
#   README.txt            what this folder is and how to run it
#
# NOT copied (the size drivers): target\ (Rust build output), traildepot\data + backups (runtime
# state), controlpanel\ (Go source), the tb-ah-*\ component sources, tools\, Cargo.*.
#
# The depot is NOT shipped. On first launch `start.bat` seeds traildepot\ with config/metadata/
# migrations/runtime/wasm (no data); the control panel then initialises the database and admin user
# (TrailBase `user change-password`, the same bootstrap RUN.BAT uses) and starts the server.
#
# Usage:
#   pwsh -File dist.ps1 [-Out dist] [-Trail <trail.exe>] [-Panel <controlpanel.exe>]
#                       [-Wasm <dir>] [-IncludeLegacyData] [-Clean]
#
#   -Trail       path to trail.exe; default: `trail` on PATH
#   -Panel       path to the built control panel; default: controlpanel.exe next to this script
#   -Wasm        dir holding the built tb-ah-*.wasm; default: traildepot\wasm
#   -IncludeLegacyData  also copy the v1 PocketBase DB into source-data\ for the Import tab
[CmdletBinding()]
param(
  [string]$Out = "dist",
  [string]$Trail = "",
  [string]$Panel = "",
  [string]$Wasm = "",
  [switch]$IncludeLegacyData,
  [switch]$Clean
)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot                      # the trailbase\ directory
Set-Location -LiteralPath $root

function Fail($msg) { Write-Host "ERROR: $msg" -ForegroundColor Red; exit 1 }
function Size-Of($path) { (Get-ChildItem -LiteralPath $path -Recurse -File -Force -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum }

# ── resolve inputs ─────────────────────────────────────────────────────────────────────────────
if (-not $Trail) {
  $cmd = Get-Command trail -ErrorAction SilentlyContinue
  if (-not $cmd) { Fail "trail.exe not found on PATH; pass -Trail <path>" }
  $Trail = $cmd.Source
}
if (-not (Test-Path -LiteralPath $Trail)) { Fail "trail binary not found: $Trail" }

if (-not $Panel) {
  $Panel = Join-Path $root "controlpanel.exe"
  if (-not (Test-Path -LiteralPath $Panel)) { $Panel = Join-Path $root "controlpanel\controlpanel.exe" }
}
if (-not (Test-Path -LiteralPath $Panel)) { Fail "control panel not found; build it (controlpanel\build.bat) or pass -Panel <path>" }

if (-not $Wasm) { $Wasm = Join-Path $root "traildepot\wasm" }
if (-not (Test-Path -LiteralPath $Wasm)) { Fail "wasm components not found at $Wasm; build them (build.bat) or pass -Wasm <dir>" }
$wasmFiles = Get-ChildItem -LiteralPath $Wasm -Filter *.wasm -File
if (-not $wasmFiles) { Fail "no *.wasm in $Wasm" }

foreach ($f in @("config.textproto", "metadata.textproto")) {
  if (-not (Test-Path -LiteralPath (Join-Path $root $f))) { Fail "missing source file: $f" }
}
foreach ($d in @("migrations", "runtime")) {
  if (-not (Test-Path -LiteralPath (Join-Path $root $d))) { Fail "missing source directory: $d" }
}

# ── prepare output ─────────────────────────────────────────────────────────────────────────────
$outPath = if ([System.IO.Path]::IsPathRooted($Out)) { $Out } else { Join-Path $root $Out }
if ($Clean -and (Test-Path -LiteralPath $outPath)) { Remove-Item -LiteralPath $outPath -Recurse -Force }
New-Item -ItemType Directory -Force -Path $outPath | Out-Null

Write-Host "Assembling distribution into $outPath ..."

# ── binaries ───────────────────────────────────────────────────────────────────────────────────
Copy-Item -LiteralPath $Trail -Destination (Join-Path $outPath "trail.exe") -Force
Copy-Item -LiteralPath $Panel -Destination (Join-Path $outPath "controlpanel.exe") -Force

# ── server config + application ──────────────────────────────────────────────────────────────────
Copy-Item -LiteralPath (Join-Path $root "config.textproto")   -Destination $outPath -Force
Copy-Item -LiteralPath (Join-Path $root "metadata.textproto") -Destination $outPath -Force
robocopy (Join-Path $root "migrations") (Join-Path $outPath "migrations") /MIR /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { Fail "robocopy migrations failed ($LASTEXITCODE)" }
robocopy (Join-Path $root "runtime")    (Join-Path $outPath "runtime")    /MIR /XD vaulter-lite /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { Fail "robocopy runtime failed ($LASTEXITCODE)" }

# ── guest components ─────────────────────────────────────────────────────────────────────────────
New-Item -ItemType Directory -Force -Path (Join-Path $outPath "wasm") | Out-Null
$wasmFiles | Copy-Item -Destination (Join-Path $outPath "wasm") -Force

# ── optional: v1 source data for the Import tab ──────────────────────────────────────────────────
if ($IncludeLegacyData) {
  $src = Join-Path (Split-Path $root -Parent) "legacyforparity\backend\pb_data\data.db"
  if (Test-Path -LiteralPath $src) {
    New-Item -ItemType Directory -Force -Path (Join-Path $outPath "source-data") | Out-Null
    Copy-Item -LiteralPath $src -Destination (Join-Path $outPath "source-data\data.db") -Force
    Write-Host "  + source-data\data.db (v1 PocketBase database)"
  } else {
    Write-Host "  ! -IncludeLegacyData: source not found at $src (skipped)" -ForegroundColor Yellow
  }
}

# ── launcher ─────────────────────────────────────────────────────────────────────────────────────
$startBat = @'
@echo off
rem Start the AA Point of Sale system: seed the depot on first run, then open the control panel.
rem The control panel initialises the database + admin user and starts TrailBase (its TrailBase tab).
setlocal
cd /d "%~dp0"
set "DEPOT=traildepot"

if not exist "%DEPOT%\config.textproto" (
  echo First run: preparing "%DEPOT%" ...
  if not exist "%DEPOT%" mkdir "%DEPOT%"
  copy /y config.textproto   "%DEPOT%\config.textproto"   >nul
  copy /y metadata.textproto "%DEPOT%\metadata.textproto" >nul
  robocopy migrations "%DEPOT%\migrations" /MIR /NFL /NDL /NJH /NJS /NP >nul
  robocopy runtime    "%DEPOT%\runtime"    /MIR /XD vaulter-lite /NFL /NDL /NJH /NJS /NP >nul
  robocopy wasm       "%DEPOT%\wasm"       /MIR /NFL /NDL /NJH /NJS /NP >nul
)

echo Opening the control panel. Use its TrailBase tab to start the server, then browse http://127.0.0.1:4000
start "" "controlpanel.exe" --depot="%DEPOT%" --source-root="%~dp0" --trail="%~dp0trail.exe" --address=127.0.0.1:4000
endlocal
'@
Set-Content -LiteralPath (Join-Path $outPath "start.bat") -Value $startBat -Encoding ascii

$readme = @"
AA Point of Sale - distributable
================================

Contents
--------
  controlpanel.exe   Control panel: start/stop + monitor TrailBase, and the native v1 importer.
  trail.exe          The TrailBase server (this serves both the API and the whole app).
  config.textproto   Server + auth settings and the record API declarations.
  metadata.textproto
  migrations\        Database migrations (applied on first start).
  runtime\           The application (server routes + templates + client JS).
  wasm\              The compiled guest components.
  start.bat          Launcher (see below).
  traildepot\        Created on first run: the database and runtime state. Back this up.

Run
---
  1. Double-click start.bat (or run it in a terminal).
  2. In the control panel's "TrailBase" tab, click Start. First run creates the depot and the admin
     user (admin@localhost / administrator-0ne), applies migrations, and starts the server.
  3. Open http://127.0.0.1:4000 and log in.

Import legacy data (optional)
-----------------------------
  The control panel's "Import" tab loads a PocketBase v1 database (data.db) into the depot.
  Point it at the v1 database and choose "wipe + import" for a from-scratch load.

Notes
-----
  * Everything runs offline; no internet access is required.
  * Back up the traildepot\ folder - it holds the database, uploads and secrets.
  * The admin password is the documented development default; change it in production
    (trail --depot=traildepot user change-password admin@localhost <password>).
"@
Set-Content -LiteralPath (Join-Path $outPath "README.txt") -Value $readme -Encoding ascii

# ── report ─────────────────────────────────────────────────────────────────────────────────────
$total = Size-Of $outPath
Write-Host ""
Write-Host ("Distribution ready: {0}" -f $outPath)
Get-ChildItem -LiteralPath $outPath | Sort-Object Name | ForEach-Object {
  $s = if ($_.PSIsContainer) { Size-Of $_.FullName } else { $_.Length }
  "{0,12:N0}  {1}{2}" -f $s, $_.Name, $(if ($_.PSIsContainer) { "\" } else { "" })
}
Write-Host ("{0,12:N0}  TOTAL ({1:N1} MB)" -f $total, ($total / 1MB))
