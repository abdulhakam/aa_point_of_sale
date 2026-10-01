# Equivalence + timing: the spooled path vs rows-through-QuickJS, on the same SQL and template.
#
# Both arms must produce BYTE-IDENTICAL HTML. A timing comparison between two arms that compute
# different numbers is worthless, so equality is asserted first and the timings are only reported
# when it holds.
#
#   pwsh -File tools/run-spool-bench.ps1 [-Rounds 3] [-Base http://127.0.0.1:4000]

param(
  [int]$Rounds = 3,
  [string]$Base = "http://127.0.0.1:4000"
)

$ErrorActionPreference = "Stop"
$tmp = Join-Path $env:TEMP "spool-bench"

function Get-Arm([string]$arm) {
  $out = Join-Path $tmp "$arm.html"
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  $json = Invoke-RestMethod -Uri "$Base/bench/spool?arm=$arm" -TimeoutSec 300
  $sw.Stop()
  # The route returns the rendered length; fetch the HTML itself for the byte comparison.
  $html = (Invoke-WebRequest -Uri "$Base/bench/spool?arm=$arm&format=html" -TimeoutSec 300).Content
  [pscustomobject]@{
    arm     = $arm
    rows    = $json.rows
    htmlLen = $html.Length
    queryMs = $json.queryMs
    writeMs = $json.writeMs
    acquire = $json.acquireMs
    serverMs = $json.totalMs
    wallMs  = $sw.ElapsedMilliseconds
    html    = $html
  }
}

New-Item -ItemType Directory -Force -Path $tmp | Out-Null

Write-Host "spool bench against $Base" -ForegroundColor Cyan
Write-Host "rounds: $Rounds`n"

$rowsTimes = @()
$spoolTimes = @()
$equality = $null

for ($i = 1; $i -le $Rounds; $i++) {
  $rows = Get-Arm "rows"
  $spool = Get-Arm "spooled"

  if ($null -eq $equality) {
    $equality = $rows.html -ceq $spool.html
    if (-not $equality) {
      Write-Host "HTML DIFFERS between arms - timings below are meaningless." -ForegroundColor Red
      $r = $rows.html; $s = $spool.html
      $n = [Math]::Min($r.Length, $s.Length)
      for ($k = 0; $k -lt $n; $k++) {
        if ($r[$k] -cne $s[$k]) {
          Write-Host ("first difference at char {0}:" -f $k)
          Write-Host ("  rows : ...{0}..." -f $r.Substring([Math]::Max(0,$k-60), 120))
          Write-Host ("  spool: ...{0}..." -f $s.Substring([Math]::Max(0,$k-60), 120))
          break
        }
      }
      Write-Host ("lengths: rows {0} vs spooled {1}" -f $r.Length, $s.Length)
    }
  }

  $rowsTimes += $rows.serverMs
  $spoolTimes += $spool.serverMs

  Write-Host ("round {0}" -f $i)
  Write-Host ("  rows     {0,6} rows  {1,7} ms server  (acquire {2,5} ms)" -f $rows.rows, $rows.serverMs, $rows.acquire)
  Write-Host ("  spooled  {0,6} rows  {1,7} ms server  (query {2,5} + write {3,4} ms)" -f $spool.rows, $spool.serverMs, $spool.queryMs, $spool.writeMs)
}

function Median($a) {
  $s = $a | Sort-Object
  if ($s.Count % 2) { return $s[[int](($s.Count - 1) / 2)] }
  return ($s[$s.Count / 2 - 1] + $s[$s.Count / 2]) / 2
}

$mr = Median $rowsTimes
$ms = Median $spoolTimes

Write-Host ""
Write-Host ("HTML identical across arms : {0}" -f $equality) -ForegroundColor $(if ($equality) { "Green" } else { "Red" })
Write-Host ("rows-through-JS median     : {0} ms" -f [Math]::Round($mr))
Write-Host ("spooled median             : {0} ms" -f [Math]::Round($ms))
if ($mr -gt 0) {
  $pct = [Math]::Round((1 - $ms / $mr) * 100, 1)
  Write-Host ("difference                 : {0} ms ({1}%)" -f [Math]::Round($mr - $ms), $pct) -ForegroundColor Cyan
}
Write-Host ""
Write-Host "NOTE: this report renders ~4.3 MB of HTML, so the shared render cost dominates both"
Write-Host "arms. The spooled arm's saving is on acquisition and transport only; a report that renders"
Write-Host "little but reads many rows should show a much larger ratio."

if (-not $equality) { exit 1 }
