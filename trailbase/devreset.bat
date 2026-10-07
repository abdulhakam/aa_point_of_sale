@echo off
rem devreset.bat - reset the TrailBase depot for a from-scratch import, and re-place the prebuilt
rem guest-wasm components so no cargo build is needed.
rem
rem   devreset.bat  ==  clear_db.bat  +  copy the last cargo build output into traildepot\wasm\
rem
rem clear_db.bat wipes traildepot\ (data, secrets, uploads, wasm, backups, and the generated copies
rem of migrations\ and runtime\), then re-copies the checked-in sources. It deliberately leaves
rem traildepot\wasm empty, expecting build.bat to rebuild the three guest components from Rust.
rem This script fills that gap from the last `cargo build --target wasm32-wasip2 --release` output,
rem so a reset finishes without a full Rust rebuild.
rem
rem Flow:  devreset.bat  ->  import.bat (loads v1 data, inits main.db if missing)  ->  RUN.BAT (serve)
rem
rem Fallback: if the cargo output is gone, the components currently deployed in traildepot\wasm are
rem stashed before the wipe and restored afterwards. If neither exists, it warns and you must run
rem build.bat once.
setlocal
cd /d "%~dp0"

set "DEPOT=traildepot"
set "WASMDIR=target\wasm32-wasip2\release"
set "STASH=%TEMP%\aa-devreset-wasm"

if not exist "clear_db.bat" (
  echo ERROR: clear_db.bat not found - run devreset.bat from the trailbase directory.
  exit /b 1
)

rem --- 1. capture prebuilt components BEFORE clear_db.bat wipes the depot -------
set "HAVE_SRC=0"
if exist "%STASH%" rmdir /s /q "%STASH%"
mkdir "%STASH%" 2>nul

if exist "%WASMDIR%\tb_ah_run_js.wasm" (
  copy /y "%WASMDIR%\tb_ah_run_js.wasm"      "%STASH%\tb-ah-run-js.wasm"       >nul
  copy /y "%WASMDIR%\tb_ah_render_jinja.wasm" "%STASH%\tb-ah-render-jinja.wasm" >nul
  if exist "%WASMDIR%\tb_ah_query_tbdb.wasm" copy /y "%WASMDIR%\tb_ah_query_tbdb.wasm" "%STASH%\tb-ah-query-tbdb.wasm" >nul
  set "HAVE_SRC=1"
  echo Using prebuilt components from %WASMDIR%.
) else if exist "%DEPOT%\wasm\tb-ah-run-js.wasm" (
  copy /y "%DEPOT%\wasm\*.wasm" "%STASH%\" >nul
  set "HAVE_SRC=1"
  echo %WASMDIR% not found - reusing the components already in %DEPOT%\wasm.
)

if "%HAVE_SRC%"=="0" (
  echo.
  echo WARNING: no prebuilt wasm found ^(neither %WASMDIR% nor %DEPOT%\wasm^).
  echo          Run build.bat after this, or the server will not start.
)

rem --- 2. clear_db.bat performs the reset ---------------------------------------
call "%~dp0clear_db.bat"
if errorlevel 1 (
  echo ERROR: clear_db.bat failed.
  if exist "%STASH%" rmdir /s /q "%STASH%"
  endlocal & exit /b 1
)

rem --- 3. place the prebuilt components into the fresh depot --------------------
if "%HAVE_SRC%"=="1" (
  if not exist "%DEPOT%\wasm" mkdir "%DEPOT%\wasm"
  copy /y "%STASH%\*.wasm" "%DEPOT%\wasm\" >nul
  echo Placed prebuilt wasm in %DEPOT%\wasm:
  dir /b "%DEPOT%\wasm"
)
if exist "%STASH%" rmdir /s /q "%STASH%"

echo.
echo Depot reset for a from-scratch import. Next: import.bat ^(load v1 data^), then RUN.BAT.
endlocal
