@echo off
rem Starts the TrailBase server and opens the admin dashboard.
rem
rem First run: if "%DEPOT%\data" does not exist yet, the depot is created by the CLI
rem (`trail user change-password`). That initialises the depot from this directory's
rem config.textproto + migrations/, creates the admin user and sets a fixed password
rem in one step - no server has to be running, so nothing races the initialisation.
rem Later runs skip straight to starting the server, so a password you change
rem yourself is never overwritten. Delete "%DEPOT%\data" for a fresh scaffold (and
rem the fixed password again).
rem
rem Override from the environment, quoting each assignment so no trailing space is
rem kept in the value:
rem     set "DEPOT=C:\some\depot" && RUN.BAT
rem     set "ADDRESS=127.0.0.1:4001" && RUN.BAT

setlocal
cd /d "%~dp0"

if not defined DEPOT set "DEPOT=traildepot"
rem Always give the bind address: TrailBase defaults to [::1]:4000 (IPv6 loopback only),
rem which neither a browser at 127.0.0.1 nor one at this machine's LAN address can reach.
rem 0.0.0.0 serves every interface, so other devices on the LAN can open the app; set
rem ADDRESS to go back to loopback only:
rem     set "ADDRESS=127.0.0.1:4000" && RUN.BAT
rem Inbound TCP 4000 also has to be allowed in Windows Defender Firewall for LAN clients.
if not defined ADDRESS set "ADDRESS=0.0.0.0:4000"
set "ADMIN_USER=admin@localhost"
set "ADMIN_PASSWORD=administrator-0ne"

rem The depot is generated: if the source copies or the wasm component are missing, build them.
if not exist "%DEPOT%\config.textproto" (
  echo Depot is not prepared yet - running clear_db.bat then build.bat ...
  call "%~dp0clear_db.bat"
  if errorlevel 1 (echo ERROR: clear_db.bat failed. & endlocal & goto :eof)
  call "%~dp0build.bat"
  if errorlevel 1 (echo ERROR: build.bat failed. & endlocal & goto :eof)
)

rem Sync the app into the depot EVERY start, not only when the depot is created.
rem
rem `runtime\` is the source of the guest app: the manifests, the SQL, the templates, the
rem route folders and the client JavaScript. The running server reads `%DEPOT%\runtime`,
rem which is a generated copy and is git-ignored. clear_db.bat also copies it, but that
rem only runs when the depot does not exist yet - so without this line an edit to
rem `runtime\` is silently not served, and the page you get is the page from whenever the
rem depot was last created. That is a genuinely confusing failure, so the copy is
rem unconditional and happens before the server starts.
rem
rem /MIR makes the destination match the source exactly, so a file deleted or renamed in
rem `runtime\` disappears here too. Robocopy exit codes 0-7 are success; 8 and above are
rem failures.
echo Syncing runtime\ into %DEPOT%\runtime ...
robocopy "runtime" "%DEPOT%\runtime" /MIR /NFL /NDL /NJH /NJS /NP >nul
if errorlevel 8 (echo ERROR: could not sync runtime\ into %DEPOT%\runtime & endlocal & goto :eof)

rem The migrations are synced for the same reason. The server applies what is in
rem %DEPOT%\migrations, and that directory is a generated copy of migrations\ - so a new
rem migration written in the source and not copied here is silently never applied, and the
rem app then disagrees with the schema it was written against. This is exactly how the draft
rem status survived a repair migration: the file existed, but not in the depot.
echo Syncing migrations\ into %DEPOT%\migrations ...
robocopy "migrations" "%DEPOT%\migrations" /MIR /NFL /NDL /NJH /NJS /NP >nul
if errorlevel 8 (echo ERROR: could not sync migrations\ into %DEPOT%\migrations & endlocal & goto :eof)

if exist "%DEPOT%\data" goto :start_server
call :init_depot

:start_server
echo Starting TrailBase server on http://%ADDRESS% ...
rem --runtime-root-fs points the guest at the app copy in the depot, so this one server
rem serves both the APIs and the new frontend. The copy was just synced from runtime\ above.
start "" trail "--depot=%DEPOT%" run --address=%ADDRESS% "--runtime-root-fs=%DEPOT%\runtime"

rem Wait for the listener before opening the dashboard. A server that failed to start
rem should say so, rather than opening a tab that cannot be reached.
set /a tries=0
:wait_listen
netstat -a -n -p tcp | findstr /c:"%ADDRESS%" | findstr /i "LISTENING" >nul
if not errorlevel 1 goto :open
set /a tries+=1
if %tries% geq 30 goto :not_listening
ping -n 2 127.0.0.1 >nul
goto :wait_listen

:not_listening
echo.
echo WARNING: nothing is listening on %ADDRESS% after 30s.
echo          Check the TrailBase console window for the error, then open
echo          http://%ADDRESS%/_/admin/ once it is up.
endlocal
goto :eof

:open
echo Opening the admin dashboard...
start "" http://%ADDRESS%/_/admin/
endlocal
goto :eof

:init_depot
echo First run: creating "%DEPOT%" and setting a fixed admin password ...
trail "--depot=%DEPOT%" user change-password "%ADMIN_USER%" "%ADMIN_PASSWORD%"
if not errorlevel 1 goto :init_ok
echo.
echo WARNING: could not set the admin password ^(see the message above^).
echo          Set it later with: trail "--depot=%DEPOT%" user change-password %ADMIN_USER% ^<password^>
goto :eof

:init_ok
echo Admin login: %ADMIN_USER% / %ADMIN_PASSWORD%
goto :eof
