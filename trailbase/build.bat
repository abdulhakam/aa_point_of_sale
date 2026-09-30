@echo off
rem build.bat - build the guest components and place them in the depot.
rem
rem   tb-ah-run-js\       -> traildepot\wasm\tb-ah-run-js.wasm        (the app host)
rem   tb-ah-render-jinja\ -> traildepot\wasm\tb-ah-render-jinja.wasm  (minijinja, its own component)
rem   tb-ah-query-tbdb\   -> traildepot\wasm\tb-ah-query-tbdb.wasm    (data acquisition; experimental)
rem
rem TrailBase discovers components by scanning traildepot\wasm\, so the file names are free — but
rem they are what the operator sees in the startup log, so they carry the component names.
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

if not exist "traildepot\wasm" mkdir "traildepot\wasm"

rem build <directory> <lib-name> <wasm-file-name>
call :build "tb-ah-run-js" "tb_ah_run_js" "tb-ah-run-js.wasm"
if errorlevel 1 exit /b 1

call :build "tb-ah-render-jinja" "tb_ah_render_jinja" "tb-ah-render-jinja.wasm"
if errorlevel 1 exit /b 1

rem The query component is experimental and exists to be measured, so a failure building it is a
rem warning rather than a stop: the app host and renderer are what a deployment needs.
call :build "tb-ah-query-tbdb" "tb_ah_query_tbdb" "tb-ah-query-tbdb.wasm"

echo.
echo Build complete. Run RUN.BAT to start the server.
endlocal
exit /b 0

:build
echo Building %~1 ^(wasm32-wasip2, release^) ...
pushd "%~1"
cargo build --target wasm32-wasip2 --release
if errorlevel 1 (
  popd
  echo   WARNING: cargo build failed for %~1
  exit /b 1
)
popd
copy /y "%~1\target\wasm32-wasip2\release\%~2.wasm" "traildepot\wasm\%~3" >nul
if errorlevel 1 (
  echo   ERROR: could not place traildepot\wasm\%~3
  exit /b 1
)
echo   -^> traildepot\wasm\%~3
exit /b 0
