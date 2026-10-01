# Spool bench across ALL reports: spooled (KV handle) vs rows-through-QuickJS.
#
# Both arms run the SAME SQL and render the SAME generic template, so the only difference is
# transport: one hands the renderer a KV key, the other materialises every row in QuickJS. HTML
# equality is asserted per report, because a timing comparison between arms that render different
# bytes is worthless.
#
#   pwsh -File tools/run-spool-sweep.ps1 [-Rounds 2] [-Base http://127.0.0.1:4000]

param(
  [int]$Rounds = 2,
  [string]$Base = "http://127.0.0.1:4000",
  [string]$Login = "admin@localhost",
  [string]$Password = "administrator-0ne"
)

$ErrorActionPreference = "Continue"

# The 14 report slugs, matching the REPORTS registry in app/lib/spoolreports.js.
$reports = @(
  "payments", "salesreport", "paymentsbycompany", "profit", "itemsales", "stockreport",
  "difference", "ledgers/party", "ledgers/booker", "ledgers/area", "ledgers/general",
  "dailysale", "outstanding", "productsale"
)

# Wide range, so the whole dataset is in scope — matching the method in
# vault/notes/report-performance-baseline.md, which is what makes these comparable with it.
$from = "2021-05-05"
$to = "2031-05-05"

$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
try {
  $null = Invoke-WebRequest -Uri "$Base/login" -Method Post -Body @{ email = $Login; password = $Password } -WebSession $session -MaximumRedirection 5 -TimeoutSec 30
} catch {
  Write-Host "FATAL: login failed: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}

function Median($a) {
  $s = $a | Sort-Object
  if ($s.Count % 2) { return $s[[int](($s.Count - 1) / 2)] }
  return ($s[$s.Count / 2 - 1] + $s[$s.Count / 2]) / 2
}

# An anonymous request is answered with the LOGIN page, which deserialises to an object with no
# fields -- so an unauthenticated probe looks like a report with zero rows rather than an auth
# failure. Prove the session works, and that the filters actually return rows, before timing anything.
$smoke = Invoke-RestMethod -Uri "$Base/bench/spool?arm=spooled&report=ledgers/booker&from=$from&to=$to" -WebSession $session -TimeoutSec 600
if ($smoke.error) { Write-Host "FATAL: $($smoke.error)" -ForegroundColor Red; exit 1 }
if (-not $smoke.rows) { Write-Host "FATAL: probe returned no rows with the wide filter -- session or filter is wrong" -ForegroundColor Red; exit 1 }
Write-Host ("logged in (probe: ledgers/booker {0} rows, {1} ms)" -f $smoke.rows, $smoke.totalMs) -ForegroundColor DarkGray
Write-Host ""

function Invoke-Arm([string]$arm, [string]$report, [int]$i) {
  $u = "$Base/bench/spool?arm=$arm&report=$([uri]::EscapeDataString($report))&from=$from&to=$to&n=$i"
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  try {
    $r = Invoke-RestMethod -Uri $u -WebSession $session -TimeoutSec 900
    $sw.Stop()
    return [pscustomobject]@{ ms = $sw.ElapsedMilliseconds; rows = $r.rows }
  } catch {
    $sw.Stop()
    return [pscustomobject]@{ ms = $sw.ElapsedMilliseconds; rows = -1 }
  }
}

$results = @()
Write-Host ("{0,-20} {1,7} {2,9} {3,9} {4,9} {5,8}  {6}" -f "report", "rows", "rows-arm", "spooled", "delta", "gain", "html")
Write-Host ("-" * 92)

foreach ($r in $reports) {
  $rowTimes = @()
  $spoolTimes = @()
  $nRows = 0

  for ($i = 1; $i -le $Rounds; $i++) {
    $a = Invoke-Arm "rows" $r $i
    $rowTimes += $a.ms
    if ($a.rows -ge 0) { $nRows = $a.rows }
    $b = Invoke-Arm "spooled" $r $i
    $spoolTimes += $b.ms
    if ($a.rows -le 0 -and $b.rows -gt 0) { $nRows = $b.rows }
  }

  # Byte comparison, once per report.
  $sameHtml = $false
  try {
    $q = "from=$from&to=$to"
    $h1 = (Invoke-WebRequest -Uri "$Base/bench/spool?arm=rows&report=$([uri]::EscapeDataString($r))&$q&format=html" -WebSession $session -TimeoutSec 900).Content
    $h2 = (Invoke-WebRequest -Uri "$Base/bench/spool?arm=spooled&report=$([uri]::EscapeDataString($r))&$q&format=html" -WebSession $session -TimeoutSec 900).Content
    $sameHtml = ($h1 -ceq $h2)
  } catch { $sameHtml = $false }

  $rm = Median $rowTimes
  $sm = Median $spoolTimes
  $delta = $rm - $sm
  $gain = if ($rm -gt 0) { "{0,6}%" -f [Math]::Round((1 - $sm / $rm) * 100, 1) } else { "     -" }
  $htmlTxt = if ($sameHtml) { "identical" } else { "DIFFERS" }

  $results += [pscustomobject]@{ report = $r; rows = $nRows; rowsArm = [Math]::Round($rm); spooled = [Math]::Round($sm); gain = $gain; html = $htmlTxt }

  $flag = if (-not $sameHtml) { "  <-- HTML DIFFERS" } elseif ($delta -le 0) { "  (no gain)" } else { "" }
  Write-Host ("{0,-20} {1,7} {2,9} {3,9} {4,9} {5,8}  {6}{7}" -f `
    $r, $nRows, [Math]::Round($rm), [Math]::Round($sm), [Math]::Round($delta), $gain, $htmlTxt, $flag)
}

Write-Host ("-" * 92)
$sumRows = ($results | Measure-Object -Property rowsArm -Sum).Sum
$sumSpool = ($results | Measure-Object -Property spooled -Sum).Sum
$identical = ($results | Where-Object { $_.html -eq "identical" }).Count
$totalGain = if ($sumRows -gt 0) { [Math]::Round((1 - $sumSpool / $sumRows) * 100, 1) } else { 0 }

Write-Host ("sum of per-report medians: rows-arm {0} ms   spooled {1} ms   overall {2}%" -f `
  [Math]::Round($sumRows), [Math]::Round($sumSpool), $totalGain)
Write-Host ("byte-identical HTML: {0}/{1} reports" -f $identical, $results.Count)

$zero = $results | Where-Object { $_.rows -le 0 }
if ($zero) {
  Write-Host ""
  Write-Host "reports that returned NO ROWS (the numbers above are not meaningful):" -ForegroundColor Yellow
  foreach ($z in $zero) { Write-Host ("  {0,-20} {1} rows" -f $z.report, $z.rows) }
}

$differ = $results | Where-Object { $_.html -eq "DIFFERS" }
if ($differ) {
  Write-Host ""
  Write-Host "reports whose two arms did NOT render identical bytes:" -ForegroundColor Yellow
  foreach ($d in $differ) { Write-Host ("  {0,-20} rows-arm {1} ms, spooled {2} ms" -f $d.report, $d.rowsArm, $d.spooled) }
}

$noGain = $results | Where-Object { $_.rowsArm -le $_.spooled }
if ($noGain) {
  Write-Host ""
  Write-Host "reports where the spool did not win (transport was not the bottleneck):" -ForegroundColor Yellow
  foreach ($n in $noGain) { Write-Host ("  {0,-20} rows-arm {1} ms, spooled {2} ms" -f $n.report, $n.rowsArm, $n.spooled) }
}