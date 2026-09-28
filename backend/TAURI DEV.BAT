@echo off
echo Starting pocketbase server...
start "" .\pocketbase.exe serve
echo Starting Application...

cd ../frontend

echo starting dev
npm run tauri dev
