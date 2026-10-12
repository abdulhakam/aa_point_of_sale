@echo off
rem clear_db.bat - reset the TrailBase depot to a clean state built from this directory.
rem
rem Wipes the depot's runtime state (data, secrets, uploads, wasm, backups) and the copies of the
rem source files, then re-copies {config.textproto, metadata.textproto, migrations, runtime}
rem into traildepot\. Run build.bat afterwards to place the wasm component in traildepot\wasm\,
rem then RUN.BAT to start the server (which re-initialises the fresh database).
setlocal
cd /d "%~dp0"

set "DEPOT=traildepot"

if not exist "config.textproto" (
  echo ERROR: config.textproto not found - run this from the trailbase directory.
  exit /b 1
)

echo Clearing "%DEPOT%" runtime state ...
for %%D in (data secrets uploads wasm backups migrations runtime) do (
  if exist "%DEPOT%\%%D" rmdir /s /q "%DEPOT%\%%D"
)
if exist "%DEPOT%\config.textproto"   del /q "%DEPOT%\config.textproto"
if exist "%DEPOT%\metadata.textproto" del /q "%DEPOT%\metadata.textproto"
if not exist "%DEPOT%" mkdir "%DEPOT%"

echo Copying source files into "%DEPOT%" ...
copy /y "config.textproto"   "%DEPOT%\config.textproto"   >nul
copy /y "metadata.textproto" "%DEPOT%\metadata.textproto" >nul
robocopy "migrations" "%DEPOT%\migrations" /MIR /NFL /NDL /NJH /NJS /NP >nul
if errorlevel 8 (
  echo ERROR: robocopy failed while syncing migrations.
  exit /b 1
)
robocopy "runtime"   "%DEPOT%\runtime"   /MIR /NFL /NDL /NJH /NJS /NP >nul
if errorlevel 8 (
  echo ERROR: robocopy failed while syncing runtime.
  exit /b 1
)

echo.
echo Depot reset. Next: build.bat (wasm), then RUN.BAT (start).
endlocal
