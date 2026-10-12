# sfx.ps1 — build the single-file, self-extracting AA Point of Sale.
#
# The result is ONE .exe that contains the control panel AND the whole runtime
# payload (trail.exe, config/metadata, migrations, runtime, wasm, docs). On first
# launch the panel writes the payload next to the executable and seeds
# traildepot\; on later launches it detects the files and starts normally, so it
# behaves as both an SFX archive and the launcher/control panel.
#
# It stages the payload into trailbase\controlpanel\internal\sfx\payload\, which
# `//go:embed all:payload` bakes into the binary, then removes the staged files
# again (they are large and git-ignored). The .gitkeep placeholder keeps a
# payload-less `go build` valid.
#
# Usage:
#   pwsh -File sfx.ps1 [-Out dist] [-Name aa-pos.exe] [-Trail <trail.exe>]
#                      [-Wasm <dir>] [-KeepPayload] [-Clean]
#
#   -Out          output directory (default dist)
#   -Name         output file name (default aa-pos.exe)
#   -Trail        path to trail.exe; default: `trail` on PATH
#   -Wasm         dir holding the built tb-ah-*.wasm; default: traildepot\wasm
#   -KeepPayload  leave the staged payload in place (faster incremental rebuilds)
#   -Clean        remove the output executable first
[CmdletBinding()]
param(
  [string]$Out = "dist",
  [string]$Name = "aa-pos.exe",
  [string]$Trail = "",
  [string]$Wasm = "",
  [switch]$KeepPayload,
  [switch]$Clean
)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot                      # the trailbase\ directory
$panel = Join-Path $root "controlpanel"
$payload = Join-Path $panel "internal\sfx\payload"
Set-Location -LiteralPath $root

function Fail($msg) { Write-Host "ERROR: $msg" -ForegroundColor Red; exit 1 }
function Clear-Payload {
  if (Test-Path -LiteralPath $payload) {
    Get-ChildItem -LiteralPath $payload -Force |
      Where-Object { $_.Name -ne ".gitkeep" } |
      Remove-Item -Recurse -Force
  }
}

# ── resolve inputs (same rules as dist.ps1) ──────────────────────────────────────
if (-not $Trail) {
  $cmd = Get-Command trail -ErrorAction SilentlyContinue
  if (-not $cmd) { Fail "trail.exe not found on PATH; pass -Trail <path>" }
  $Trail = $cmd.Source
}
if (-not (Test-Path -LiteralPath $Trail)) { Fail "trail binary not found: $Trail" }

if (-not $Wasm) { $Wasm = Join-Path $root "traildepot\wasm" }
if (-not (Test-Path -LiteralPath $Wasm)) { Fail "wasm components not found at $Wasm; build them or pass -Wasm <dir>" }
$wasmFiles = Get-ChildItem -LiteralPath $Wasm -Filter *.wasm -File
if (-not $wasmFiles) { Fail "no *.wasm in $Wasm" }

foreach ($f in @("config.textproto", "metadata.textproto")) {
  if (-not (Test-Path -LiteralPath (Join-Path $root $f))) { Fail "missing source file: $f" }
}
foreach ($d in @("migrations", "runtime")) {
  if (-not (Test-Path -LiteralPath (Join-Path $root $d))) { Fail "missing source directory: $d" }
}
$docsSrc = Join-Path (Split-Path $root -Parent) "docs"

# ── stage the payload that `//go:embed all:payload` will bake in ─────────────────
Write-Host "Staging SFX payload into $payload ..."
New-Item -ItemType Directory -Force -Path $payload | Out-Null
Clear-Payload
Copy-Item -LiteralPath $Trail -Destination (Join-Path $payload "trail.exe") -Force
Copy-Item -LiteralPath (Join-Path $root "config.textproto")   -Destination $payload -Force
Copy-Item -LiteralPath (Join-Path $root "metadata.textproto") -Destination $payload -Force
robocopy (Join-Path $root "migrations") (Join-Path $payload "migrations") /MIR /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { Fail "robocopy migrations failed ($LASTEXITCODE)" }
robocopy (Join-Path $root "runtime")    (Join-Path $payload "runtime")    /MIR /XD vaulter-lite /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { Fail "robocopy runtime failed ($LASTEXITCODE)" }
New-Item -ItemType Directory -Force -Path (Join-Path $payload "wasm") | Out-Null
$wasmFiles | Copy-Item -Destination (Join-Path $payload "wasm") -Force
if (Test-Path -LiteralPath $docsSrc) {
  robocopy $docsSrc (Join-Path $payload "docs") /MIR /NFL /NDL /NJH /NJS /NP | Out-Null
  if ($LASTEXITCODE -ge 8) { Fail "robocopy docs failed ($LASTEXITCODE)" }
} else {
  Write-Host "  ! docs source not found at $docsSrc (skipped)" -ForegroundColor Yellow
}
$staged = (Get-ChildItem -LiteralPath $payload -Recurse -File -Force | Measure-Object Length -Sum).Sum
Write-Host ("  staged {0:N0} bytes ({1:N1} MB)" -f $staged, ($staged / 1MB))

# ── build the panel (cgo is required for the importer's SQLite driver) ───────────
$w64 = Join-Path $env:USERPROFILE "w64devkit\w64devkit\bin"
if (-not $env:CC) { $env:CC = Join-Path $w64 "gcc.exe" }
if (-not (Test-Path -LiteralPath $env:CC)) {
  Fail "C compiler not found at $env:CC (required for go-sqlite3); pass via %CC% or install w64devkit"
}
$env:PATH = "$w64;$env:PATH"
$env:CGO_ENABLED = "1"
if (-not $env:GOPROXY) { $env:GOPROXY = "https://goproxy.io,direct" }
$env:GOSUMDB = "off"

$outPath = if ([System.IO.Path]::IsPathRooted($Out)) { $Out } else { Join-Path $root $Out }
New-Item -ItemType Directory -Force -Path $outPath | Out-Null
$exe = Join-Path $outPath $Name
if ($Clean -and (Test-Path -LiteralPath $exe)) { Remove-Item -LiteralPath $exe -Force }

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
Write-Host "Building $exe (payload version $stamp) ..."
Push-Location $panel
try {
  go mod tidy
  if ($LASTEXITCODE -ne 0) { Fail "go mod tidy failed" }
  go build -ldflags="-H=windowsgui -s -w -X aa-pos/controlpanel/internal/sfx.Version=$stamp" -o $exe .
  if ($LASTEXITCODE -ne 0) { Fail "go build failed" }
} finally {
  # Runs even when Fail exits, so a failed build never leaves the large staged payload behind.
  Pop-Location
  if (-not $KeepPayload) { Clear-Payload }
}

$size = (Get-Item -LiteralPath $exe).Length
Write-Host ""
Write-Host ("Single-file executable ready: {0}" -f $exe)
Write-Host ("  {0:N0} bytes ({1:N1} MB)" -f $size, ($size / 1MB))
Write-Host "  Double-click it: it extracts the payload next to itself, seeds traildepot\, and opens the panel."
