@echo off
echo Starting pocketbase server...
cd backend
start "" .\pocketbase.exe serve

timeout /t 1 >nul

cd ../standalone

echo Starting npm server...
start "" node server.js

timeout /t 3 >nul

echo Opening browser...
start "" http://127.0.0.1:3000
