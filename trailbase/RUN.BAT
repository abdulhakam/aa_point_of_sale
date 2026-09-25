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
rem IPv4 loopback explicitly. TrailBase defaults to [::1]:4000 (IPv6 only), which a
rem browser at 127.0.0.1 - and the frontend, whose TRAILBASE_URL is
rem http://127.0.0.1:4000 - cannot reach.
if not defined ADDRESS set "ADDRESS=127.0.0.1:4000"
set "ADMIN_USER=admin@localhost"
set "ADMIN_PASSWORD=administrator-0ne"

if exist "%DEPOT%\data" goto :start_server
call :init_depot

:start_server
echo Starting TrailBase server on http://%ADDRESS% ...
start "" trail "--depot=%DEPOT%" run --address=%ADDRESS%

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
