# Live report sweep against a running guest: every report, cold + repeat.
#
# This follows the method in vault/notes/report-performance-baseline.md so the numbers are
# COMPARABLE with the recorded baselines, and it uses the same filter convention: a wide range, so
# the whole dataset is included, and a fresh filter value each run so the KV report cache misses on
# the cold hit.
#
#   pwsh -File tools/run-report-sweep.ps1 [-Rounds 2] [-All] [-Base http://127.0.0.1:4000]
#
# `-All` adds ?all=1, which lifts the 1000-row render cap (report-render-row-cap). Without it the
# page renders 1,000 rows while the totals still cover every row -- which is what a user normally
# waits for, and the honest default.

param(
  [int]$Rounds = 2,
  [string]$Base = "http://127.0.0.1:4000",
  [switch]$All,
  [string]$Login = "admin@localhost",
  [string]$Password = "administrator-0ne"
)

$ErrorActionPreference = "Continue"

# The 14 report slugs, in the order the vault tables use.
$reports = @(
  "stockreport", "difference", "ledgers/area", "salesreport", "payments", "dailysale",
  "outstanding", "productsale", "ledgers/general", "paymentsbycompany", "itemsales",
  "profit", "ledgers/booker", "ledgers/party"
)

# Wide range so every row is in scope, and a FRESH key per run so the KV report cache is a miss on
# the cold hit -- both are required for comparability with the recorded baselines.
$stamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$from = "2021-05-05"
$to = "2031-05-05"

Write-Host "report sweep against $Base (threads=4, cap=$(if($All){'off'}else{'1000'}))" -ForegroundColor Cyan
Write-Host ""

# The bench endpoints need no session (they are probes, not report pages). The report PAGES do.
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
try {
  $body = @{ email = $Login; password = $Password }
  $null = Invoke-WebRequest -Uri "$Base/login" -Method Post -Body $body -WebSession $session -MaximumRedirection 5 -TimeoutSec 30
} catch {
  Write-Host "FATAL: login failed: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "An unauthenticated request is answered with the LOGIN page, which deserialises to an" -ForegroundColor Red
  Write-Host "object with no fields -- so every report would report 0 rows and every time would be" -ForegroundColor Red
  Write-Host "the login redirect. Fix the credentials rather than reading the table." -ForegroundColor Red
  exit 1
}

# Prove the session works before timing anything: a probe that returns a real row count is the
# cheapest confirmation that the cookie is live.
$smoke = Invoke-RestMethod -Uri "$Base/bench/runreport?report=stockreport&from=$from&to=$to" -WebSession $session -TimeoutSec 120
if (-not $smoke.rows -and -not $smoke.error) {
  Write-Host "FATAL: authenticated probe returned no rows and no error -- session is not live." -ForegroundColor Red
  Write-Host ($smoke | ConvertTo-Json -Compress) -ForegroundColor DarkGray
  exit 1
}
Write-Host ("logged in (probe: stockreport {0} rows, {1} ms)" -f $smoke.rows, $smoke.totalMs) -ForegroundColor DarkGray
Write-Host ""

$rows = @()

foreach ($r in $reports) {
  $cold = @()
  $repeat = @()
  $coldStatus = ""
  $repeatStatus = ""
  $payload = 0
  $probeRows = 0

  for ($i = 1; $i -le $Rounds; $i++) {
    # A fresh filter value per hit forces a cache miss on the cold hit and a different key per round.
    # `fr=` is a cache-busting dummy: it is not a report filter, so it does not change the result,
    # only the rendered-page cache key.
    $qs = "from=$from&to=$to&fr=$stamp-$i-$r"
    $suffix = if ($All) { "&all=1" } else { "" }
    $url = "$Base/reports/$r`?$qs$suffix"

    $t = [System.Diagnostics.Stopwatch]::StartNew()
    try {
      $resp = Invoke-WebRequest -Uri $url -WebSession $session -TimeoutSec 90
      $t.Stop()
      $cold += $t.ElapsedMilliseconds
      $coldStatus = [string]$resp.StatusCode
      $payload = [math]::Round($resp.RawContentLength / 1KB)
    } catch {
      $t.Stop()
      $cold += $t.ElapsedMilliseconds
      $code = $null
      try { $code = $_.Exception.Response.StatusCode.value__ } catch {}
      $coldStatus = if ($code) { "$code" } else { "ERR" }
    }

    $t2 = [System.Diagnostics.Stopwatch]::StartNew()
    try {
      $resp2 = Invoke-WebRequest -Uri $url -WebSession $session -TimeoutSec 90
      $t2.Stop()
      $repeat += $t2.ElapsedMilliseconds
      $repeatStatus = [string]$resp2.StatusCode
    } catch {
      $t2.Stop()
      $repeat += $t2.ElapsedMilliseconds
      $code = $null
      try { $code = $_.Exception.Response.StatusCode.value__ } catch {}
      $repeatStatus = if ($code) { "$code" } else { "ERR" }
    }
  }

  # The probe endpoint gives the real row count for the same filters. It needs the SAME session as
  # the pages: an anonymous request is answered with the LOGIN page, which deserialises to an
  # object with no fields -- so an unauthenticated probe looks like a report with zero rows rather
  # than like an auth failure.
  try {
    $p = Invoke-RestMethod -Uri "$Base/bench/runreport?report=$r&from=$from&to=$to" -WebSession $session -TimeoutSec 120
    $probeRows = $p.rows
    $probeErr = $p.error
  } catch {
    $probeErr = "probe failed: $($_.Exception.Message)"
  }

  $cm = ($cold | Sort-Object)[[int](($cold.Count - 1) / 2)]
  $rm = ($repeat | Sort-Object)[[int](($repeat.Count - 1) / 2)]
  $deadline = if (($cold | Where-Object { $_ -ge 19500 }) -or ($repeat | Where-Object { $_ -ge 19500 })) { "DEADLINE" } else { "" }

  $rows += [pscustomobject]@{
    report = $r; rows = $probeRows; cold = $cm; repeat = $rm
    coldStatus = $coldStatus; repeatStatus = $repeatStatus; payloadKB = $payload; flag = $deadline
  }

  $flagTxt = if ($deadline) { "  <-- ~20 s deadline" } else { "" }
  Write-Host ("{0,-20} {1,7} rows  cold {2,7} ms [{3}]  repeat {4,7} ms [{5}]  {6,6} KB{7}" -f `
    $r, $probeRows, $cm, $coldStatus, $rm, $repeatStatus, $payload, $flagTxt)
}

Write-Host ""
$dead = $rows | Where-Object { $_.flag -eq "DEADLINE" }
Write-Host ("sum cold medians : {0} ms" -f (($rows | Measure-Object -Property cold -Sum).Sum))
Write-Host ("sum repeat medians: {0} ms" -f (($rows | Measure-Object -Property repeat -Sum).Sum))
if ($dead) {
  Write-Host ("at/near the ~20 s deadline: {0}" -f (($dead | ForEach-Object { $_.report }) -join ", ")) -ForegroundColor Red
}