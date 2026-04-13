@echo off
cd ./frontend
echo pulling updated source code
git pull origin master


echo BUILDING
start "" npm run build