@echo off
rem build.bat - build the guest components and place them in the depot.
rem
rem   tb-ah-run-js        -> traildepot\wasm\tb-ah-run-js.wasm        (the app host)
rem   tb-ah-render-jinja  -> traildepot\wasm\tb-ah-render-jinja.wasm  (minijinja, its own component)
rem   tb-ah-query-tbdb    -> traildepot\wasm\tb-ah-query-tbdb.wasm    (data acquisition; experimental)
rem
rem The three are members of ONE cargo workspace (Cargo.toml in this directory), so they share a
rem single Cargo.lock and a single target\. Two consequences worth knowing:
rem
rem   - `--offline` resolves from the local registry cache and never touches the network. That is
rem     deliberate: without it, dropping a lockfile makes cargo resolve to the *newest* cached
rem     version and then try to download it, which fails on a machine with no network access.
rem   - The three share compiled dependencies, so touching one component does not recompile serde,
rem     minijinja or trailbase-wasm for the other two.
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

rem build <package> <wasm-file-name>
call :build "tb_ah_run_js" "tb-ah-run-js.wasm"
if errorlevel 1 exit /b 1

call :build "tb_ah_render_jinja" "tb-ah-render-jinja.wasm"
if errorlevel 1 exit /b 1

rem The query component is experimental and exists to produce a measurement, so a failure building
rem it is a warning rather than a stop: the app host and renderer are what a deployment needs.
call :build "tb_ah_query_tbdb" "tb-ah-query-tbdb.wasm"

echo.
echo Build complete. Run RUN.BAT to start the server.
endlocal
exit /b 0

:build
echo Building %~1 ^(wasm32-wasip2, release^) ...
cargo build --offline --release --target wasm32-wasip2 -p %~1
if errorlevel 1 (
  echo   WARNING: cargo build failed for %~1
  exit /b 1
)
copy /y "target\wasm32-wasip2\release\%~1.wasm" "traildepot\wasm\%~2" >nul
if errorlevel 1 (
  echo   ERROR: could not place traildepot\wasm\%~2
  exit /b 1
)
echo   -^> traildepot\wasm\%~2
exit /b 0
