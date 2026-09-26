$root = 'D:\1Aeid4nI3hdH92f3D\abdulhakam\WORK\AA\ERP_DB\aa_point_of_sale\PRODUCTION\PRODUCTION_FULL\aa_point_of_sale'
$p = Start-Process -FilePath 'C:\Users\wajiz.pk\instl\trailbase\trail.exe' `
  -ArgumentList @('--depot=traildepot','run','--address=127.0.0.1:4000') `
  -WorkingDirectory (Join-Path $root 'trailbase') `
  -RedirectStandardOutput (Join-Path $root 'e2e-logs\trailbase.out.log') `
  -RedirectStandardError (Join-Path $root 'e2e-logs\trailbase.err.log') `
  -PassThru
$p.Id | Out-File -Encoding ascii (Join-Path $root 'e2e-logs\trailbase.pid')
Write-Output ("trailbase PID=" + $p.Id)
