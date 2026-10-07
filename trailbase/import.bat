@echo off
rem import.bat - load the PocketBase (v1) database directly into the TrailBase depot with the
rem standalone TUI importer, attributing invoices.invoice_maker to the default admin user.
rem
rem The importer is trailbase\tools\import-v1-tui.mjs: it writes traildepot\data\main.db in place,
rem so the source row's created/updated are preserved verbatim (not re-stamped) and invoice_maker
rem is pointed at a real _user. See vault/references/v1-direct-import-tool.md.
rem
rem WARNING: this passes --wipe, so it CLEARS the business tables in %DEPOT%\data\main.db (parties,
rem items, invoices, payments, ...) before loading. It is the intended companion to devreset.bat
rem for from-scratch data testing. It does NOT touch _user, secrets, uploads or wasm. Drop --wipe
rem below (or run the node command by hand) if you must merge into a depot that already holds data.
rem
rem Usage:  import.bat [extra importer args]      e.g.  import.bat --limit 200   /   import.bat --dry-run
rem Note: --yes runs non-interactively; remove it to get the setup screen (admin preselected).
setlocal
cd /d "%~dp0"

set "DEPOT=traildepot"
set "ADMIN_USER=admin@localhost"
set "ADMIN_PASSWORD=administrator-0ne"
set "SOURCE=..\legacyforparity\backend\pb_data\data.db"
set "DEST=%DEPOT%\data\main.db"

if not exist "%SOURCE%" (
  echo ERROR: source database not found at "%SOURCE%".
  exit /b 1
)

rem Initialise the depot if it does not exist yet (fresh devreset). This is the same bootstrap
rem RUN.BAT uses first run: it creates data\main.db from config.textproto + migrations\ and creates
rem the admin user, before any server starts - so nothing races initialisation.
if not exist "%DEST%" (
  echo Depot not initialised ^(no %DEST%^) - creating it and the admin user ...
  trail "--depot=%DEPOT%" user change-password "%ADMIN_USER%" "%ADMIN_PASSWORD%"
  if errorlevel 1 (
    echo ERROR: could not initialise the depot. Is `trail` on PATH? Or run RUN.BAT once instead.
    exit /b 1
  )
)

echo Importing "%SOURCE%" -> "%DEST%"  ^(invoice_maker -^> %ADMIN_USER%, wiping business tables^) ...
node "%~dp0tools\import-v1-tui.mjs" --source "%SOURCE%" --dest "%DEST%" --user "%ADMIN_USER%" --wipe --yes %*

endlocal & exit /b %errorlevel%
