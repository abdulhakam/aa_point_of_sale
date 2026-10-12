@echo off
rem Build the control panel. The SQLite driver (mattn/go-sqlite3) needs cgo, so a
rem C compiler is required; w64devkit is the working recipe on this machine.
rem Without CC+CGO_ENABLED the build still *compiles* but links go-sqlite3's
rem !cgo stub, and the Import tab fails at runtime. So fail loudly instead.
setlocal
rem cd to this script's directory: it is invoked both directly and via aa.bat, which has already
rem changed to the repo root, and `go build .` must run where go.mod lives.
cd /d "%~dp0"

set "W64=%USERPROFILE%\w64devkit\w64devkit\bin"
if "%CC%"=="" set "CC=%W64%\gcc.exe"
if not exist "%CC%" (
  echo [build] C compiler not found at "%CC%".
  echo [build] Install w64devkit to %%USERPROFILE%%\w64devkit, or set CC to your gcc.exe.
  echo [build] Refusing to build a stub-SQLite binary; the Import tab would fail at runtime.
  exit /b 1
)
set "PATH=%W64%;%PATH%"
set "CGO_ENABLED=1"
if "%GOPROXY%"=="" set "GOPROXY=https://goproxy.io,direct"
set "GOSUMDB=off"

echo [build] CGO_ENABLED=1 CC=%CC%
go mod tidy
if errorlevel 1 (
  echo [build] go mod tidy failed
  endlocal & exit /b 1
)
go build -ldflags="-H=windowsgui -s -w" -o controlpanel.exe .
if errorlevel 1 (
  echo [build] failed
  endlocal & exit /b 1
)
echo [build] wrote controlpanel.exe
endlocal & exit /b 0
