@echo off
echo Starting pocketbase server...
start "" .\pocketbase.exe serve

timeout /t 1 >nul

cd ../frontend

echo Starting npm server...
start "" npm run start

timeout /t 3 >nul

echo Opening browser...
start "" http://127.0.0.1:3000
