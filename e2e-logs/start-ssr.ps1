$root = 'D:\1Aeid4nI3hdH92f3D\abdulhakam\WORK\AA\ERP_DB\aa_point_of_sale\PRODUCTION\PRODUCTION_FULL\aa_point_of_sale'
$p = Start-Process -FilePath 'node' `
  -ArgumentList @('src/server.js') `
  -WorkingDirectory (Join-Path $root 'frontend-ssr') `
  -RedirectStandardOutput (Join-Path $root 'e2e-logs\frontend-ssr.out.log') `
  -RedirectStandardError (Join-Path $root 'e2e-logs\frontend-ssr.err.log') `
  -PassThru
$p.Id | Out-File -Encoding ascii (Join-Path $root 'e2e-logs\frontend-ssr.pid')
Write-Output ("frontend-ssr PID=" + $p.Id)
