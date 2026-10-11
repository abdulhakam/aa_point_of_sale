@echo off
rem Build the go-gui control panel. Needs a C compiler for the SQLite driver
rem (CGO); w64devkit is the working recipe on this machine.
setlocal

set "W64=%USERPROFILE%\w64devkit\w64devkit\bin"
if "%CC%"=="" set "CC=%W64%\gcc.exe"
if not exist "%CC%" (
  echo [build] C compiler not found at "%CC%".
  echo [build] Install w64devkit (https://github.com/skeeto/w64devkit/releases)
  echo [build] to %%USERPROFILE%%\w64devkit, or set CC to your gcc.exe.
  exit /b 1
)
set "PATH=%W64%;%PATH%"
set "CGO_ENABLED=1"
if "%GOPROXY%"=="" set "GOPROXY=https://goproxy.io,direct"
set "GOSUMDB=off"

echo [build] CGO_ENABLED=1 CC=%CC%
go build -o controlpanel.exe .
if errorlevel 1 (
  echo [build] failed
  exit /b 1
)
echo [build] wrote controlpanel.exe
endlocal
