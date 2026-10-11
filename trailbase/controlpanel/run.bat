@echo off
rem Launch the control panel GUI. Builds it first if it is missing.
setlocal
cd /d "%~dp0"
if not exist controlpanel.exe (
  call build.bat || exit /b 1
)
controlpanel.exe %*
endlocal
