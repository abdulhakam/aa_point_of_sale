cd backend
xcopy "%~dp0backend\p_data" "%~dp0backend\pb_data\" /E /D
cd ../frontend && copy ".env.local.example" ".env.local" && npm install && npm run build
pause