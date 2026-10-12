@echo off
rem aa.bat - one entry point for every task that used to require remembering a separate
rem trailbase\*.bat. Run it with no argument for an interactive menu, or pass a task name
rem to script it:
rem
rem   aa build        build the guest wasm components      (trailbase\build.bat)
rem   aa run          start the server                     (trailbase\RUN.BAT)
rem   aa panel        run the control panel GUI            (trailbase\controlpanel\run.bat)
rem   aa panelbuild   build the control panel binary       (trailbase\controlpanel\build.bat)
rem   aa import       import the v1 database (WIPES tables)(trailbase\import.bat)
rem   aa cleardb      wipe the depot / reset the database  (trailbase\clear_db.bat)
rem   aa devreset     reset the depot and re-place wasm    (trailbase\devreset.bat)
rem   aa dist         build the loose distributable folder (trailbase\dist.bat)
rem   aa sfx          build the single-file SFX (aa-pos.exe)(trailbase\sfx.bat)
rem   aa open         open the running app in a browser
rem
rem `aa dist` and `aa sfx` are the two distributables and are kept separate on purpose:
rem dist copies a prebuilt panel + server into a folder (no compiler needed); sfx rebuilds
rem the panel with the whole payload embedded, so it needs cgo (a C compiler) and bakes in
rem runtime\; changing trail.exe, the wasm or runtime\ means rebuilding the sfx.
rem
rem The individual scripts are kept: they call each other (devreset -> clear_db,
rem RUN.BAT -> clear_db/build.bat) and are referenced by the docs. This file only
rem gathers them behind a single, discoverable command.
setlocal enabledelayedexpansion
cd /d "%~dp0"
set "TB=%~dp0trailbase"

rem --- non-interactive task dispatch -----------------------------------------
if /i "%~1"=="build"      ( call "%TB%\build.bat" & exit /b !errorlevel! )
if /i "%~1"=="run"        ( call "%TB%\RUN.BAT"   & exit /b !errorlevel! )
if /i "%~1"=="panel"      ( call "%TB%\controlpanel\run.bat"   & exit /b !errorlevel! )
if /i "%~1"=="panelbuild" ( call "%TB%\controlpanel\build.bat" & exit /b !errorlevel! )
if /i "%~1"=="import"     ( call "%TB%\import.bat"     & exit /b !errorlevel! )
if /i "%~1"=="cleardb"    ( call "%TB%\clear_db.bat"   & exit /b !errorlevel! )
if /i "%~1"=="devreset"   ( call "%TB%\devreset.bat"   & exit /b !errorlevel! )
if /i "%~1"=="dist"       ( call "%TB%\dist.bat"       & exit /b !errorlevel! )
if /i "%~1"=="sfx"        ( call "%TB%\sfx.bat"        & exit /b !errorlevel! )
if /i "%~1"=="open"       ( start "" http://127.0.0.1:4000/ & exit /b 0 )
if /i "%~1"=="help"       ( call :usage & exit /b 0 )
if not "%~1"==""          ( echo Unknown task: %~1 & echo. & call :usage & exit /b 1 )

rem --- interactive menu -------------------------------------------------------
:menu
cls
call :usage
echo.
set "choice="
set /p "choice=Select an option: "
if not defined choice goto menu
if "%choice%"=="1" call "%TB%\build.bat"
if "%choice%"=="2" call "%TB%\RUN.BAT"
if "%choice%"=="3" call "%TB%\controlpanel\run.bat"
if "%choice%"=="4" call "%TB%\import.bat"
if "%choice%"=="5" call "%TB%\clear_db.bat"
if "%choice%"=="6" call "%TB%\devreset.bat"
if "%choice%"=="7" call "%TB%\dist.bat"
if "%choice%"=="8" call "%TB%\controlpanel\build.bat"
if "%choice%"=="9" call "%TB%\sfx.bat"
if "%choice%"=="10" start "" http://127.0.0.1:4000/
if "%choice%"=="0" exit /b 0
echo.
pause
goto menu

:usage
echo ============================================================
echo   AA Point of Sale  -  task launcher
echo ============================================================
echo.
echo   [1] Build guest wasm components     [2] Start the server
echo   [3] Run the control panel GUI       [4] Import v1 database (WIPES)
echo   [5] Clear depot / reset database    [6] Dev reset + import
echo   [7] Build distributable (loose)     [8] Build the control panel
echo   [9] Build single-file SFX (aa-pos)  [10] Open the app in a browser
echo   [0] Exit
echo.
goto :eof
