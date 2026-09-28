<#
  Clean-slate benchmark cycle.

  For each run, in order:
    1. stop the server
    2. delete traildepot/data  (fresh schema, migrations re-run; components are kept)
    3. start the server and wait for the port
    4. set the admin password
    5. import the production copy with tools/import-from-v1.mjs (the plugin's own code)
    6. run tools/split-bench.mjs

  Every run therefore benchmarks a depot that was built identically from scratch, with no
  accumulated mview snapshot, page cache, KV spool or WAL. That is the point: medians over a
  growing database are not comparable between runs.

    pwsh -File tools/run-bench.ps1 -Runs 3 -Reps 8 -Limits 10000
#>

param(
  [int]$Runs = 3,
  [int]$Reps = 8,
  [string]$Limits = "10000",
  [string]$Results = "trailbase/tools/bench-results.ndjson"
)

# NOTE: do NOT set $ErrorActionPreference = "Stop" here. `trail` writes a benign
# "Vault not found" warning to stderr, and with 2>&1 in a pipeline that becomes a terminating
# NativeCommandError under Stop, aborting the cycle part-way with no output. Native exit codes are
# checked explicitly instead.
$ErrorActionPreference = "Continue"
$repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$tb = Join-Path $repo "trailbase"
$data = Join-Path $tb "traildepot\data"
$log = Join-Path $tb "traildepot\bench-server.log"

function Stop-Server {
  Get-Process trail -ErrorAction SilentlyContinue | Stop-Process -Force
  Start-Sleep -Milliseconds 800
}

function Start-Server {
  $p = Start-Process -FilePath "trail" `
    -ArgumentList @("--depot=traildepot", "run", "--address=127.0.0.1:4000",
                    "--runtime-root-fs=traildepot\runtime", "--runtime-threads=4") `
    -WorkingDirectory $tb -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput $log -RedirectStandardError "$log.err"
  for ($i = 0; $i -lt 120; $i++) {
    Start-Sleep -Milliseconds 500
    try {
      $r = Invoke-WebRequest "http://127.0.0.1:4000/healthz" -UseBasicParsing -TimeoutSec 3
      if ($r.StatusCode -eq 200) { return $p }
    } catch { }
    if ($p.HasExited) { throw "server exited during startup; see $log" }
  }
  throw "server did not become ready"
}

# Normalise the depot's on-disk state after the import, so runs are comparable.
#
# Without this, run-to-run variance is ~1.7x: the freshly imported depot has a large uncheckpointed
# WAL and a cold page cache, so the *same* arm measures 716ms in one run and 426ms in the next, and
# the SQL query itself varies 61->157ms. That variance is far larger than the between-arm
# difference the benchmark exists to measure, so it has to be removed before the arms are compared.
function Normalize-Db {
  $script = @'
import sqlite3, sys, os
p = os.path.join("traildepot", "data", "main.db")
c = sqlite3.connect(p, timeout=30)
c.execute("PRAGMA wal_checkpoint(TRUNCATE)")
c.execute("ANALYZE")
c.commit()
c.close()
print("checkpointed + analyzed")
'@
  $tmp = Join-Path $env:TEMP "tb-normalize.py"
  Set-Content -Path $tmp -Value $script -Encoding utf8
  Push-Location $tb
  & python $tmp
  $code = $LASTEXITCODE
  Pop-Location
  if ($code -ne 0) { Write-Host "  WARNING: db normalisation failed; run-to-run variance will be higher" -ForegroundColor Yellow }
}

$summary = @()

for ($run = 1; $run -le $Runs; $run++) {
  Write-Host "`n================ RUN $run / $Runs ================" -ForegroundColor Cyan

  Stop-Server
  Remove-Item -Recurse -Force $data -ErrorAction SilentlyContinue
  Write-Host "  depot reset"

  $proc = Start-Server
  Write-Host "  server up (pid $($proc.Id))"

  # Set the admin password non-interactively.
  #
  # CRITICAL: `--depot=traildepot` is relative to the *process* cwd, so this must run inside
  # `trailbase/`. Run from the repo root and it silently creates and updates a stray
  # `./traildepot` instead, leaving the running server's real admin on its random initial
  # password — which surfaces much later as a confusing `HTTP 401 on /api/auth/v1/login`.
  # stderr is discarded rather than merged: the benign "Vault not found" warning in a 2>&1
  # pipeline becomes a NativeCommandError and aborts the cycle.
  Push-Location $tb
  & trail "--depot=traildepot" user change-password admin@localhost administrator-0ne *> $null
  $adminCode = $LASTEXITCODE
  Pop-Location
  if ($adminCode -ne 0) { throw "could not set the admin password (exit $adminCode)" }
  Write-Host "  admin ready"

  Write-Host "  importing ..."
  $importOut = (& node (Join-Path $tb "tools\import-from-v1.mjs") 2>&1 | Out-String)
  $importCode = $LASTEXITCODE
  $importLine = (($importOut -split "`n") | Where-Object { $_ -match "status=" } | Select-Object -First 1)
  $totalLine = (($importOut -split "`n") | Where-Object { $_ -match "^TOTAL" } | Select-Object -First 1)
  if ($totalLine) { Write-Host "  $($totalLine.Trim())" }
  if ($importLine) { Write-Host "  $($importLine.Trim())" }
  if ($importCode -ne 0 -or -not $totalLine) {
    Write-Host "  import FAILED (exit $importCode), skipping run" -ForegroundColor Red
    Write-Host ($importOut | Select-Object -Last 15)
    Stop-Server
    continue
  }
  $totalLine = $totalLine.Trim()

  Normalize-Db
  Write-Host "  db normalised"

  Write-Host "  benchmarking ..."
  $benchArgs = @((Join-Path $tb "tools\split-bench.mjs"), "--reps", $Reps, "--limits", $Limits, "--raw")
  $benchOut = & node @benchArgs 2>&1
  $benchOut | ForEach-Object { Write-Host "  $_" }

  $numbers = @{}
  foreach ($line in $benchOut) {
    if ($line -match "^\s*inline\s+total\s+(\d+)ms") { $numbers.inline = [int]$Matches[1] }
    if ($line -match "^\s*component\s+total\s+(\d+)ms") { $numbers.component = [int]$Matches[1] }
    if ($line -match "overhead:\s*([+-]?[\d.]+)%") { $numbers.overhead = [double]$Matches[1] }
    if ($line -match "identical=(\w+)") { $numbers.identical = $Matches[1] }
  }

  $entry = [pscustomobject]@{
    run       = $run
    imported  = ($totalLine -replace "\s+", " ")
    inlineMs  = $numbers.inline
    compMs    = $numbers.component
    overhead  = $numbers.overhead
    identical = $numbers.identical
  }
  $summary += $entry
  $entry | ConvertTo-Json -Compress | Add-Content $Results

  Stop-Server
}

Write-Host "`n================ CROSS-RUN SUMMARY ================" -ForegroundColor Cyan
$summary | Format-Table run, inlineMs, compMs, overhead, identical -AutoSize

if ($summary.Count -gt 0) {
  # The arms are PAIRED within a run, so the aggregate must be the median of the per-run
  # differences, not the difference of each arm's median across runs. The latter mixes run-level
  # variance (a slow run drags one arm's median) into what is supposed to be an arm comparison,
  # and can flip the sign: one batch here has a per-run median of -1.1% while the arm-medians
  # differ by +3.8%. Only the paired statistic is meaningful.
  $deltas = $summary | ForEach-Object { $_.overhead } | Sort-Object
  $mid = [int]($deltas.Count / 2)
  $medDelta = if ($deltas.Count % 2) { $deltas[$mid] } else { ($deltas[$mid - 1] + $deltas[$mid]) / 2 }
  $inl = ($summary.inlineMs | Measure-Object -Average).Average
  $cmp = ($summary.compMs | Measure-Object -Average).Average
  $spread = if ($deltas.Count -gt 1) { "$([math]::Round($deltas[0],1))% .. $([math]::Round($deltas[-1],1))%" } else { "n/a" }
  Write-Host ""
  Write-Host ("median of per-run paired differences: {0:+0.0;-0.0;0.0}%   (range {1})" -f $medDelta, $spread) -ForegroundColor Green
  Write-Host ("run means:  inline {0:N0}ms   component {1:N0}ms" -f $inl, $cmp)
}
Write-Host "per-run records appended to $Results"
