@echo off
rem dist.bat - build the distributable into dist\ (see dist.ps1 for options).
rem   dist.bat                     -> dist\
rem   dist.bat -IncludeLegacyData   -> also ship the v1 database for the Import tab
setlocal
cd /d "%~dp0"
pwsh -NoProfile -ExecutionPolicy Bypass -File "%~dp0dist.ps1" %*
endlocal & exit /b %errorlevel%
