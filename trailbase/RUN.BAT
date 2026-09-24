@echo off
cd /d "%~dp0"

echo Starting TrailBase server on http://localhost:4000 ...
start "" trail --depot=traildepot run

timeout /t 2 >nul

echo Opening the admin dashboard...
start "" http://127.0.0.1:4000/_/admin/
