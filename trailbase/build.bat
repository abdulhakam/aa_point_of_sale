@echo off
rem build.bat - build the guest component and place it in the depot.
rem
rem Builds src\host\ with cargo for wasm32-wasip2 and copies the component to
rem traildepot\wasm\runtime_js.wasm, plus the TrailBase auth UI component when one is present.
rem
rem Plain wasm on purpose: `--aot` doubles the component size and is ~2.3x slower to cold-load,
rem so it is not used here (see the vault note on the AOT startup cost).
setlocal
cd /d "%~dp0"

where cargo >nul 2>nul
if errorlevel 1 (
  echo ERROR: cargo not found on PATH. Install Rust and the wasm32-wasip2 target.
  exit /b 1
)

echo Building the guest component ^(wasm32-wasip2, release^) ...
pushd "src\host"
cargo build --target wasm32-wasip2 --release
if errorlevel 1 (
  popd
  echo ERROR: cargo build failed.
  exit /b 1
)
popd

if not exist "traildepot\wasm" mkdir "traildepot\wasm"
copy /y "src\host\target\wasm32-wasip2\release\trail_runtime_js.wasm" "traildepot\wasm\runtime_js.wasm" >nul
echo   -^> traildepot\wasm\runtime_js.wasm

set "AUTHUI=..\guests\spikes\depot\wasm\trailbase_auth_ui_component.wasm"
if exist "%AUTHUI%" (
  copy /y "%AUTHUI%" "traildepot\wasm\trailbase_auth_ui_component.wasm" >nul
  echo   -^> traildepot\wasm\trailbase_auth_ui_component.wasm
)

echo.
echo Build complete. Run RUN.BAT to start the server.
endlocal
