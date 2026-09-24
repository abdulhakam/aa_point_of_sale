@echo off
cd /d "%~dp0"

if not exist "node_modules" (
  echo Installing dependencies...
  call npm install --no-fund --no-audit || goto :fail
)

if not exist ".env" (
  echo Creating .env from .env.example ...
  copy /y ".env.example" ".env" >nul
  echo NOTE: edit .env and set SESSION_SECRET before real use.
)

echo Starting the TrailBase frontend on http://127.0.0.1:3100 ...
echo Make sure the TrailBase server is already running ^(trailbase\RUN.BAT^).
echo.
call npm start
goto :eof

:fail
echo.
echo Dependency installation failed.
exit /b 1
