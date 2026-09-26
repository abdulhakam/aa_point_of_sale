$root = 'D:\1Aeid4nI3hdH92f3D\abdulhakam\WORK\AA\ERP_DB\aa_point_of_sale\PRODUCTION\PRODUCTION_FULL\aa_point_of_sale'
$p = Start-Process -FilePath (Join-Path $root 'backend\pocketbase.exe') `
  -ArgumentList @('serve','--http=127.0.0.1:8090') `
  -WorkingDirectory (Join-Path $root 'backend') `
  -RedirectStandardOutput (Join-Path $root 'e2e-logs\pocketbase.out.log') `
  -RedirectStandardError (Join-Path $root 'e2e-logs\pocketbase.err.log') `
  -PassThru
$p.Id | Out-File -Encoding ascii (Join-Path $root 'e2e-logs\pocketbase.pid')
Write-Output ("pocketbase PID=" + $p.Id)
