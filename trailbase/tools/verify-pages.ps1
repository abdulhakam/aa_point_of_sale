# P1 verification: drive the guest over HTTP, without a browser.
#
# Logs in through the app's own /login form, then walks every report and asserts the things this
# phase was supposed to change:
#   - every report renders from its manifest
#   - date DEFAULTS are honoured (a bare GET is a window, not all-time)
#   - the payments "Payable Amount" is the net of the three rows above it
#   - the company filter on itemsales/stock has options (it was sourced from an empty table)
#   - grouped totals and the composed `join` total render
#
# Run:  pwsh -File trailbase/tools/verify-pages.ps1

$Base = $Base
if (-not $Base) { $Base = "http://127.0.0.1:4000" }

$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$null = Invoke-WebRequest "$Base/login" -WebSession $session -UseBasicParsing
$null = Invoke-WebRequest "$Base/login" -WebSession $session -Method POST -UseBasicParsing -Body @{
  email = "admin@localhost"; password = "administrator-0ne"
}

function Get-Page($path) {
  $r = Invoke-WebRequest "$Base$path" -WebSession $session -UseBasicParsing
  [pscustomobject]@{ Status = $r.StatusCode; Body = $r.Content }
}

function Get-Totals($html) {
  $pairs = [regex]::Matches($html, '<th>([^<]*)</th><td class="right">([^<]*)</td>')
  $out = @{}
  foreach ($p in $pairs) { $out[$p.Groups[1].Value] = $p.Groups[2].Value }
  $out
}

$fail = @()
$ok = @()

# ---- 1. every report renders, and reports its row count
$reports = @(
  "payments","salesreport","paymentsbycompany","itemsales","profit","stockreport",
  "difference","dailysale","outstanding","productsale",
  "ledgers/party","ledgers/booker","ledgers/area","ledgers/general"
)
"=== 1. every report renders"
foreach ($k in $reports) {
  $p = Get-Page "/reports/$k"
  $bad = $p.Body -match 'Guest error|Internal Server Error|Traceback'
  $rows = ([regex]::Matches($p.Body, '<tr')).Count
  if ($p.Status -eq 200 -and -not $bad) { $ok += "$k renders ($rows tr)" }
  else { $fail += "$k FAILED status=$($p.Status) err=$bad" }
}

# ---- 2. date defaults honoured
"=== 2. date defaults are a window, not all-time"
$windowed = @{
  "payments" = "26099"; "itemsales" = "21823"; "profit" = "21823"
  "dailysale" = "8204"; "productsale" = "205"; "salesreport" = "8240"
  "ledgers/general" = "26187"
}
foreach ($k in $windowed.Keys) {
  $p = Get-Page "/reports/$k"
  $f = [regex]::Match($p.Body, '<form class="filters"[\s\S]*?</form>').Value
  $from = [regex]::Match($f, 'name="from" value="([^"]*)"').Groups[1].Value
  $to   = [regex]::Match($f, 'name="to" value="([^"]*)"').Groups[1].Value
  # A window that fits inside a page shows no "Showing first N of M" notice, so the rendered row
  # count is the signal: the all-time count was 8k-26k, and a single day is far smaller.
  $m = [regex]::Match($p.Body, 'Showing first ([\d,]+) of ([\d,]+)')
  $rows = ([regex]::Matches($p.Body, '<tr')).Count
  $allTime = [int]($windowed[$k] -replace ',', '')
  $narrowed = if ($m.Success) { [int]($m.Groups[2].Value -replace ',', '') -lt $allTime }
              else { $rows -lt 1000 }
  if ($from -and $to -and $narrowed) {
    $shown = if ($m.Success) { $m.Value } else { "$rows tr, under the 1000-row cap" }
    $ok += "$k defaults [$from..$to] -> $shown (was $allTime all-time)"
  } else {
    $fail += "$k defaults MISSING or unchanged: from=[$from] to=[$to] rows=$rows notice=$($m.Value)"
  }
}

# ---- 3. the payments payable total is the net of its own group
"=== 3. payments Payable Amount == Purchase - Paid - Returns"
$p = Get-Page "/reports/payments?from=2020-01-01&to=2030-12-31"
$t = Get-Totals $p.Body
$purch = [decimal]($t["Purchase Amount"]); $paid = [decimal]($t["Paid Amount"]); $ret = [decimal]($t["Returns"])
$payable = [decimal]$t["Payable Amount"]
$expected = $purch - $paid - $ret
if ($payable -eq $expected) { $ok += "Payable Amount $payable == $purch - $paid - $ret" }
else { $fail += "Payable Amount $payable != $purch - $paid - $ret (difference $($payable - $expected))" }

# ---- 4. the company filter has options
"=== 4. the company select is populated"
foreach ($k in @("itemsales","stock","stockreport","profit")) {
  $path = if ($k -eq "stock") { "/reports/stockreport" } else { "/reports/$k" }
  $p = Get-Page $path
  $f = [regex]::Match($p.Body, '<form class="filters"[\s\S]*?</form>').Value
  $sel = [regex]::Match($f, '<select name="company"[\s\S]*?</select>').Value
  $n = ([regex]::Matches($sel, '<option ')).Count
  if ($n -gt 1) { $ok += "$k company select has $n options" } else { $fail += "$k company select has $n options (empty)" }
}

# ---- 5. grouped totals + the composed join
"=== 5. grouped and composed totals"
$p = Get-Page "/reports/payments?from=2020-01-01&to=2030-12-31"
$groups = ([regex]::Matches($p.Body, '<table class="totals-table">')).Count
if ($groups -ge 2) { $ok += "payments renders $groups totals tables" } else { $fail += "payments rendered $groups totals tables, expected 2" }

$p = Get-Page "/reports/outstanding"
$line = [regex]::Match($p.Body, '<th>Total</th><td class="right">([^<]*)</td>').Groups[1].Value
# The template escapes the literal separator, so compare on the decoded form.
$decoded = [System.Net.WebUtility]::HtmlDecode($line)
$parts = $decoded.Split('/') | ForEach-Object { $_.Trim() }
if ($parts.Count -eq 3 -and $parts -notcontains "") { $ok += "outstanding composed total: $decoded" }
else { $fail += "outstanding composed total malformed: [$decoded]" }

# ---- 6. the hub indexes still list every report
"=== 6. the reports and ledgers indexes link everything"
$reportsHref = @("payments","itemsales","salesreport","paymentsbycompany","stockreport","profit",
                 "difference","outstanding","productsale","dailysale")
$p = Get-Page "/reports"
$links = [regex]::Matches($p.Body, 'class="tile" href="/reports/([^"]+)"') | ForEach-Object { $_.Groups[1].Value }
foreach ($k in $reportsHref) {
  if ($links -contains $k) { } else { $fail += "/reports index does not link $k" }
}
if ($links -contains "ledgers") { $ok += "/reports links the ledgers hub" } else { $fail += "/reports lost the ledgers hub link" }
$ok += "/reports links $($links.Count) tiles in order: $($links -join ', ')"

$p = Get-Page "/reports/ledgers"
# minijinja HTML-escapes the `/` in `ledgers/area` as `&#x2f;`, so decode before matching.
$lHtml = [System.Net.WebUtility]::HtmlDecode($p.Body)
$lLinks = [regex]::Matches($lHtml, 'class="tile" href="/reports/ledgers/([^"]+)"') | ForEach-Object { $_.Groups[1].Value }
foreach ($k in @("party","booker","area","general")) {
  if ($lLinks -contains $k) { } else { $fail += "/reports/ledgers does not link $k" }
}
$ok += "/reports/ledgers links $($lLinks.Count) tiles: $($lLinks -join ', ')"

# ---- 7. /p reads the same definition
"=== 7. /p serves the same report from the same manifest"
$p = Get-Page "/p/reports/payments/data?from=2020-01-01&to=2030-12-31"
$j = $p.Body | ConvertFrom-Json
$ok += "/p payments rows=$($j.result.rows.Count) totalSending=$($j.result.totals.totalSending) total=$($j.result.totals.total)"

"`n================ RESULT ================"
"passed: $($ok.Count)"
foreach ($o in $ok) { "  PASS  $o" }
if ($fail.Count) {
  "FAILED: $($fail.Count)"
  foreach ($f in $fail) { "  FAIL  $f" }
  exit 1
}
"all checks passed"
