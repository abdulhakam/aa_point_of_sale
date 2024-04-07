cd backend
xcopy "%~dp0backend\p_data" "%~dp0backend\pb_data\" /E /D
cd ../frontend && npm install && npm run build
pause