@echo off
rem sfx.bat - build the single-file, self-extracting distributable (aa-pos.exe) into dist\.
rem   sfx.bat                 -> dist\aa-pos.exe
rem   sfx.bat -KeepPayload    -> keep the staged payload for faster incremental rebuilds
rem   sfx.bat -Out <dir> -Name <file> -Trail <trail.exe> -Wasm <dir> -Clean
rem This is the .bat wrapper the other trailbase\*.bat have; sfx.ps1 holds the logic.
setlocal
cd /d "%~dp0"
pwsh -NoProfile -ExecutionPolicy Bypass -File "%~dp0sfx.ps1" %*
endlocal & exit /b %errorlevel%
